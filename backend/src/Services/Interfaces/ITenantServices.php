<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface ITenantServices
{
    public function getTenant(array $tenantParam): array;

    public function manageTenant(array $tenantParam): array;
}
