<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Interfaces;

interface IAdminServicesV1
{
    public function getAdmin(array $input): array;

    public function manageAdmin(array $input): array;
}
