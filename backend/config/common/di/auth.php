<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\AuthServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IAuthServicesV1;
use App\Services\Implementations\AuthServices;
use App\Services\Interfaces\IAuthServices;

return [
    IAuthServices::class => AuthServices::class,
    IAuthServicesV1::class => AuthServicesV1::class,
];
