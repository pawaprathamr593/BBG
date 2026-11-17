<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$routesPath = $root . '/config/common/routes.php';
$routes = file_get_contents($routesPath);
if ($routes === false) {
    fwrite(STDERR, "Unable to read API route configuration.\n");
    exit(1);
}

preg_match_all("~Route::post\\('(/api/v1/[^']+)'\\)~", $routes, $routeMatches);
$routePaths = $routeMatches[1] ?? [];
if (count($routePaths) !== 125 || count(array_unique($routePaths)) !== 125) {
    fwrite(STDERR, 'Expected 125 unique POST API routes; found ' . count($routePaths) . ".\n");
    exit(1);
}

$controllerMarkers = [
    'Auth' => "\$authParam['actionType'] = \$action;",
    'Cart' => "\$param['actionType'] = \$action;",
    'Order' => "\$param['actionType'] = \$action;",
    'Marketplace' => "\$param['actionType'] = \$action;",
    'Tenant' => "\$param['actionType'] = \$action;",
    'Business' => "\$param['actionType'] = \$action;",
    'Catalogue' => "\$param['actionType'] = \$action;",
    'Customer' => "\$param['actionType'] = \$action;",
    'Enquiry' => "\$param['actionType'] = \$action;",
    'Promotion' => "\$param['actionType'] = \$action;",
    'Engagement' => "\$param['actionType'] = \$action;",
    'Subscription' => "\$param['actionType'] = \$action;",
    'Admin' => "\$param['actionType'] = \$action;",
    'Payment' => "\$param['actionType'] = \$action;",
    'Dashboard' => "\$param['actionType'] = \$action;",
];

foreach ($controllerMarkers as $module => $marker) {
    $path = $root . '/src/Modules/Api/V1/Controllers/' . $module . 'Controller.php';
    $source = file_get_contents($path);
    if ($source === false || !str_contains($source, $marker)) {
        fwrite(STDERR, "Route-derived actionType binding missing in {$module}Controller.\n");
        exit(1);
    }
}

$dispatchMarkers = [
    'Auth' => "match (\$authParam['actionType'])",
    'Cart' => "\$action=(string)\$param['actionType']",
    'Order' => "switch (\$param['actionType'])",
    'Marketplace' => "switch ((string) \$marketplaceParam['actionType'])",
    'Tenant' => "switch ((string) \$tenantParam['actionType'])",
    'Business' => "switch ((string) \$businessParam['actionType'])",
    'Catalogue' => "switch ((string) \$catalogueParam['actionType'])",
    'Customer' => "switch ((string) \$customerParam['actionType'])",
    'Enquiry' => "switch ((string) \$enquiryParam['actionType'])",
    'Promotion' => "switch ((string) \$promotionParam['actionType'])",
    'Engagement' => "switch ((string) \$engagementParam['actionType'])",
    'Subscription' => "switch ((string) \$subscriptionParam['actionType'])",
    'Admin' => "switch ((string) \$adminParam['actionType'])",
    'Payment' => "switch ((string) \$paymentParam['actionType'])",
    'Dashboard' => "switch ((string) \$dashboardParam['actionType'])",
];

foreach ($dispatchMarkers as $module => $marker) {
    $path = $root . '/src/Services/Implementations/' . $module . 'Services.php';
    $source = file_get_contents($path);
    if ($source === false || !str_contains($source, $marker)) {
        fwrite(STDERR, "Route actionType dispatch marker missing in {$module}Services.\n");
        exit(1);
    }
}

