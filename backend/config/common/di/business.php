<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\BusinessServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IBusinessServicesV1;
use App\Services\Implementations\BusinessServices;
use App\Services\Interfaces\IBusinessServices;

return [
    IBusinessServices::class => BusinessServices::class,
    IBusinessServicesV1::class => BusinessServicesV1::class,
];
