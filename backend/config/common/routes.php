<?php

declare(strict_types=1);

use App\Api;
use App\Modules\Api\V1\Controllers\AuthController;
use App\Modules\Api\V1\Controllers\CartController;
use App\Modules\Api\V1\Controllers\OrderController;
use App\Modules\Api\V1\Controllers\MarketplaceController;
use App\Modules\Api\V1\Controllers\TenantController;
use App\Modules\Api\V1\Controllers\BusinessController;
use App\Modules\Api\V1\Controllers\CatalogueController;
use App\Modules\Api\V1\Controllers\CustomerController;
use App\Modules\Api\V1\Controllers\EnquiryController;
use App\Modules\Api\V1\Controllers\PromotionController;
use App\Modules\Api\V1\Controllers\EngagementController;
use App\Modules\Api\V1\Controllers\SubscriptionController;
use App\Modules\Api\V1\Controllers\AdminController;
use App\Modules\Api\V1\Controllers\PaymentController;
use App\Modules\Api\V1\Controllers\DashboardController;
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
    Route::post('/api/v1/auth/profile/update')->action([AuthController::class, 'actionManageAuth'])->name('api/v1/auth/profile/update'),
    Route::post('/api/v1/auth/permissions')->action([AuthController::class, 'actionGetAuth'])->name('api/v1/auth/permissions'),
    Route::post('/api/v1/auth/social/login')->action([AuthController::class, 'actionManageAuth'])->name('api/v1/auth/social/login'),
    Route::post('/api/v1/auth/social/link')->action([AuthController::class, 'actionManageAuth'])->name('api/v1/auth/social/link'),
    Route::get('/api/v1/auth/social/config')->action([AuthController::class, 'actionSocialConfig'])->name('api/v1/auth/social/config'),

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
    Route::post('/api/v1/orders/tenant/status')->action([OrderController::class, 'actionManageOrders'])->name('api/v1/orders/tenant/status'),
    Route::post('/api/v1/orders/tenant/confirm')->action([OrderController::class, 'actionManageOrders'])->name('api/v1/orders/tenant/confirm'),
    Route::post('/api/v1/orders/tenant/cancel')->action([OrderController::class, 'actionManageOrders'])->name('api/v1/orders/tenant/cancel'),

    Route::post('/api/v1/marketplace/businesses/list')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/businesses/list'),
    Route::post('/api/v1/marketplace/businesses/popular')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/businesses/popular'),
    Route::post('/api/v1/marketplace/businesses/recent')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/businesses/recent'),
    Route::post('/api/v1/marketplace/products/recent')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/products/recent'),
    Route::post('/api/v1/marketplace/businesses/detail')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/businesses/detail'),
    Route::post('/api/v1/marketplace/products/list')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/products/list'),
    Route::post('/api/v1/marketplace/products/categories')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/products/categories'),
    Route::post('/api/v1/marketplace/products/detail')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/products/detail'),
    Route::post('/api/v1/marketplace/home')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/home'),
    Route::post('/api/v1/marketplace/categories/list')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/categories/list'),
    Route::post('/api/v1/marketplace/promotions/list')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/promotions/list'),
    Route::post('/api/v1/marketplace/promotions/detail')->action([MarketplaceController::class, 'actionGetMarketplace'])->name('api/v1/marketplace/promotions/detail'),

    Route::post('/api/v1/tenants/mine/list')->action([TenantController::class, 'actionGetTenant'])->name('api/v1/tenants/mine/list'),
    Route::post('/api/v1/tenants/mine/detail')->action([TenantController::class, 'actionGetTenant'])->name('api/v1/tenants/mine/detail'),
    Route::post('/api/v1/tenants/members/list')->action([TenantController::class, 'actionGetTenant'])->name('api/v1/tenants/members/list'),

    Route::post('/api/v1/business/application/submit')->action([BusinessController::class, 'actionManageBusiness'])->name('api/v1/business/application/submit'),
    Route::post('/api/v1/business/application/get')->action([BusinessController::class, 'actionGetBusiness'])->name('api/v1/business/application/get'),
    Route::post('/api/v1/business/application/update')->action([BusinessController::class, 'actionManageBusiness'])->name('api/v1/business/application/update'),
    Route::post('/api/v1/business/application/resubmit')->action([BusinessController::class, 'actionManageBusiness'])->name('api/v1/business/application/resubmit'),
    Route::post('/api/v1/business/profile/get')->action([BusinessController::class, 'actionGetBusiness'])->name('api/v1/business/profile/get'),
    Route::post('/api/v1/business/profile/update')->action([BusinessController::class, 'actionManageBusiness'])->name('api/v1/business/profile/update'),
    Route::post('/api/v1/business/verification/get')->action([BusinessController::class, 'actionGetBusiness'])->name('api/v1/business/verification/get'),
    Route::post('/api/v1/business/storefront/get')->action([BusinessController::class, 'actionGetBusiness'])->name('api/v1/business/storefront/get'),
    Route::post('/api/v1/business/storefront/update')->action([BusinessController::class, 'actionManageBusiness'])->name('api/v1/business/storefront/update'),
    Route::post('/api/v1/business/storefront/publish')->action([BusinessController::class, 'actionManageBusiness'])->name('api/v1/business/storefront/publish'),
    Route::post('/api/v1/business/storefront/unpublish')->action([BusinessController::class, 'actionManageBusiness'])->name('api/v1/business/storefront/unpublish'),

    Route::post('/api/v1/catalogue/units/list')->action([CatalogueController::class, 'actionGetCatalogue'])->name('api/v1/catalogue/units/list'),
    Route::post('/api/v1/catalogue/categories/list')->action([CatalogueController::class, 'actionGetCatalogue'])->name('api/v1/catalogue/categories/list'),
    Route::post('/api/v1/catalogue/categories/create')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/categories/create'),
    Route::post('/api/v1/catalogue/categories/update')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/categories/update'),
    Route::post('/api/v1/catalogue/categories/delete')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/categories/delete'),
    Route::post('/api/v1/catalogue/products/list')->action([CatalogueController::class, 'actionGetCatalogue'])->name('api/v1/catalogue/products/list'),
    Route::post('/api/v1/catalogue/products/detail')->action([CatalogueController::class, 'actionGetCatalogue'])->name('api/v1/catalogue/products/detail'),
    Route::post('/api/v1/catalogue/products/create')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/products/create'),
    Route::post('/api/v1/catalogue/products/update')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/products/update'),
    Route::post('/api/v1/catalogue/products/delete')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/products/delete'),
    Route::post('/api/v1/catalogue/products/media/list')->action([CatalogueController::class, 'actionGetCatalogue'])->name('api/v1/catalogue/products/media/list'),
    Route::post('/api/v1/catalogue/products/media/upload-url')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/products/media/upload-url'),
    Route::post('/api/v1/catalogue/products/media/link')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/products/media/link'),
    Route::post('/api/v1/catalogue/products/media/delete')->action([CatalogueController::class, 'actionManageCatalogue'])->name('api/v1/catalogue/products/media/delete'),

    Route::post('/api/v1/customers/profile')->action([CustomerController::class, 'actionGetCustomer'])->name('api/v1/customers/profile'),
    Route::post('/api/v1/customers/addresses/list')->action([CustomerController::class, 'actionGetCustomer'])->name('api/v1/customers/addresses/list'),
    Route::post('/api/v1/customers/tenant/list')->action([CustomerController::class, 'actionGetCustomer'])->name('api/v1/customers/tenant/list'),
    Route::post('/api/v1/customers/addresses/create')->action([CustomerController::class, 'actionManageCustomer'])->name('api/v1/customers/addresses/create'),
    Route::post('/api/v1/customers/addresses/update')->action([CustomerController::class, 'actionManageCustomer'])->name('api/v1/customers/addresses/update'),
    Route::post('/api/v1/customers/addresses/delete')->action([CustomerController::class, 'actionManageCustomer'])->name('api/v1/customers/addresses/delete'),
    Route::post('/api/v1/customers/addresses/default')->action([CustomerController::class, 'actionManageCustomer'])->name('api/v1/customers/addresses/default'),

    Route::post('/api/v1/enquiries/create')->action([EnquiryController::class, 'actionManageEnquiry'])->name('api/v1/enquiries/create'),
    Route::post('/api/v1/enquiries/mine/list')->action([EnquiryController::class, 'actionGetEnquiry'])->name('api/v1/enquiries/mine/list'),
    Route::post('/api/v1/enquiries/mine/detail')->action([EnquiryController::class, 'actionGetEnquiry'])->name('api/v1/enquiries/mine/detail'),
    Route::post('/api/v1/enquiries/tenant/list')->action([EnquiryController::class, 'actionGetEnquiry'])->name('api/v1/enquiries/tenant/list'),
    Route::post('/api/v1/enquiries/tenant/detail')->action([EnquiryController::class, 'actionGetEnquiry'])->name('api/v1/enquiries/tenant/detail'),
    Route::post('/api/v1/enquiries/tenant/respond')->action([EnquiryController::class, 'actionManageEnquiry'])->name('api/v1/enquiries/tenant/respond'),
    Route::post('/api/v1/enquiries/tenant/close')->action([EnquiryController::class, 'actionManageEnquiry'])->name('api/v1/enquiries/tenant/close'),

    Route::post('/api/v1/promotions/mine/list')->action([PromotionController::class, 'actionGetPromotion'])->name('api/v1/promotions/mine/list'),
    Route::post('/api/v1/promotions/mine/detail')->action([PromotionController::class, 'actionGetPromotion'])->name('api/v1/promotions/mine/detail'),
    Route::post('/api/v1/promotions/create')->action([PromotionController::class, 'actionManagePromotion'])->name('api/v1/promotions/create'),
    Route::post('/api/v1/promotions/update')->action([PromotionController::class, 'actionManagePromotion'])->name('api/v1/promotions/update'),
    Route::post('/api/v1/promotions/delete')->action([PromotionController::class, 'actionManagePromotion'])->name('api/v1/promotions/delete'),
    Route::post('/api/v1/promotions/publish')->action([PromotionController::class, 'actionManagePromotion'])->name('api/v1/promotions/publish'),
    Route::post('/api/v1/promotions/unpublish')->action([PromotionController::class, 'actionManagePromotion'])->name('api/v1/promotions/unpublish'),
    Route::post('/api/v1/promotions/engagement')->action([PromotionController::class, 'actionGetPromotion'])->name('api/v1/promotions/engagement'),
    Route::post('/api/v1/promotions/media/list')->action([PromotionController::class, 'actionGetPromotion'])->name('api/v1/promotions/media/list'),
    Route::post('/api/v1/promotions/media/upload-url')->action([PromotionController::class, 'actionManagePromotion'])->name('api/v1/promotions/media/upload-url'),
    Route::post('/api/v1/promotions/media/link')->action([PromotionController::class, 'actionManagePromotion'])->name('api/v1/promotions/media/link'),
    Route::post('/api/v1/promotions/media/delete')->action([PromotionController::class, 'actionManagePromotion'])->name('api/v1/promotions/media/delete'),

    Route::post('/api/v1/engagement/likes/toggle')->action([EngagementController::class, 'actionManageEngagement'])->name('api/v1/engagement/likes/toggle'),
    Route::post('/api/v1/engagement/comments/list')->action([EngagementController::class, 'actionGetEngagement'])->name('api/v1/engagement/comments/list'),
    Route::post('/api/v1/engagement/comments/create')->action([EngagementController::class, 'actionManageEngagement'])->name('api/v1/engagement/comments/create'),
    Route::post('/api/v1/engagement/reports/create')->action([EngagementController::class, 'actionManageEngagement'])->name('api/v1/engagement/reports/create'),
    Route::post('/api/v1/engagement/views/record')->action([EngagementController::class, 'actionManageEngagement'])->name('api/v1/engagement/views/record'),

    Route::post('/api/v1/subscriptions/plans/list')->action([SubscriptionController::class, 'actionGetSubscription'])->name('api/v1/subscriptions/plans/list'),
    Route::post('/api/v1/subscriptions/mine/list')->action([SubscriptionController::class, 'actionGetSubscription'])->name('api/v1/subscriptions/mine/list'),
    Route::post('/api/v1/subscriptions/mine/detail')->action([SubscriptionController::class, 'actionGetSubscription'])->name('api/v1/subscriptions/mine/detail'),
    Route::post('/api/v1/subscriptions/request')->action([SubscriptionController::class, 'actionManageSubscription'])->name('api/v1/subscriptions/request'),
    Route::post('/api/v1/subscriptions/renewal/request')->action([SubscriptionController::class, 'actionManageSubscription'])->name('api/v1/subscriptions/renewal/request'),
    Route::post('/api/v1/subscriptions/proofs/upload-url')->action([SubscriptionController::class, 'actionManageSubscription'])->name('api/v1/subscriptions/proofs/upload-url'),
    Route::post('/api/v1/subscriptions/proofs/submit')->action([SubscriptionController::class, 'actionManageSubscription'])->name('api/v1/subscriptions/proofs/submit'),

    Route::post('/api/v1/admin/users/list')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/users/list'),
    Route::post('/api/v1/admin/users/detail')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/users/detail'),
    Route::post('/api/v1/admin/users/suspend')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/users/suspend'),
    Route::post('/api/v1/admin/users/restore')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/users/restore'),
    Route::post('/api/v1/admin/businesses/pending/list')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/businesses/pending/list'),
    Route::post('/api/v1/admin/businesses/detail')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/businesses/detail'),
    Route::post('/api/v1/admin/businesses/approve')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/businesses/approve'),
    Route::post('/api/v1/admin/businesses/reject')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/businesses/reject'),
    Route::post('/api/v1/admin/businesses/reopen')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/businesses/reopen'),
    Route::post('/api/v1/admin/subscriptions/pending/list')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/subscriptions/pending/list'),
    Route::post('/api/v1/admin/subscriptions/detail')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/subscriptions/detail'),
    Route::post('/api/v1/admin/subscriptions/active/list')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/subscriptions/active/list'),
    Route::post('/api/v1/admin/subscriptions/approve')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/subscriptions/approve'),
    Route::post('/api/v1/admin/subscriptions/reject')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/subscriptions/reject'),
    Route::post('/api/v1/admin/categories/list')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/categories/list'),
    Route::post('/api/v1/admin/categories/stats')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/categories/stats'),
    Route::post('/api/v1/admin/categories/create')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/categories/create'),
    Route::post('/api/v1/admin/categories/update')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/categories/update'),
    Route::post('/api/v1/admin/categories/delete')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/categories/delete'),
    Route::post('/api/v1/admin/analytics/summary')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/analytics/summary'),
    Route::post('/api/v1/admin/analytics/trends')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/analytics/trends'),
    Route::post('/api/v1/admin/moderation/queue')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/moderation/queue'),
    Route::post('/api/v1/admin/moderation/history')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/moderation/history'),
    Route::post('/api/v1/admin/moderation/action')->action([AdminController::class, 'actionManageAdmin'])->name('api/v1/admin/moderation/action'),
    Route::post('/api/v1/admin/health/summary')->action([AdminController::class, 'actionGetAdmin'])->name('api/v1/admin/health/summary'),

    Route::post('/api/v1/payments/mine/list')->action([PaymentController::class, 'actionGetPayment'])->name('api/v1/payments/mine/list'),
    Route::post('/api/v1/payments/mine/detail')->action([PaymentController::class, 'actionGetPayment'])->name('api/v1/payments/mine/detail'),
    Route::post('/api/v1/payments/tenant/list')->action([PaymentController::class, 'actionGetPayment'])->name('api/v1/payments/tenant/list'),
    Route::post('/api/v1/payments/tenant/detail')->action([PaymentController::class, 'actionGetPayment'])->name('api/v1/payments/tenant/detail'),

    Route::post('/api/v1/dashboard/consumer/summary')->action([DashboardController::class, 'actionGetDashboard'])->name('api/v1/dashboard/consumer/summary'),
    Route::post('/api/v1/dashboard/entrepreneur/summary')->action([DashboardController::class, 'actionGetDashboard'])->name('api/v1/dashboard/entrepreneur/summary'),
];
