<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface ICustomerServicesV1
{
    public function getCustomer(array $input): array;

    public function manageCustomer(array $input): array;
}
