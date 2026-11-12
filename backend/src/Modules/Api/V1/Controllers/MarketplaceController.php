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
    public function actionListBusinesses(
        ServerRequestInterface $request,
        MarketplaceServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->run($request, $services, $responses, $streams, 'listBusinesses');
    }

    public function actionGetBusiness(
        ServerRequestInterface $request,
        MarketplaceServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->run($request, $services, $responses, $streams, 'getBusiness');
    }

    public function actionListProducts(
        ServerRequestInterface $request,
        MarketplaceServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->run($request, $services, $responses, $streams, 'listProducts');
    }

    public function actionGetProduct(
        ServerRequestInterface $request,
        MarketplaceServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->run($request, $services, $responses, $streams, 'getProduct');
    }

    private function run(
        ServerRequestInterface $request,
        MarketplaceServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        string $action,
    ): ResponseInterface {
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['marketplaceParam'] ?? null) ? $input['marketplaceParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $data['action'] = $action;
        $param['actionType'] = 'getMarketplace';
        $param['actionData'] = $data;
        $input['marketplaceParam'] = $param;

        try {
            $result = $services->getMarketplace($input);
        } catch (Throwable) {
            $result = ['status' => 'EXCEPTION', 'msgArr' => ['Marketplace request failed unexpectedly.'], 'data' => []];
        }

        $state = $result['status'] ?? 'EXCEPTION';
        $http = $state === 'SUCCESS' ? 200 : ($state === 'FAILED' ? 400 : 500);
        try {
            $json = json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        } catch (Throwable) {
            $http = 500;
            $json = '{"status":"EXCEPTION","msgArr":["Unable to serialize API response."],"data":[]}';
        }

        return $responses->createResponse($http)
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withBody($streams->createStream($json));
    }
}
