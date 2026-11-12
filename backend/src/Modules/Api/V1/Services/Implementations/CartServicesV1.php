<?php
declare(strict_types=1);
namespace App\Modules\Api\V1\Services\Implementations;
use App\Modules\Api\V1\Dto\In\CartInDto;
use App\Modules\Api\V1\Services\Interfaces\ICartServicesV1;
use App\Services\Interfaces\ICartServices;
final readonly class CartServicesV1 implements ICartServicesV1 {
    public function __construct(private ICartServices $services) {}
    public function getCart(array $input): array { $dto = new CartInDto(); $dto->cartParam = is_array($input['cartParam'] ?? null) ? $input['cartParam'] : []; return $this->services->getCart($dto->cartParam); }
    public function manageCart(array $input): array { $dto = new CartInDto(); $dto->cartParam = is_array($input['cartParam'] ?? null) ? $input['cartParam'] : []; return $this->services->manageCart($dto->cartParam); }
}
