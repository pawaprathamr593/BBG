<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IProductReviewServices
{
    public function getReviews(array $productReviewParam): array;
    public function manageReviews(array $productReviewParam): array;
}
