<?php
declare(strict_types=1);
use App\Modules\Api\V1\Services\Implementations\OrderServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IOrderServicesV1;
use App\Services\Implementations\OrderServices;
use App\Services\Interfaces\IOrderServices;
return [IOrderServices::class=>OrderServices::class,IOrderServicesV1::class=>OrderServicesV1::class];
