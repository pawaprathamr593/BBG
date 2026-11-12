<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\SubscriptionServicesV1;
use App\Modules\Api\V1\Services\Interfaces\ISubscriptionServicesV1;
use App\Services\Implementations\SubscriptionServices;
use App\Services\Interfaces\ISubscriptionServices;

return [
    ISubscriptionServices::class => SubscriptionServices::class,
    ISubscriptionServicesV1::class => SubscriptionServicesV1::class,
];
