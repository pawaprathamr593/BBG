<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IAuthServicesV1
{
    public function getAuth(array $inDtoArray): array;

    public function manageAuth(array $inDtoArray): array;
}
