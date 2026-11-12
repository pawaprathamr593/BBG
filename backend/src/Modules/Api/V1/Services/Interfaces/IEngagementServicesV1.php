<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IEngagementServicesV1
{
    public function getEngagement(array $input): array;

    public function manageEngagement(array $input): array;
}
