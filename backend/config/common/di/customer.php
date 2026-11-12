<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\CustomerServicesV1;
use App\Modules\Api\V1\Services\Interfaces\ICustomerServicesV1;
use App\Services\Implementations\CustomerServices;
use App\Services\Interfaces\ICustomerServices;

return [
    ICustomerServices::class => CustomerServices::class,
    ICustomerServicesV1::class => CustomerServicesV1::class,
];
