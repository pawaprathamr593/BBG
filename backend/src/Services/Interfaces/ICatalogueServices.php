<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface ICatalogueServices
{
    public function getCatalogue(array $catalogueParam): array;

    public function manageCatalogue(array $catalogueParam): array;
}
