<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\EngagementServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IEngagementServicesV1;
use App\Services\Implementations\EngagementServices;
use App\Services\Interfaces\IEngagementServices;

return [
    IEngagementServices::class => EngagementServices::class,
    IEngagementServicesV1::class => EngagementServicesV1::class,
];
