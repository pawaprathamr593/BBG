<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\AuthInDto;
use App\Modules\Api\V1\Services\Interfaces\IAuthServicesV1;
use App\Services\Interfaces\IAuthServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class AuthServicesV1 implements IAuthServicesV1
{
    public function __construct(private IAuthServices $authServices) {}

    public function getAuth(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $authInDto = InDtoObjectFactory::create(AuthInDto::class, $input);
            $resArr = $this->authServices->getAuth($authInDto->authParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Authentication input mapping failed.';
        }
        return $resArr;
    }

    public function manageAuth(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $authInDto = InDtoObjectFactory::create(AuthInDto::class, $input);
            $resArr = $this->authServices->manageAuth($authInDto->authParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Authentication input mapping failed.';
        }
        return $resArr;
    }
}
