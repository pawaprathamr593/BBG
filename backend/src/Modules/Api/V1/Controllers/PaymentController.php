<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\PaymentServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class PaymentController
{
    public function actionGetPayment(
        ServerRequestInterface $request,
        PaymentServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $actions = [
            '/api/v1/payments/mine/list' => 'listMyPayments',
            '/api/v1/payments/mine/detail' => 'getMyPayment',
            '/api/v1/payments/tenant/list' => 'listTenantPayments',
            '/api/v1/payments/tenant/detail' => 'getTenantPayment',
        ];
        $action = $actions[$request->getUri()->getPath()] ?? '';
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported payment route.';
            return $this->respond($resArr, $responses, $streams);
        }
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['paymentParam'] ?? null) ? $input['paymentParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;
        $param['actionType'] = 'getPayment';
        $param['actionData'] = $data;
        $input['paymentParam'] = $param;
        try {
            $resArr = $services->getPayment($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Payment request failed unexpectedly.'], 'data' => []];
        }
        return $this->respond($resArr, $responses, $streams);
    }

    private function respond(array $resArr, ResponseFactoryInterface $responses, StreamFactoryInterface $streams): ResponseInterface
    {
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
