<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IEnquiryServicesV1
{
    public function getEnquiry(array $input): array;

    public function manageEnquiry(array $input): array;
}
