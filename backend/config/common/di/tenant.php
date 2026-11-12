<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\TenantServicesV1;
use App\Modules\Api\V1\Services\Interfaces\ITenantServicesV1;
use App\Services\Implementations\TenantServices;
use App\Services\Interfaces\ITenantServices;

return [
    ITenantServices::class => TenantServices::class,
    ITenantServicesV1::class => TenantServicesV1::class,
];
