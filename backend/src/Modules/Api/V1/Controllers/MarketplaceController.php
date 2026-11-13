<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\MarketplaceServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class MarketplaceController
{
    public function actionGetMarketplace(
        ServerRequestInterface $request,
        MarketplaceServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $path = $request->getUri()->getPath();
        $action = match ($path) {
            '/api/v1/marketplace/businesses/list' => 'listBusinesses',
            '/api/v1/marketplace/businesses/popular' => 'listPopularBusinesses',
            '/api/v1/marketplace/businesses/recent' => 'listRecentBusinesses',
            '/api/v1/marketplace/products/recent' => 'listRecentProducts',
            '/api/v1/marketplace/businesses/detail' => 'getBusiness',
            '/api/v1/marketplace/products/list' => 'listProducts',
            '/api/v1/marketplace/products/categories' => 'listPublicProductCategories',
            '/api/v1/marketplace/products/detail' => 'getProduct',
            '/api/v1/marketplace/categories/list' => 'listPublicCategories',
            '/api/v1/marketplace/promotions/list' => 'listPublicPromotions',
            '/api/v1/marketplace/promotions/detail' => 'getPublicPromotion',
            '/api/v1/marketplace/home' => 'getHomeSummary',
            default => '',
        };

        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported marketplace route.';
            return $this->respond($resArr, $responses, $streams);
        }

        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['marketplaceParam'] ?? null) ? $input['marketplaceParam'] : [];
        $actionData = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $actionData['action'] = $action;
        $param['actionType'] = $action;
        $param['actionData'] = $actionData;
        $input['marketplaceParam'] = $param;

        try {
            $resArr = $services->getMarketplace($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Marketplace request failed unexpectedly.'], 'data' => []];
        }
        return $this->respond($resArr, $responses, $streams);
    }

    private function respond(
        array $resArr,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        $status = $resArr['status'] ?? 'EXCEPTION';
        $httpStatus = match ($status) {
            'SUCCESS' => 200,
            'FAILED' => 400,
            default => 500,
        };
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
