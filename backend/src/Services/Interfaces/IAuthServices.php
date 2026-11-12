<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IAuthServices
{
    public function getAuth(array $authParam): array;

    public function manageAuth(array $authParam): array;
}
