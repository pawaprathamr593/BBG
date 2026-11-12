<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\MarketplaceInDto;
use App\Modules\Api\V1\Services\Interfaces\IMarketplaceServicesV1;
use App\Services\Interfaces\IMarketplaceServices;
use App\Utils\InDtoObjectFactory;

final readonly class MarketplaceServicesV1 implements IMarketplaceServicesV1
{
    public function __construct(private IMarketplaceServices $services) {}

    public function getMarketplace(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $marketplaceInDto = InDtoObjectFactory::create(MarketplaceInDto::class, $input);
            $resArr = $this->services->getMarketplace($marketplaceInDto->marketplaceParam);
        } catch (\Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Marketplace input mapping failed.';
        }
        return $resArr;
    }
}
