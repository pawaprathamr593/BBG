<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IMarketplaceServices
{
    public function getMarketplace(array $param): array;
}
