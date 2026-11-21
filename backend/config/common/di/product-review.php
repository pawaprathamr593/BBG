<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\ProductReviewServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IProductReviewServicesV1;
use App\Services\Implementations\ProductReviewServices;
use App\Services\Interfaces\IProductReviewServices;

return [
    IProductReviewServices::class => ProductReviewServices::class,
    IProductReviewServicesV1::class => ProductReviewServicesV1::class,
];
