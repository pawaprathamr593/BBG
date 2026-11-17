<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\CustomerServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class CustomerController
{
    public function actionGetCustomer(
        ServerRequestInterface $request,
        CustomerServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManageCustomer(
        ServerRequestInterface $request,
        CustomerServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        CustomerServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $getActions = [
            '/api/v1/customers/profile' => 'getMyCustomerProfile',
            '/api/v1/customers/addresses/list' => 'listMyAddresses',\n            '/api/v1/customers/tenant/list' => 'listTenantCustomers',
        ];
        $manageActions = [
            '/api/v1/customers/addresses/create' => 'createMyAddress',
            '/api/v1/customers/addresses/update' => 'updateMyAddress',
            '/api/v1/customers/addresses/delete' => 'deleteMyAddress',
            '/api/v1/customers/addresses/default' => 'setDefaultAddress',
        ];
        $path = $request->getUri()->getPath();
        $action = $manage ? ($manageActions[$path] ?? '') : ($getActions[$path] ?? '');
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported customer route.';
            return $this->respond($resArr, $responses, $streams);
        }

        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['customerParam'] ?? null) ? $input['customerParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;
        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['customerParam'] = $param;

        try {
            $resArr = $manage ? $services->manageCustomer($input) : $services->getCustomer($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Customer request failed unexpectedly.'], 'data' => []];
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
