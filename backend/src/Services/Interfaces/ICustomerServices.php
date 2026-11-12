<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface ICustomerServices
{
    public function getCustomer(array $customerParam): array;

    public function manageCustomer(array $customerParam): array;
}
