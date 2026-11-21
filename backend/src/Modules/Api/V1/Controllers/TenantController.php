<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\TenantServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class TenantController
{
    public function actionGetTenant(
        ServerRequestInterface $request,
        TenantServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManageTenant(
        ServerRequestInterface $request,
        TenantServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        TenantServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $path = $request->getUri()->getPath();
        $action = match ($path) {
            '/api/v1/tenants/mine/list' => 'listMyTenants',
            '/api/v1/tenants/mine/detail' => 'getMyTenant',
            '/api/v1/tenants/members/list' => 'listTenantMembers',
            '/api/v1/tenants/members/owner-list' => 'listOwnedTenantMembers',
            '/api/v1/tenants/members/search' => 'searchEligibleTenantUsers',
            '/api/v1/tenants/members/add' => 'addExistingTenantMember',
            '/api/v1/tenants/members/remove' => 'removeTenantMember',
            '/api/v1/tenants/members/role' => 'changeTenantMemberRole',
            '/api/v1/tenants/invitations/create' => 'createTenantInvitation',
            '/api/v1/tenants/invitations/accept' => 'acceptTenantInvitation',
            default => '',
        };
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported tenant route.';
            return $this->respond($resArr, $responses, $streams);
        }

        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['tenantParam'] ?? null) ? $input['tenantParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;
        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['tenantParam'] = $param;

        try {
            $resArr = $manage ? $services->manageTenant($input) : $services->getTenant($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Tenant request failed unexpectedly.'], 'data' => []];
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
