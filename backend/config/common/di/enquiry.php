<?php

declare(strict_types=1);

use App\Modules\Api\V1\Services\Implementations\EnquiryServicesV1;
use App\Modules\Api\V1\Services\Interfaces\IEnquiryServicesV1;
use App\Services\Implementations\EnquiryServices;
use App\Services\Interfaces\IEnquiryServices;

return [
    IEnquiryServices::class => EnquiryServices::class,
    IEnquiryServicesV1::class => EnquiryServicesV1::class,
];
