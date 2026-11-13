<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\EnquiryServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class EnquiryController
{
    public function actionGetEnquiry(
        ServerRequestInterface $request,
        EnquiryServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManageEnquiry(
        ServerRequestInterface $request,
        EnquiryServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        EnquiryServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $getActions = [
            '/api/v1/enquiries/mine/list' => 'listMyEnquiries',
            '/api/v1/enquiries/mine/detail' => 'getMyEnquiry',
            '/api/v1/enquiries/tenant/list' => 'listTenantEnquiries',
            '/api/v1/enquiries/tenant/detail' => 'getTenantEnquiry',
        ];
        $manageActions = [
            '/api/v1/enquiries/create' => 'createCustomerEnquiry',
            '/api/v1/enquiries/tenant/respond' => 'respondToEnquiry',
            '/api/v1/enquiries/tenant/close' => 'closeEnquiry',
        ];
        $path = $request->getUri()->getPath();
        $action = $manage ? ($manageActions[$path] ?? '') : ($getActions[$path] ?? '');
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported enquiry route.';
            return $this->respond($resArr, $responses, $streams);
        }

        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['enquiryParam'] ?? null) ? $input['enquiryParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;
        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['enquiryParam'] = $param;

        try {
            $resArr = $manage ? $services->manageEnquiry($input) : $services->getEnquiry($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Enquiry request failed unexpectedly.'], 'data' => []];
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
