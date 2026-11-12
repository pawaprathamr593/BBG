<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface ITenantServicesV1
{
    public function getTenant(array $input): array;

    public function manageTenant(array $input): array;
}
