<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\EngagementInDto;
use App\Modules\Api\V1\Services\Interfaces\IEngagementServicesV1;
use App\Services\Interfaces\IEngagementServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class EngagementServicesV1 implements IEngagementServicesV1
{
    public function __construct(private IEngagementServices $services) {}

    public function getEngagement(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $engagementInDto = InDtoObjectFactory::create(EngagementInDto::class, $input);
            $resArr = $this->services->getEngagement($engagementInDto->engagementParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Engagement input mapping failed.';
        }
        return $resArr;
    }

    public function manageEngagement(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $engagementInDto = InDtoObjectFactory::create(EngagementInDto::class, $input);
            $resArr = $this->services->manageEngagement($engagementInDto->engagementParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Engagement input mapping failed.';
        }
        return $resArr;
    }
}
