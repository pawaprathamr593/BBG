<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IPromotionServicesV1
{
    public function getPromotion(array $input): array;

    public function managePromotion(array $input): array;
}
