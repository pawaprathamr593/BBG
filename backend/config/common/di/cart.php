<?php
declare(strict_types=1);
use App\Modules\Api\V1\Services\Implementations\CartServicesV1;
use App\Modules\Api\V1\Services\Interfaces\ICartServicesV1;
use App\Services\Implementations\CartServices;
use App\Services\Interfaces\ICartServices;
return [ICartServices::class=>CartServices::class,ICartServicesV1::class=>CartServicesV1::class];
