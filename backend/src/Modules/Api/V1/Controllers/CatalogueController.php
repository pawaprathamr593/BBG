<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\CatalogueServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class CatalogueController
{
    public function actionGetCatalogue(
        ServerRequestInterface $request,
        CatalogueServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManageCatalogue(
        ServerRequestInterface $request,
        CatalogueServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        CatalogueServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $getActions = [
            '/api/v1/catalogue/units/list' => 'listUnitsOfMeasure',
            '/api/v1/catalogue/categories/list' => 'listTenantProductCategories',
            '/api/v1/catalogue/products/list' => 'listTenantProducts',
            '/api/v1/catalogue/products/detail' => 'getTenantProduct',
            '/api/v1/catalogue/products/media/list' => 'listProductMedia',
        ];
        $manageActions = [
            '/api/v1/catalogue/categories/create' => 'createTenantProductCategory',
            '/api/v1/catalogue/categories/update' => 'updateTenantProductCategory',
            '/api/v1/catalogue/categories/delete' => 'deleteTenantProductCategory',
            '/api/v1/catalogue/products/create' => 'createTenantProduct',
            '/api/v1/catalogue/products/update' => 'updateTenantProduct',
            '/api/v1/catalogue/products/delete' => 'deleteTenantProduct',
            '/api/v1/catalogue/products/media/upload-url' => 'generateProductMediaUploadUrl',
            '/api/v1/catalogue/products/media/link' => 'linkProductMedia',
            '/api/v1/catalogue/products/media/delete' => 'deleteProductMedia',
        ];
        $path = $request->getUri()->getPath();
        $action = $manage ? ($manageActions[$path] ?? '') : ($getActions[$path] ?? '');
        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported catalogue route.';
            return $this->respond($resArr, $responses, $streams);
        }

        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['catalogueParam'] ?? null) ? $input['catalogueParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        unset($data['action']);
        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['catalogueParam'] = $param;

        try {
            $resArr = $manage ? $services->manageCatalogue($input) : $services->getCatalogue($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Catalogue request failed unexpectedly.'], 'data' => []];
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
