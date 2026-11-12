<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\CartInDto;
use App\Modules\Api\V1\Services\Interfaces\ICartServicesV1;
use App\Services\Interfaces\ICartServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class CartServicesV1 implements ICartServicesV1
{
    public function __construct(private ICartServices $services) {}

    public function getCart(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $cartInDto = InDtoObjectFactory::create(CartInDto::class, $input);
            $resArr = $this->services->getCart($cartInDto->cartParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Cart input mapping failed.';
        }
        return $resArr;
    }

    public function manageCart(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $cartInDto = InDtoObjectFactory::create(CartInDto::class, $input);
            $resArr = $this->services->manageCart($cartInDto->cartParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Cart input mapping failed.';
        }
        return $resArr;
    }
}