$oauthController = file_get_contents($root . '/src/Modules/Api/V1/Controllers/OAuthController.php');
$oauthProviderService = file_get_contents($root . '/src/Utils/OAuthProviderService.php');
$socialOtpService = file_get_contents($root . '/src/Services/Implementations/SocialEmailOtpService.php');
$authService = file_get_contents($root . '/src/Services/Implementations/AuthServices.php');
$authDao = file_get_contents($root . '/src/Dao/AuthDao.php');
$oauthRoutes = [
    '/api/v1/auth/oauth/google/start',
    '/api/v1/auth/oauth/google/callback',
    '/api/v1/auth/oauth/apple/start',
    '/api/v1/auth/oauth/apple/callback',
    '/api/v1/auth/oauth/facebook/start',
    '/api/v1/auth/oauth/facebook/callback',
    '/api/v1/auth/oauth/instagram/start',
    '/api/v1/auth/oauth/instagram/callback',
    '/api/v1/auth/oauth/email/send',
    '/api/v1/auth/oauth/email/verify',
];
foreach ($oauthRoutes as $oauthRoute) {
    if (!str_contains($routes, $oauthRoute)) {
        fwrite(STDERR, "Social authentication route missing: {$oauthRoute}.\\n");
        exit(1);
    }
}
if (
    $oauthController === false
    || $oauthProviderService === false
    || $socialOtpService === false
    || $authService === false
    || $authDao === false
    || !str_contains($oauthProviderService, 'completeGoogle')
    || !str_contains($oauthProviderService, 'completeApple')
    || !str_contains($oauthProviderService, 'completeFacebook')
    || !str_contains($oauthProviderService, 'completeInstagram')
    || !str_contains($oauthController, 'actionVerifyEmailOtp')
    || !str_contains($socialOtpService, 'hash_hmac')
    || !str_contains($authService, 'manageSocialLogin')
    || !str_contains($authDao, 'INSERT INTO USER_IDENTITIES')
) {
    fwrite(STDERR, "Social OAuth, email OTP or USER_IDENTITIES linking contract is incomplete.\\n");
    exit(1);
}

$subscriptionService = file_get_contents($root . '/src/Services/Implementations/SubscriptionServices.php');
$subscriptionController = file_get_contents($root . '/src/Modules/Api/V1/Controllers/SubscriptionController.php');
if (
    $subscriptionService === false
    || $subscriptionController === false
    || !str_contains($routes, '/api/v1/subscriptions/proofs/upload-url')
    || !str_contains($subscriptionController, 'generateSubscriptionProofUploadUrl')
    || !str_contains($subscriptionService, 'private function generateSubscriptionProofUploadUrl')
    || !str_contains($subscriptionService, '$this->s3Storage->createUploadUrl')
    || !str_contains($subscriptionService, '$this->s3Storage->headObject')
    || !str_contains($subscriptionService, '$this->s3Storage->getObjectPrefix')
) {
    fwrite(STDERR, "Subscription proof S3 upload/verification contract is incomplete.\n");
    exit(1);
}

$catalogueDao = file_get_contents($root . '/src/Dao/CatalogueDao.php');
$catalogueService = file_get_contents($root . '/src/Services/Implementations/CatalogueServices.php');
$promotionDao = file_get_contents($root . '/src/Dao/PromotionDao.php');
$promotionService = file_get_contents($root . '/src/Services/Implementations/PromotionServices.php');
if (
    $catalogueDao === false
    || $catalogueService === false
    || $promotionDao === false
    || $promotionService === false
    || !str_contains($catalogueDao, "entitlement_code = 'PRODUCT_MANAGEMENT'")
    || !str_contains($catalogueService, 'isEntitlementEnabled')
    || str_contains($catalogueDao, "entitlement_code = 'PRODUCT_LIMIT'")
    || !str_contains($promotionDao, "entitlement_code = 'PROMOTION_MANAGEMENT'")
    || !str_contains($promotionDao, "entitlement_code = 'DAILY_PROMOTION_LIMIT'")
    || !str_contains($promotionDao, 'CONVERT_TZ')
    || !str_contains($promotionService, 'lockTenantForPromotionPublish')
    || !str_contains($promotionService, 'countPromotionsPublishedOnTenantLocalDay')
) {
    fwrite(STDERR, "Catalogue or promotion subscription entitlement enforcement does not match the BBG plan seed.\n");
    exit(1);
}

echo "Static API contract checks passed: 125 unique POST routes, 15 route-bound controllers, 15 actionType dispatchers, social OAuth/email OTP, subscription proof S3, catalogue plan entitlement and tenant-local daily promotion limits.\n";
