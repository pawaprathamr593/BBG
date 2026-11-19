<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\SubscriptionServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class SubscriptionController
{
    public function actionGetSubscription(
        ServerRequestInterface $request,
        SubscriptionServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManageSubscription(
        ServerRequestInterface $request,
        SubscriptionServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        SubscriptionServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $getActions = [
            '/api/v1/subscriptions/plans/list' => 'listActivePlans',
            '/api/v1/subscriptions/application/current' => 'getApplicationSubscription',
            '/api/v1/subscriptions/application/list' => 'listApplicationSubscriptions',
            '/api/v1/subscriptions/mine/list' => 'listMySubscriptions',
            '/api/v1/subscriptions/mine/detail' => 'getMySubscription',
        ];
        $manageActions = [
            '/api/v1/subscriptions/request' => 'requestSubscription',
            '/api/v1/subscriptions/application/request' => 'requestApplicationSubscription',
            '/api/v1/subscriptions/application/upgrade/request' => 'requestApplicationSubscriptionUpgrade',
            '/api/v1/subscriptions/application/renewal/request' => 'requestApplicationSubscriptionRenewal',
            '/api/v1/subscriptions/application/proofs/upload-url' => 'generateApplicationProofUploadUrl',
            '/api/v1/subscriptions/application/proofs/submit' => 'submitApplicationSubscriptionProof',
            '/api/v1/subscriptions/renewal/request' => 'requestSubscriptionRenewal',
            '/api/v1/subscriptions/proofs/upload-url' => 'generateSubscriptionProofUploadUrl',
            '/api/v1/subscriptions/proofs/submit' => 'submitSubscriptionProof',
        ];
        $path = $request->getUri()->getPath();
        $action = $manage ? ($manageActions[$path] ?? '') : ($getActions[$path] ?? '');
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported subscription route.';
            return $this->respond($resArr, $responses, $streams);
        }
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['subscriptionParam'] ?? null) ? $input['subscriptionParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;
        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['subscriptionParam'] = $param;
        try {
            $resArr = $manage ? $services->manageSubscription($input) : $services->getSubscription($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Subscription request failed unexpectedly.'], 'data' => []];
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
