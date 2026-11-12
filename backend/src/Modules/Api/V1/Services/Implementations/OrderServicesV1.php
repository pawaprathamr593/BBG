<?php
declare(strict_types=1);
namespace App\Modules\Api\V1\Services\Implementations;
use App\Modules\Api\V1\Dto\In\OrderInDto;
use App\Modules\Api\V1\Services\Interfaces\IOrderServicesV1;
use App\Services\Interfaces\IOrderServices;
final readonly class OrderServicesV1 implements IOrderServicesV1 {
    public function __construct(private IOrderServices $services) {}
    public function getOrders(array $input): array { $dto=new OrderInDto();$dto->orderParam=is_array($input['orderParam']??null)?$input['orderParam']:[];return $this->services->getOrders($dto->orderParam); }
}
