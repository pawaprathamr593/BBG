<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\TenantInDto;
use App\Modules\Api\V1\Services\Interfaces\ITenantServicesV1;
use App\Services\Interfaces\ITenantServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class TenantServicesV1 implements ITenantServicesV1
{
    public function __construct(private ITenantServices $services) {}

    public function getTenant(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $tenantInDto = InDtoObjectFactory::create(TenantInDto::class, $input);
            $resArr = $this->services->getTenant($tenantInDto->tenantParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Tenant input mapping failed.';
        }
        return $resArr;
    }

    public function manageTenant(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $tenantInDto = InDtoObjectFactory::create(TenantInDto::class, $input);
            $resArr = $this->services->manageTenant($tenantInDto->tenantParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Tenant input mapping failed.';
        }
        return $resArr;
    }
}
