<?php

declare(strict_types=1);

use App\Api;
use App\Modules\Api\V1\Controllers\AuthController;
use Yiisoft\Router\Route;

/** @var array $params */

return [
    Route::get('/')->action(Api\IndexAction::class)->name('app/index'),

    Route::post('/api/v1/auth/register')->action([AuthController::class, 'actionManageAuth'])->name('api/v1/auth/register'),
    Route::post('/api/v1/auth/login')->action([AuthController::class, 'actionManageAuth'])->name('api/v1/auth/login'),
    Route::post('/api/v1/auth/refresh')->action([AuthController::class, 'actionManageAuth'])->name('api/v1/auth/refresh'),
    Route::post('/api/v1/auth/logout')->action([AuthController::class, 'actionManageAuth'])->name('api/v1/auth/logout'),
    Route::post('/api/v1/auth/logout-all')->action([AuthController::class, 'actionManageAuth'])->name('api/v1/auth/logout-all'),
    Route::post('/api/v1/auth/profile')->action([AuthController::class, 'actionGetAuth'])->name('api/v1/auth/profile'),
];
