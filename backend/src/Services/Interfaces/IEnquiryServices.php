<?php

declare(strict_types=1);

namespace App\Services\Interfaces;

interface IEnquiryServices
{
    public function getEnquiry(array $enquiryParam): array;

    public function manageEnquiry(array $enquiryParam): array;
}
