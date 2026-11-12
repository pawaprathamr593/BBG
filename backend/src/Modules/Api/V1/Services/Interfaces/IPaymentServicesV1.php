<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IPaymentServicesV1
{
    public function getPayment(array $input): array;
}
