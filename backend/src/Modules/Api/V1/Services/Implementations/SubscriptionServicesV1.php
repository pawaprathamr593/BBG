<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\SubscriptionInDto;
use App\Modules\Api\V1\Services\Interfaces\ISubscriptionServicesV1;
use App\Services\Interfaces\ISubscriptionServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class SubscriptionServicesV1 implements ISubscriptionServicesV1
{
    public function __construct(private ISubscriptionServices $services) {}

    public function getSubscription(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $subscriptionInDto = InDtoObjectFactory::create(SubscriptionInDto::class, $input);
            $resArr = $this->services->getSubscription($subscriptionInDto->subscriptionParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Subscription input mapping failed.';
        }
        return $resArr;
    }

    public function manageSubscription(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $subscriptionInDto = InDtoObjectFactory::create(SubscriptionInDto::class, $input);
            $resArr = $this->services->manageSubscription($subscriptionInDto->subscriptionParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Subscription input mapping failed.';
        }
        return $resArr;
    }
}
