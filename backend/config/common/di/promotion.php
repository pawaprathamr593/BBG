<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\PromotionServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IPromotionServicesV1;
use App\Services\Implementations\PromotionServices;
use App\Services\Interfaces\IPromotionServices;

return [
    IPromotionServices::class => PromotionServices::class,
    IPromotionServicesV1::class => PromotionServicesV1::class,
];
