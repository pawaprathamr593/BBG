<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IProductReviewServicesV1
{
    public function getReviews(array $input): array;
    public function manageReviews(array $input): array;
}
