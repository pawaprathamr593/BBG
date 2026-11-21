<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\AdminServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class AdminController
{
    public function actionGetAdmin(
        ServerRequestInterface $request,
        AdminServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManageAdmin(
        ServerRequestInterface $request,
        AdminServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        AdminServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $getActions = [
            '/api/v1/admin/users/list' => 'listPlatformUsers',
            '/api/v1/admin/users/detail' => 'getPlatformUser',
            '/api/v1/admin/businesses/pending/list' => 'listPendingBusinesses',
            '/api/v1/admin/businesses/detail' => 'getBusinessForReview',
            '/api/v1/admin/subscriptions/pending/list' => 'listPendingSubscriptions',
            '/api/v1/admin/subscriptions/payment-qr/current' => 'getCurrentPaymentQrConfig',
            '/api/v1/admin/subscriptions/detail' => 'getSubscriptionForReview',
            '/api/v1/admin/subscriptions/active/list' => 'listActiveSubscriptions',
            '/api/v1/admin/categories/list' => 'listAdminCategories',
            '/api/v1/admin/categories/stats' => 'getCategoryStatistics',
            '/api/v1/admin/analytics/summary' => 'getAdminAnalyticsSummary',
            '/api/v1/admin/analytics/trends' => 'getAdminAnalyticsTrends',
            '/api/v1/admin/moderation/queue' => 'listModerationQueue',
            '/api/v1/admin/moderation/history' => 'listModerationHistory',
            '/api/v1/admin/health/summary' => 'getSafeSystemHealth',
            '/api/v1/admin/plans/list' => 'listAdminPlans',
        ];
        $manageActions = [
            '/api/v1/admin/users/suspend' => 'suspendPlatformUser',
            '/api/v1/admin/users/restore' => 'restorePlatformUser',
            '/api/v1/admin/businesses/approve' => 'approveBusiness',
            '/api/v1/admin/businesses/reject' => 'rejectBusiness',
            '/api/v1/admin/businesses/reopen' => 'reopenBusinessReview',
            '/api/v1/admin/subscriptions/approve' => 'approveSubscription',
            '/api/v1/admin/subscriptions/reject' => 'rejectSubscription',
            '/api/v1/admin/subscriptions/payment-qr/upload-url' => 'generatePaymentQrUploadUrl',
            '/api/v1/admin/subscriptions/payment-qr/save' => 'savePaymentQrConfig',
            '/api/v1/admin/categories/create' => 'createCategory',
            '/api/v1/admin/categories/update' => 'updateCategory',
            '/api/v1/admin/categories/delete' => 'deleteCategory',
            '/api/v1/admin/moderation/action' => 'applyModerationAction',
            '/api/v1/admin/plans/create' => 'createAdminPlan',
            '/api/v1/admin/plans/update' => 'updateAdminPlan',
        ];
        $path = $request->getUri()->getPath();
        $action = $manage ? ($manageActions[$path] ?? '') : ($getActions[$path] ?? '');
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported administration route.';
            return $this->respond($resArr, $responses, $streams);
        }
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['adminParam'] ?? null) ? $input['adminParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;
        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['adminParam'] = $param;
        try {
            $resArr = $manage ? $services->manageAdmin($input) : $services->getAdmin($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Administration request failed unexpectedly.'], 'data' => []];
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
