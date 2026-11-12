<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IBusinessServices
{
    public function getBusiness(array $businessParam): array;

    public function manageBusiness(array $businessParam): array;
}
