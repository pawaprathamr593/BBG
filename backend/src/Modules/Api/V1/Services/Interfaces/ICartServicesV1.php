<?php
declare(strict_types=1);
namespace App\Modules\Api\V1\Services\Interfaces;
interface ICartServicesV1 { public function getCart(array $input): array; public function manageCart(array $input): array; }
