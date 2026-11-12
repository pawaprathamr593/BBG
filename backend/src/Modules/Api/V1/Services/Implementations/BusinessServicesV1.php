<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\BusinessInDto;
use App\Modules\Api\V1\Services\Interfaces\IBusinessServicesV1;
use App\Services\Interfaces\IBusinessServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class BusinessServicesV1 implements IBusinessServicesV1
{
    public function __construct(private IBusinessServices $services) {}

    public function getBusiness(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $businessInDto = InDtoObjectFactory::create(BusinessInDto::class, $input);
            $resArr = $this->services->getBusiness($businessInDto->businessParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Business input mapping failed.';
        }
        return $resArr;
    }

    public function manageBusiness(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $businessInDto = InDtoObjectFactory::create(BusinessInDto::class, $input);
            $resArr = $this->services->manageBusiness($businessInDto->businessParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Business input mapping failed.';
        }
        return $resArr;
    }
}
