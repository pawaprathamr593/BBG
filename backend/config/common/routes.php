<?php

declare(strict_types=1);

use App\Api;
use App\Modules\Api\V1\Controllers\AuthController;
use App\Modules\Api\V1\Controllers\CartController;
use App\Modules\Api\V1\Controllers\OrderController;
use App\Modules\Api\V1\Controllers\MarketplaceController;
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

    Route::post('/api/v1/cart/get')->action([CartController::class, 'actionGetCart'])->name('api/v1/cart/get'),
    Route::post('/api/v1/cart/add')->action([CartController::class, 'actionManageCart'])->name('api/v1/cart/add'),
    Route::post('/api/v1/cart/update')->action([CartController::class, 'actionManageCart'])->name('api/v1/cart/update'),
    Route::post('/api/v1/cart/remove')->action([CartController::class, 'actionManageCart'])->name('api/v1/cart/remove'),
    Route::post('/api/v1/cart/clear')->action([CartController::class, 'actionManageCart'])->name('api/v1/cart/clear'),
    Route::post('/api/v1/cart/checkout')->action([CartController::class, 'actionManageCart'])->name('api/v1/cart/checkout'),
    Route::post('/api/v1/cart/whatsapp-order')->action([CartController::class, 'actionManageCart'])->name('api/v1/cart/whatsapp-order'),

    Route::post('/api/v1/orders/list')->action([OrderController::class, 'actionGetOrders'])->name('api/v1/orders/list'),
    Route::post('/api/v1/orders/detail')->action([OrderController::class, 'actionGetOrders'])->name('api/v1/orders/detail'),
    Route::post('/api/v1/orders/tenant/list')->action([OrderController::class, 'actionGetOrders'])->name('api/v1/orders/tenant/list'),
    Route::post('/api/v1/orders/tenant/detail')->action([OrderController::class, 'actionGetOrders'])->name('api/v1/orders/tenant/detail'),
    Route::post('/api/v1/orders/tenant/confirm')->action([OrderController::class, 'actionManageOrders'])->name('api/v1/orders/tenant/confirm'),
    Route::post('/api/v1/orders/tenant/cancel')->action([OrderController::class, 'actionManageOrders'])->name('api/v1/orders/tenant/cancel'),

    Route::post('/api/v1/marketplace/businesses/list')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/businesses/list'),
    Route::post('/api/v1/marketplace/businesses/detail')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/businesses/detail'),
    Route::post('/api/v1/marketplace/products/list')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/products/list'),
    Route::post('/api/v1/marketplace/products/detail')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/products/detail'),
    Route::post('/api/v1/marketplace/categories/list')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/categories/list'),
    Route::post('/api/v1/marketplace/promotions/list')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/promotions/list'),
    Route::post('/api/v1/marketplace/promotions/detail')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/promotions/detail'),
    Route::post('/api/v1/marketplace/home')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/home'),
];
