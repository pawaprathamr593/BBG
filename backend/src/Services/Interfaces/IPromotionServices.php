<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IPromotionServices
{
    public function getPromotion(array $promotionParam): array;

    public function managePromotion(array $promotionParam): array;
}
