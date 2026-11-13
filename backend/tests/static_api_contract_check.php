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
if (count($routePaths) !== 127 || count(array_unique($routePaths)) !== 127) {
    fwrite(STDERR, 'Expected 127 unique POST API routes; found ' . count($routePaths) . ".\n");
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


$marketplaceController = file_get_contents($root . '/src/Modules/Api/V1/Controllers/MarketplaceController.php');
$marketplaceService = file_get_contents($root . '/src/Services/Implementations/MarketplaceServices.php');
$engagementDao = file_get_contents($root . '/src/Dao/EngagementDao.php');
$engagementService = file_get_contents($root . '/src/Services/Implementations/EngagementServices.php');
$discoveryContracts = [
    $marketplaceController !== false
        && str_contains($marketplaceController, "'/api/v1/marketplace/businesses/popular' => 'listPopularBusinesses'")
        && str_contains($marketplaceController, "'/api/v1/marketplace/businesses/recent' => 'listRecentBusinesses'")
        && str_contains($marketplaceController, "'/api/v1/marketplace/products/recent' => 'listRecentProducts'"),
    $marketplaceService !== false
        && str_contains($marketplaceService, "case 'listPopularBusinesses':")
        && str_contains($marketplaceService, "case 'listRecentBusinesses':")
        && str_contains($marketplaceService, "case 'listRecentProducts':")
        && str_contains($marketplaceService, "'popular_businesses' =>")
        && str_contains($marketplaceService, "'recent_products' =>"),
    $engagementDao !== false && str_contains($engagementDao, "'BUSINESS' =>"),
    $engagementService !== false && str_contains($engagementService, "['BUSINESS', 'PRODUCT', 'POST']"),
];
if (in_array(false, $discoveryContracts, true)) {
    fwrite(STDERR, "Public marketplace discovery API contract is incomplete.\\n");
    exit(1);
}

$socialAuthService = file_get_contents($root . '/src/Services/Implementations/AuthServices.php');
$socialAuthController = file_get_contents($root . '/src/Modules/Api/V1/Controllers/AuthController.php');
$socialAuthContracts = [
    str_contains($routes, "'/api/v1/auth/social/login'") && str_contains($routes, "'/api/v1/auth/social/link'"),
    str_contains($routes, "'/api/v1/auth/social/config'")
        && $socialAuthController !== false
        && str_contains($socialAuthController, "'socialLogin'")
        && str_contains($socialAuthController, "'socialLink'"),
    $socialAuthService !== false && str_contains($socialAuthService, 'manageSocialLogin'),
    is_file($root . '/src/Utils/SocialProviderTokenVerifier.php'),
];
if (in_array(false, $socialAuthContracts, true)) {
    fwrite(STDERR, "Social authentication API contract is incomplete.\\n");
    exit(1);
}

echo "Static API contract checks passed: 127 unique POST routes, 15 route-bound controllers, 15 actionType dispatchers, social authentication, marketplace discovery and subscription proof S3 flow.\\n";
