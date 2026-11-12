<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface ICatalogueServicesV1
{
    public function getCatalogue(array $input): array;

    public function manageCatalogue(array $input): array;
}
