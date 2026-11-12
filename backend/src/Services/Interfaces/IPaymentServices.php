<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IPaymentServices
{
    public function getPayment(array $paymentParam): array;
}
