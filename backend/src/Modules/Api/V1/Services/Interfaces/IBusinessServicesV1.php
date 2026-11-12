<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IBusinessServicesV1
{
    public function getBusiness(array $input): array;

    public function manageBusiness(array $input): array;
}
