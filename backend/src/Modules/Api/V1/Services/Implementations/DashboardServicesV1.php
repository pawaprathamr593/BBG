<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\DashboardInDto;
use App\Modules\Api\V1\Services\Interfaces\IDashboardServicesV1;
use App\Services\Interfaces\IDashboardServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class DashboardServicesV1 implements IDashboardServicesV1
{
    public function __construct(private IDashboardServices $services) {}

    public function getDashboard(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $dashboardInDto = InDtoObjectFactory::create(DashboardInDto::class, $input);
            $resArr = $this->services->getDashboard($dashboardInDto->dashboardParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Dashboard input mapping failed.';
        }
        return $resArr;
    }
}
