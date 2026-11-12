<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Services\Implementations;

use App\Modules\Api\V1\Dto\In\EnquiryInDto;
use App\Modules\Api\V1\Services\Interfaces\IEnquiryServicesV1;
use App\Services\Interfaces\IEnquiryServices;
use App\Utils\InDtoObjectFactory;
use Throwable;

final readonly class EnquiryServicesV1 implements IEnquiryServicesV1
{
    public function __construct(private IEnquiryServices $services) {}

    public function getEnquiry(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $enquiryInDto = InDtoObjectFactory::create(EnquiryInDto::class, $input);
            $resArr = $this->services->getEnquiry($enquiryInDto->enquiryParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Enquiry input mapping failed.';
        }
        return $resArr;
    }

    public function manageEnquiry(array $input): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $enquiryInDto = InDtoObjectFactory::create(EnquiryInDto::class, $input);
            $resArr = $this->services->manageEnquiry($enquiryInDto->enquiryParam);
        } catch (Throwable) {
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Enquiry input mapping failed.';
        }
        return $resArr;
    }
}
