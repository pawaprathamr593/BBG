<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\ProductReviewServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class ProductReviewController
{
    public function actionGetReviews(
        ServerRequestInterface $request,
        ProductReviewServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, false);
    }

    public function actionManageReviews(
        ServerRequestInterface $request,
        ProductReviewServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->dispatch($request, $services, $responses, $streams, true);
    }

    private function dispatch(
        ServerRequestInterface $request,
        ProductReviewServicesV1 $services,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        bool $manage,
    ): ResponseInterface {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $getActions = [
            '/api/v1/marketplace/products/reviews/list' => 'listProductReviews',
            '/api/v1/marketplace/products/reviews/summary' => 'getProductRatingSummary',
        ];

        $manageActions = [
            '/api/v1/marketplace/products/reviews/create' => 'createProductReview',
            '/api/v1/marketplace/products/reviews/update' => 'updateProductReview',
            '/api/v1/marketplace/products/reviews/delete' => 'deleteProductReview',
            '/api/v1/marketplace/products/reviews/vote' => 'voteProductReviewHelpful',
            '/api/v1/marketplace/products/reviews/report' => 'reportProductReview',
            '/api/v1/marketplace/products/reviews/media/upload-url' => 'generateReviewMediaUploadUrl',
        ];

        $path = $request->getUri()->getPath();
        $action = $manage ? ($manageActions[$path] ?? '') : ($getActions[$path] ?? '');

        if ($action === '') {
            $resArr['msgArr'][] = 'Unsupported product review route.';
            return $this->respond($resArr, $responses, $streams);
        }

        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $param = is_array($input['productReviewParam'] ?? null) ? $input['productReviewParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];

        $authorization = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
        $data['action'] = $action;

        $param['actionType'] = $action;
        $param['actionData'] = $data;
        $input['productReviewParam'] = $param;

        try {
            $resArr = $manage ? $services->manageReviews($input) : $services->getReviews($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Product review request failed unexpectedly.'], 'data' => []];
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
