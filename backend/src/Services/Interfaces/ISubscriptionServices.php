<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface ISubscriptionServices
{
    public function getSubscription(array $subscriptionParam): array;

    public function manageSubscription(array $subscriptionParam): array;
}
