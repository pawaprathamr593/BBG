<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\CatalogueServicesV1;
use App\Modules\Api\V1\Services\Interfaces\ICatalogueServicesV1;
use App\Services\Implementations\CatalogueServices;
use App\Services\Interfaces\ICatalogueServices;

return [
    ICatalogueServices::class => CatalogueServices::class,
    ICatalogueServicesV1::class => CatalogueServicesV1::class,
];
