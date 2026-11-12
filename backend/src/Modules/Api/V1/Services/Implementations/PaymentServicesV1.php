<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\PaymentInDto;
use App\Modules\Api\V1\Services\Interfaces\IPaymentServicesV1;
use App\Services\Interfaces\IPaymentServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class PaymentServicesV1 implements IPaymentServicesV1
{
    public function __construct(private IPaymentServices $services) {}

    public function getPayment(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $paymentInDto = InDtoObjectFactory::create(PaymentInDto::class, $input);
            $resArr = $this->services->getPayment($paymentInDto->paymentParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Payment input mapping failed.';
        }
        return $resArr;
    }
}
