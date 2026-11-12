<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IDashboardServicesV1
{
    public function getDashboard(array $input): array;
}
