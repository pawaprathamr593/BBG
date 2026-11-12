<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IAdminServices
{
    public function getAdmin(array $adminParam): array;

    public function manageAdmin(array $adminParam): array;
}
