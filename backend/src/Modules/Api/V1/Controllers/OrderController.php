<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\OrderServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class OrderController
{
    public function actionGetOrders(
        ServerRequestInterface $request,
        OrderServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $routeActions = [
            '/api/v1/orders/list' => 'listMyOrders',
            '/api/v1/orders/detail' => 'getMyOrder',
            '/api/v1/orders/tenant/list' => 'listTenantOrders',
            '/api/v1/orders/tenant/detail' => 'getTenantOrder',
        ];
        $action = $routeActions[$request->getUri()->getPath()] ?? '';
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported order read route.';
            return $this->respond($resArr, $responses, $streams);
        }
        $input = $this->requestInput($request, $action);
        try {
            $resArr = $services->getOrders($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Order retrieval failed unexpectedly.'], 'data' => []];
        }
        return $this->respond($resArr, $responses, $streams);
    }

    public function actionManageOrders(
        ServerRequestInterface $request,
        OrderServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $path = $request->getUri()->getPath();
        $routeActions = [
            '/api/v1/orders/tenant/confirm' => ['action' => 'changeTenantOrderStatus', 'new_status' => 'CONFIRMED'],
            '/api/v1/orders/tenant/cancel' => ['action' => 'changeTenantOrderStatus', 'new_status' => 'CANCELLED'],
            '/api/v1/orders/tenant/status' => ['action' => 'changeTenantOrderStatus', 'new_status' => null],
        ];
        if (!array_key_exists($path, $routeActions)) {
            $resArr['msgArr'][] = 'Unsupported order management route.';
            return $this->respond($resArr, $responses, $streams);
        }
        $routeAction = $routeActions[$path];
        $input = $this->requestInput($request, $routeAction['action']);
        $param = $input['orderParam'];
        if ($routeAction['new_status'] !== null) {
            $param['actionData']['new_status'] = $routeAction['new_status'];
        }
        $input['orderParam'] = $param;
        try {
            $resArr = $services->manageOrders($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Order management failed unexpectedly.'], 'data' => []];
        }
        return $this->respond($resArr, $responses, $streams);
    }

    private function requestInput(ServerRequestInterface $request, string $action): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['orderParam'] ?? null) ? $input['orderParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ')
            ? trim(substr($authorization, 7))
            : '';
        $data['action'] = $action;
        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['orderParam'] = $param;
        return $input;
    }

    private function respond(
        array $resArr,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        $status = $resArr['status'] ?? 'EXCEPTION';
        $httpStatus = $status === 'SUCCESS' ? 200 : ($status === 'FAILED' ? 400 : 500);
        try {
            $json = json_encode($resArr, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        } catch (Throwable) {
            $httpStatus = 500;
            $json = '{"status":"EXCEPTION","msgArr":["Unable to serialize API response."],"data":[]}';
        }
        return $responses->createResponse($httpStatus)
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withBody($streams->createStream($json));
    }
}
