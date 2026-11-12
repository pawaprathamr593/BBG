<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IDashboardServices
{
    public function getDashboard(array $dashboardParam): array;
}
