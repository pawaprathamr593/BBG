<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\CatalogueInDto;
use App\Modules\Api\V1\Services\Interfaces\ICatalogueServicesV1;
use App\Services\Interfaces\ICatalogueServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class CatalogueServicesV1 implements ICatalogueServicesV1
{
    public function __construct(private ICatalogueServices $services) {}

    public function getCatalogue(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $catalogueInDto = InDtoObjectFactory::create(CatalogueInDto::class, $input);
            $resArr = $this->services->getCatalogue($catalogueInDto->catalogueParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Catalogue input mapping failed.';
        }
        return $resArr;
    }

    public function manageCatalogue(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $catalogueInDto = InDtoObjectFactory::create(CatalogueInDto::class, $input);
            $resArr = $this->services->manageCatalogue($catalogueInDto->catalogueParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Catalogue input mapping failed.';
        }
        return $resArr;
    }
}
