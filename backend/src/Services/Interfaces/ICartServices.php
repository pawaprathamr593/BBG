<?php
declare(strict_types=1);
namespace App\Services\Interfaces;
interface ICartServices { public function getCart(array $param): array; public function manageCart(array $param): array; }
