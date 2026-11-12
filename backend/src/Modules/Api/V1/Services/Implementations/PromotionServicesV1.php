<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\PromotionInDto;
use App\Modules\Api\V1\Services\Interfaces\IPromotionServicesV1;
use App\Services\Interfaces\IPromotionServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class PromotionServicesV1 implements IPromotionServicesV1
{
    public function __construct(private IPromotionServices $services) {}

    public function getPromotion(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $promotionInDto = InDtoObjectFactory::create(PromotionInDto::class, $input);
            $resArr = $this->services->getPromotion($promotionInDto->promotionParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Promotion input mapping failed.';
        }
        return $resArr;
    }

    public function managePromotion(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $promotionInDto = InDtoObjectFactory::create(PromotionInDto::class, $input);
            $resArr = $this->services->managePromotion($promotionInDto->promotionParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Promotion input mapping failed.';
        }
        return $resArr;
    }
}
