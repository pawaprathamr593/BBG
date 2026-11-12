<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\PaymentServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IPaymentServicesV1;
use App\Services\Implementations\PaymentServices;
use App\Services\Interfaces\IPaymentServices;

return [
    IPaymentServices::class => PaymentServices::class,
    IPaymentServicesV1::class => PaymentServicesV1::class,
];
