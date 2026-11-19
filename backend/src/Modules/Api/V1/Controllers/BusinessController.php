<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\BusinessServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class BusinessController
{
    public function actionGetBusiness(
        ServerRequestInterface $request,
        BusinessServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManageBusiness(
        ServerRequestInterface $request,
        BusinessServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        BusinessServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $path = $request->getUri()->getPath();
        $getActions = [
            '/api/v1/business/application/get' => 'getMyBusinessApplication',
            '/api/v1/business/application/list' => 'listMyBusinessApplications',
            '/api/v1/business/profile/get' => 'getMyBusinessProfile',
            '/api/v1/business/verification/get' => 'getBusinessVerification',
            '/api/v1/business/storefront/get' => 'getMyStorefront',
        ];
        $manageActions = [
            '/api/v1/business/application/submit' => 'submitBusinessApplication',
            '/api/v1/business/application/draft/save' => 'saveBusinessApplicationDraft',
            '/api/v1/business/application/update' => 'updateBusinessApplication',
            '/api/v1/business/application/resubmit' => 'resubmitBusinessApplication',
            '/api/v1/business/profile/update' => 'updateMyBusinessProfile',
            '/api/v1/business/storefront/update' => 'updateMyStorefront',
            '/api/v1/business/storefront/publish' => 'publishMyStorefront',
            '/api/v1/business/storefront/unpublish' => 'unpublishMyStorefront',
        ];
        $action = $manage ? ($manageActions[$path] ?? '') : ($getActions[$path] ?? '');
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported business route.';
            return $this->respond($resArr, $responses, $streams);
        }

        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['businessParam'] ?? null) ? $input['businessParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;
        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['businessParam'] = $param;

        try {
            $resArr = $manage ? $services->manageBusiness($input) : $services->getBusiness($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Business request failed unexpectedly.'], 'data' => []];
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
