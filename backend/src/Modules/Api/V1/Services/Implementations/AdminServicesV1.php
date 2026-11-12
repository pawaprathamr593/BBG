<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\AdminInDto;
use App\Modules\Api\V1\Services\Interfaces\IAdminServicesV1;
use App\Services\Interfaces\IAdminServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class AdminServicesV1 implements IAdminServicesV1
{
    public function __construct(private IAdminServices $services) {}

    public function getAdmin(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $adminInDto = InDtoObjectFactory::create(AdminInDto::class, $input);
            $resArr = $this->services->getAdmin($adminInDto->adminParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Admin input mapping failed.';
        }
        return $resArr;
    }

    public function manageAdmin(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $adminInDto = InDtoObjectFactory::create(AdminInDto::class, $input);
            $resArr = $this->services->manageAdmin($adminInDto->adminParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Admin input mapping failed.';
        }
        return $resArr;
    }
}
