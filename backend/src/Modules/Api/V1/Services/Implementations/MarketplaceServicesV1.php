<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\MarketplaceInDto;
use App\Modules\Api\V1\Services\Interfaces\IMarketplaceServicesV1;
use App\Services\Interfaces\IMarketplaceServices;

final readonly class MarketplaceServicesV1 implements IMarketplaceServicesV1
{
    public function __construct(private IMarketplaceServices $services) {}

    public function getMarketplace(array $input): array
    {
        $dto = new MarketplaceInDto();
        $dto->marketplaceParam = is_array($input['marketplaceParam'] ?? null)
            ? $input['marketplaceParam']
            : [];
        return $this->services->getMarketplace($dto->marketplaceParam);
    }
}
