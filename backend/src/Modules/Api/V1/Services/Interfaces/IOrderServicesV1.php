<?php
declare(strict_types=1);
namespace App\Modules\Api\V1\Services\Interfaces;
interface IOrderServicesV1 { public function getOrders(array $input): array; public function manageOrders(array $input): array; }
