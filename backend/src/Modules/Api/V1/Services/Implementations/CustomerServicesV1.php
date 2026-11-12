<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\CustomerInDto;
use App\Modules\Api\V1\Services\Interfaces\ICustomerServicesV1;
use App\Services\Interfaces\ICustomerServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class CustomerServicesV1 implements ICustomerServicesV1
{
    public function __construct(private ICustomerServices $services) {}

    public function getCustomer(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $customerInDto = InDtoObjectFactory::create(CustomerInDto::class, $input);
            $resArr = $this->services->getCustomer($customerInDto->customerParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Customer input mapping failed.';
        }
        return $resArr;
    }

    public function manageCustomer(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $customerInDto = InDtoObjectFactory::create(CustomerInDto::class, $input);
            $resArr = $this->services->manageCustomer($customerInDto->customerParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Customer input mapping failed.';
        }
        return $resArr;
    }
}
