<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\PromotionServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class PromotionController
{
    public function actionGetPromotion(
        ServerRequestInterface $request,
        PromotionServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManagePromotion(
        ServerRequestInterface $request,
        PromotionServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        PromotionServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $getActions = [
            '/api/v1/promotions/mine/list' => 'listMyPromotions',
            '/api/v1/promotions/mine/detail' => 'getMyPromotion',
            '/api/v1/promotions/engagement' => 'getPromotionEngagement',
        ];
        $manageActions = [
            '/api/v1/promotions/create' => 'createPromotion',
            '/api/v1/promotions/update' => 'updatePromotion',
            '/api/v1/promotions/delete' => 'deletePromotion',
            '/api/v1/promotions/publish' => 'publishPromotion',
            '/api/v1/promotions/unpublish' => 'unpublishPromotion',
        ];
        $path = $request->getUri()->getPath();
        $action = $manage ? ($manageActions[$path] ?? '') : ($getActions[$path] ?? '');
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported promotion route.';
            return $this->respond($resArr, $responses, $streams);
        }
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['promotionParam'] ?? null) ? $input['promotionParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;
        $param['actionType'] = $manage ? 'managePromotion' : 'getPromotion';
        $param['actionData'] = $data;
        $input['promotionParam'] = $param;
        try {
            $resArr = $manage ? $services->managePromotion($input) : $services->getPromotion($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Promotion request failed unexpectedly.'], 'data' => []];
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
