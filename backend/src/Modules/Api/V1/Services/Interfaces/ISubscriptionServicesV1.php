<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface ISubscriptionServicesV1
{
    public function getSubscription(array $input): array;

    public function manageSubscription(array $input): array;
}
