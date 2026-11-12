<?php
declare(strict_types=1);
namespace App\Services\Interfaces;
interface IOrderServices { public function getOrders(array $param): array; public function manageOrders(array $param): array; }
