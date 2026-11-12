<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\AuthInDto;
use App\Modules\Api\V1\Services\Interfaces\IAuthServicesV1;
use App\Services\Interfaces\IAuthServices;

final readonly class AuthServicesV1 implements IAuthServicesV1
{
    public function __construct(private IAuthServices $authServices) {}

    public function getAuth(array $inDtoArray): array
    {
        $authInDto = new AuthInDto();
        $authInDto->authParam = is_array($inDtoArray['authParam'] ?? null)
            ? $inDtoArray['authParam']
            : [];

        return $this->authServices->getAuth($authInDto->authParam);
    }

    public function manageAuth(array $inDtoArray): array
    {
        $authInDto = new AuthInDto();
        $authInDto->authParam = is_array($inDtoArray['authParam'] ?? null)
            ? $inDtoArray['authParam']
            : [];

        return $this->authServices->manageAuth($authInDto->authParam);
    }
}
