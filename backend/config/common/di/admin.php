<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\AdminServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IAdminServicesV1;
use App\Services\Implementations\AdminServices;
use App\Services\Interfaces\IAdminServices;

return [
    IAdminServices::class => AdminServices::class,
    IAdminServicesV1::class => AdminServicesV1::class,
];
