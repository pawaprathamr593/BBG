<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IEngagementServices
{
    public function getEngagement(array $engagementParam): array;

    public function manageEngagement(array $engagementParam): array;
}
