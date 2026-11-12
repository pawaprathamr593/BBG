<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\MarketplaceServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IMarketplaceServicesV1;
use App\Services\Implementations\MarketplaceServices;
use App\Services\Interfaces\IMarketplaceServices;

return [
    IMarketplaceServices::class => MarketplaceServices::class,
    IMarketplaceServicesV1::class => MarketplaceServicesV1::class,
];
