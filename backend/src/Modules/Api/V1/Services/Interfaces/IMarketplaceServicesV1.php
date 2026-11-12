<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IMarketplaceServicesV1
{
    public function getMarketplace(array $input): array;
}
