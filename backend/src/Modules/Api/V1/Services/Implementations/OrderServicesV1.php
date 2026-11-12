<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\OrderInDto;
use App\Modules\Api\V1\Services\Interfaces\IOrderServicesV1;
use App\Services\Interfaces\IOrderServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class OrderServicesV1 implements IOrderServicesV1
{
    public function __construct(private IOrderServices $services) {}

    public function getOrders(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $orderInDto = InDtoObjectFactory::create(OrderInDto::class, $input);
            $resArr = $this->services->getOrders($orderInDto->orderParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Order input mapping failed.';
        }
        return $resArr;
    }

    public function manageOrders(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $orderInDto = InDtoObjectFactory::create(OrderInDto::class, $input);
            $resArr = $this->services->manageOrders($orderInDto->orderParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Order input mapping failed.';
        }
        return $resArr;
    }
}
