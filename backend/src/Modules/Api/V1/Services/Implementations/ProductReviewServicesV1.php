<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\ProductReviewInDto;
use App\Modules\Api\V1\Services\Interfaces\IProductReviewServicesV1;
use App\Services\Interfaces\IProductReviewServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class ProductReviewServicesV1 implements IProductReviewServicesV1
{
    public function __construct(private IProductReviewServices $services) {}

    public function getReviews(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $dto = InDtoObjectFactory::create(ProductReviewInDto::class, $input);
            $resArr = $this->services->getReviews($dto->productReviewParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Product review input mapping failed.';
        }
        return $resArr;
    }

    public function manageReviews(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $dto = InDtoObjectFactory::create(ProductReviewInDto::class, $input);
            $resArr = $this->services->manageReviews($dto->productReviewParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Product review input mapping failed.';
        }
        return $resArr;
    }
}
