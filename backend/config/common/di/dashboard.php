<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\DashboardServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IDashboardServicesV1;
use App\Services\Implementations\DashboardServices;
use App\Services\Interfaces\IDashboardServices;

return [
    IDashboardServices::class => DashboardServices::class,
    IDashboardServicesV1::class => DashboardServicesV1::class,
];
