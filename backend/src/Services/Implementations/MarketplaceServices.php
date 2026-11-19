<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\MarketplaceDao;
use App\Services\Interfaces\IMarketplaceServices;
use App\Utils\AwsS3Storage;
use Hashids\Hashids;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class MarketplaceServices implements IMarketplaceServices
{
    public function __construct(
        private ConnectionInterface $db,
        private MarketplaceDao $dao,
        private AwsS3Storage $s3Storage,
        private LoggerInterface $logger,
    ) {}

    public function getMarketplace(array $marketplaceParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        if (!is_array($marketplaceParam)) {
            return $this->failure('Invalid marketplace parameter array.');
        }
        if (!isset($marketplaceParam['actionType'])) {
            return $this->failure("Missing required key 'actionType'.");
        }
        if (!isset($marketplaceParam['actionData']) || !is_array($marketplaceParam['actionData'])) {
            return $this->failure("Missing or invalid 'actionData'.");
        }
        if (!is_string($marketplaceParam['actionType'] ?? null) || $marketplaceParam['actionType'] === '') {
            return $this->failure('Unsupported actionType for getMarketplace.');
        }

        $actionData = $marketplaceParam['actionData'];
        $actionData['action'] = (string) $marketplaceParam['actionType'];
        try {
            switch ((string) $marketplaceParam['actionType']) {
                case 'listBusinesses':
                    $resArr = $this->getBusinesses($actionData);
                    break;
                case 'getBusiness':
                    $resArr = $this->getBusiness($actionData);
                    break;
                case 'listProducts':
                    $resArr = $this->getProducts($actionData);
                    break;
                case 'getProduct':
                    $resArr = $this->getProduct($actionData);
                    break;
                case 'listPublicCategories':
                    $resArr = $this->getCategories($actionData);
                    break;
                case 'listPublicProductCategories':
                    $resArr = $this->getProductCategories($actionData);
                    break;
                case 'listPublicPromotions':
                    $resArr = $this->getPromotions($actionData);
                    break;
                case 'getPublicPromotion':
                    $resArr = $this->getPromotion($actionData);
                    break;
                case 'listPopularBusinesses':
                    $resArr = $this->getPopularBusinesses($actionData);
                    break;
                case 'listRecentBusinesses':
                    $resArr = $this->getRecentBusinesses($actionData);
                    break;
                case 'listRecentProducts':
                    $resArr = $this->getRecentProducts($actionData);
                    break;
                case 'getHomeSummary':
                    $resArr = $this->getHomeSummary($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported marketplace read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('MarketplaceServices::getMarketplace failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Marketplace request failed unexpectedly.';
            $resArr['data'] = [];
        }

        return $resArr;
    }

    private function getBusinesses(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $categoryId = null;
        if (isset($actionData['category_id']) && $actionData['category_id'] !== '') {
            $categoryId = $this->positiveInt($actionData['category_id']);
            if ($categoryId === null) {
                $resArr['msgArr'][] = 'A valid category_id is required.';
                return $resArr;
            }
        }

        $search = $this->filterText($actionData['search'] ?? '', 100);
        $city = $this->filterText($actionData['city'] ?? '', 100);
        $state = $this->filterText($actionData['state'] ?? '', 100);
        $rows = $this->dao->getBusinesses($this->db, $search, $city, $state, $categoryId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'MarketplaceServices::getBusinesses');
        }
        $count = $this->dao->countBusinesses($this->db, $search, $city, $state, $categoryId);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'MarketplaceServices::getBusinesses');
        }

        $items = array_map(fn (array $row): array => $this->publicBusiness($row, false), $rows['data']);
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => (int) ($count['data']['total'] ?? 0),
            ],
        ];
        return $resArr;
    }

    private function getBusiness(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $slug = $this->businessSlug($actionData['business_slug'] ?? null);
        if ($slug === null) {
            $resArr['msgArr'][] = 'A valid business_slug is required.';
            return $resArr;
        }

        $result = $this->dao->getBusinessBySlug($this->db, $slug);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'MarketplaceServices::getBusiness');
        }
        if ($result['data'] === []) {
            $resArr['msgArr'][] = 'Published business storefront was not found.';
            return $resArr;
        }

        $row = $result['data'];
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'business' => $this->publicBusiness($row, true),
            'storefront' => [
                'title' => $row['storefront_title'],
                'description' => $row['storefront_description'],
                'theme_code' => $row['theme_code'],
                'show_prices' => (bool) $row['show_prices'],
                'accept_online_orders' => (bool) $row['accept_online_orders'],
                'whatsapp_enabled' => (bool) $row['whatsapp_enabled'],
                'currency' => $row['default_currency'],
            ],
        ];
        return $resArr;
    }

    private function getProducts(array $actionData): array
    {
        $slug = $this->businessSlug($actionData['business_slug'] ?? null);
        if ($slug === null) {
            return $this->getMarketplaceProducts($actionData);
        }

        $business = $this->dao->getBusinessBySlug($this->db, $slug);
        if ($business['status'] !== 'SUCCESS') {
            return $this->propagateFailure($business, 'MarketplaceServices::getProducts');
        }
        if ($business['data'] === []) {
            return ['status' => 'FAILED', 'msgArr' => ['Published business storefront was not found.'], 'data' => []];
        }

        return $this->getMarketplaceProducts(
            $actionData,
            (int) $business['data']['tenant_id'],
            $slug,
        );
    }

    private function getMarketplaceProducts(array $actionData, ?int $tenantId = null, ?string $businessSlug = null): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $categoryId = null;
        if (isset($actionData['category_id']) && $actionData['category_id'] !== '') {
            $categoryId = $this->positiveInt($actionData['category_id']);
            if ($categoryId === null) {
                $resArr['msgArr'][] = 'A valid product category_id is required.';
                return $resArr;
            }
        }

        $minPrice = $this->optionalPrice($actionData['min_price'] ?? null);
        $maxPrice = $this->optionalPrice($actionData['max_price'] ?? null);
        if (($actionData['min_price'] ?? '') !== '' && $minPrice === null) {
            $resArr['msgArr'][] = 'A valid min_price is required.';
            return $resArr;
        }
        if (($actionData['max_price'] ?? '') !== '' && $maxPrice === null) {
            $resArr['msgArr'][] = 'A valid max_price is required.';
            return $resArr;
        }
        if ($minPrice !== null && $maxPrice !== null && $minPrice > $maxPrice) {
            $resArr['msgArr'][] = 'min_price cannot be greater than max_price.';
            return $resArr;
        }

        $sort = $this->filterText($actionData['sort'] ?? 'newest', 20);
        $allowedSorts = ['newest', 'popular', 'nearby', 'price_low', 'price_high', 'name'];
        if (!in_array($sort, $allowedSorts, true)) {
            $resArr['msgArr'][] = 'Unsupported product sort option.';
            return $resArr;
        }

        $latitude = null;
        $longitude = null;
        if ($sort === 'nearby') {
            $latitude = is_numeric($actionData['latitude'] ?? null) ? (float) $actionData['latitude'] : null;
            $longitude = is_numeric($actionData['longitude'] ?? null) ? (float) $actionData['longitude'] : null;
            if ($latitude === null || $longitude === null || $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
                $resArr['msgArr'][] = 'Valid latitude and longitude are required for nearby sorting.';
                return $resArr;
            }
        }

        $filters = [
            'search' => $this->filterText($actionData['search'] ?? '', 100),
            'category_id' => $categoryId,
            'brand' => $this->filterText($actionData['brand'] ?? '', 100),
            'city' => $this->filterText($actionData['city'] ?? '', 100),
            'state' => $this->filterText($actionData['state'] ?? '', 100),
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'online_only' => filter_var($actionData['online_only'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'variants_only' => filter_var($actionData['variants_only'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'with_images' => filter_var($actionData['with_images'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'price_visible_only' => in_array($sort, ['price_low', 'price_high'], true),
            'latitude' => $latitude,
            'longitude' => $longitude,
            'tenant_id' => $tenantId,
        ];

        $rows = $this->dao->getMarketplaceProducts($this->db, $filters, $sort, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'MarketplaceServices::getMarketplaceProducts');
        }
        $count = $this->dao->countMarketplaceProducts($this->db, $filters);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'MarketplaceServices::getMarketplaceProducts');
        }

        $items = array_map(function (array $row): array {
            $item = $this->publicProduct($row, (bool) $row['show_prices']);
            $item['created_on'] = $row['created_on'];
            $item['popularity'] = [
                'views' => (int) $row['view_count'],
                'likes' => (int) $row['like_count'],
                'engagements' => (int) $row['popularity_count'],
            ];
            if ($row['distance_km'] !== null) {
                $item['distance_km'] = round((float) $row['distance_km'], 2);
            }
            $item['business'] = [
                'business_name' => $row['business_name'],
                'business_slug' => $row['business_slug'],
                'logo_path' => $row['business_logo_path'],
                'city' => $row['city'],
                'state' => $row['state'],
            ];
            return $item;
        }, $rows['data']);

        $items = $this->attachPublicProductMedia($items);

        $sortBasis = match ($sort) {
            'popular' => 'persisted_product_views_plus_likes',
            'nearby' => 'business_profile_coordinates_haversine_distance_km',
            'price_low' => 'selling_price_ascending',
            'price_high' => 'selling_price_descending',
            'name' => 'product_name_ascending',
            default => 'created_on_descending',
        };
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            ...($businessSlug !== null ? ['business_slug' => $businessSlug] : []),
            'items' => $items,
            'sort' => $sort,
            'sort_basis' => $sortBasis,
            'timestamp_note' => 'Newly added products are ordered by PRODUCTS.created_on; the current schema has no separate published_on timestamp.',
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => (int) ($count['data']['total'] ?? 0),
            ],
        ];
        return $resArr;
    }

    private function getProductCategories(array $actionData): array
    {
        $result = $this->dao->getPublicProductCategories($this->db);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'MarketplaceServices::getProductCategories');
        }
        return [
            'status' => 'SUCCESS',
            'msgArr' => [],
            'data' => ['items' => $result['data']],
        ];
    }

    private function getProduct(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $slug = $this->businessSlug($actionData['business_slug'] ?? null);
        $productId = $this->decodePublicProductId($actionData['product_id'] ?? null);
        if ($slug === null || $productId === null) {
            $resArr['msgArr'][] = 'Valid business_slug and product_id are required.';
            return $resArr;
        }

        $result = $this->dao->getProductById($this->db, $slug, $productId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'MarketplaceServices::getProduct');
        }
        if ($result['data'] === []) {
            $resArr['msgArr'][] = 'Published product was not found in this storefront.';
            return $resArr;
        }

        $product = $result['data'];
        $showPrices = (bool) $product['show_prices'];
        $variants = [];
        if ((bool) $product['is_variant_product']) {
            $variantResult = $this->dao->getProductVariants($this->db, (int) $product['tenant_id'], $productId);
            if ($variantResult['status'] !== 'SUCCESS') {
                return $this->propagateFailure($variantResult, 'MarketplaceServices::getProduct');
            }
            $variants = array_map(static function (array $variant) use ($showPrices): array {
                if (!$showPrices) {
                    unset($variant['selling_price']);
                }
                return $variant;
            }, $variantResult['data']);
        }

        $productView = $this->publicProduct($product, $showPrices);
        $productView = $this->attachPublicProductMedia([$productView])[0];

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'product' => $productView,
            'variants' => $variants,
        ];
        return $resArr;
    }

    private function getCategories(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $result = $this->dao->getPublicCategories($this->db);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'MarketplaceServices::getCategories');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $result['data']];
        return $resArr;
    }

    private function getPromotions(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $businessSlug = $this->businessSlug($actionData['business_slug'] ?? '');
        $tenantId = null;
        if ($businessSlug !== null) {
            $business = $this->dao->getBusinessBySlug($this->db, $businessSlug);
            if ($business['status'] !== 'SUCCESS') {
                return $this->propagateFailure($business, 'MarketplaceServices::getPromotions');
            }
            if ($business['data'] === []) {
                $resArr['msgArr'][] = 'Published business storefront was not found.';
                return $resArr;
            }
            $tenantId = (int) $business['data']['tenant_id'];
        }
        $rows = $this->dao->getPublicPromotions($this->db, $tenantId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'MarketplaceServices::getPromotions');
        }
        $postIds = array_map(static fn (array $row): int => (int) $row['id'], $rows['data']);
        $mediaRows = $this->dao->getPublicPromotionMediaForPosts($this->db, $postIds);
        if ($mediaRows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($mediaRows, 'MarketplaceServices::getPromotions');
        }
        $mediaByPost = [];
        foreach ($mediaRows['data'] as $mediaRow) {
            try {
                $mediaRow['url'] = $this->s3Storage->createDownloadUrl((string) $mediaRow['file_path']);
            } catch (Throwable $exception) {
                $this->logger->warning('Unable to create a public promotion media URL.', [
                    'post_id' => (int) $mediaRow['post_id'],
                    'media_id' => (int) $mediaRow['id'],
                    'exception' => $exception,
                ]);
                $mediaRow['url'] = null;
            }
            $mediaByPost[(int) $mediaRow['post_id']][] = $mediaRow;
        }
        foreach ($rows['data'] as &$promotionRow) {
            $promotionRow['media'] = $mediaByPost[(int) $promotionRow['id']] ?? [];
        }
        unset($promotionRow);

        $count = $this->dao->countPublicPromotions($this->db, $tenantId);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'MarketplaceServices::getPromotions');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $rows['data'],
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => (int) ($count['data']['total'] ?? 0),
            ],
        ];
        return $resArr;
    }

    private function getPromotion(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $promotionId = $this->positiveInt($actionData['promotion_id'] ?? null);
        if ($promotionId === null) {
            $resArr['msgArr'][] = 'A valid promotion_id is required.';
            return $resArr;
        }
        $result = $this->dao->getPublicPromotionById($this->db, $promotionId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'MarketplaceServices::getPromotion');
        }
        if ($result['data'] === []) {
            $resArr['msgArr'][] = 'Published promotion was not found.';
            return $resArr;
        }
        $media = $this->dao->getPublicPromotionMedia($this->db, (int) $result['data']['tenant_id'], $promotionId);
        if ($media['status'] !== 'SUCCESS') {
            return $this->propagateFailure($media, 'MarketplaceServices::getPromotion');
        }
        foreach ($media['data'] as &$mediaRow) {
            try {
                $mediaRow['url'] = $this->s3Storage->createDownloadUrl((string) $mediaRow['file_path']);
            } catch (Throwable $exception) {
                $this->logger->warning('Unable to create a public promotion media URL.', [
                    'post_id' => $promotionId,
                    'media_id' => (int) $mediaRow['id'],
                    'exception' => $exception,
                ]);
                $mediaRow['url'] = null;
            }
        }
        unset($mediaRow);
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['promotion' => $result['data'], 'media' => $media['data']];
        return $resArr;
    }

    private function getPopularBusinesses(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 8) ?? 8);
        $rows = $this->dao->getPopularBusinesses($this->db, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'MarketplaceServices::getPopularBusinesses');
        }
        $count = $this->dao->countPopularBusinesses($this->db);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'MarketplaceServices::getPopularBusinesses');
        }

        $items = [];
        foreach ($rows['data'] as $index => $row) {
            $business = $this->publicBusiness($row, false);
            $business['rank'] = (($page - 1) * $pageSize) + $index + 1;
            $business['popularity'] = [
                'views' => (int) ($row['view_count'] ?? 0),
                'enquiries' => (int) ($row['enquiry_count'] ?? 0),
                'engagements' => (int) ($row['engagement_count'] ?? 0),
            ];
            $items[] = $business;
        }

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $items,
            'ranking_basis' => ['business_profile_views', 'active_customer_enquiries'],
            'ranking_period' => 'ALL_TIME',
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => (int) ($count['data']['total'] ?? 0),
            ],
        ];
        return $resArr;
    }

    private function getRecentBusinesses(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 8) ?? 8);
        $rows = $this->dao->getRecentBusinesses($this->db, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'MarketplaceServices::getRecentBusinesses');
        }
        $count = $this->dao->countBusinesses($this->db);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'MarketplaceServices::getRecentBusinesses');
        }

        $items = array_map(function (array $row): array {
            $business = $this->publicBusiness($row, false);
            $business['created_on'] = $row['created_on'];
            return $business;
        }, $rows['data']);

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $items,
            'sort_basis' => 'created_on',
            'timestamp_note' => 'Businesses are currently ordered by record creation time because BUSINESS_PROFILES has no published_on column.',
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => (int) ($count['data']['total'] ?? 0),
            ],
        ];
        return $resArr;
    }

    private function getRecentProducts(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 8) ?? 8);
        $rows = $this->dao->getRecentProducts($this->db, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'MarketplaceServices::getRecentProducts');
        }
        $count = $this->dao->countRecentProducts($this->db);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'MarketplaceServices::getRecentProducts');
        }

        $items = array_map(function (array $row): array {
            $item = $this->publicProduct($row, (bool) $row['show_prices']);
            $item['business'] = [
                'business_name' => $row['business_name'],
                'business_slug' => $row['business_slug'],
                'logo_path' => $row['business_logo_path'],
            ];
            $item['created_on'] = $row['created_on'];
            return $item;
        }, $rows['data']);

        $items = $this->attachPublicProductMedia($items);

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $items,
            'sort_basis' => 'created_on',
            'timestamp_note' => 'Products are currently ordered by record creation time because PRODUCTS has no published_on column.',
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => (int) ($count['data']['total'] ?? 0),
            ],
        ];
        return $resArr;
    }

    private function getHomeSummary(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $stats = $this->dao->getHomepageStats($this->db);
        if ($stats['status'] !== 'SUCCESS') {
            return $this->propagateFailure($stats, 'MarketplaceServices::getHomeSummary');
        }
        $categories = $this->getCategories([]);
        if ($categories['status'] !== 'SUCCESS') {
            return $this->propagateFailure($categories, 'MarketplaceServices::getHomeSummary');
        }
        $businesses = $this->getBusinesses(['page' => 1, 'page_size' => 8]);
        if ($businesses['status'] !== 'SUCCESS') {
            return $this->propagateFailure($businesses, 'MarketplaceServices::getHomeSummary');
        }
        $promotions = $this->getPromotions(['page' => 1, 'page_size' => 8]);
        if ($promotions['status'] !== 'SUCCESS') {
            return $this->propagateFailure($promotions, 'MarketplaceServices::getHomeSummary');
        }
        $popularBusinesses = $this->getPopularBusinesses(['page' => 1, 'page_size' => 8]);
        if ($popularBusinesses['status'] !== 'SUCCESS') {
            return $this->propagateFailure($popularBusinesses, 'MarketplaceServices::getHomeSummary');
        }
        $recentBusinesses = $this->getRecentBusinesses(['page' => 1, 'page_size' => 8]);
        if ($recentBusinesses['status'] !== 'SUCCESS') {
            return $this->propagateFailure($recentBusinesses, 'MarketplaceServices::getHomeSummary');
        }
        $recentProducts = $this->getRecentProducts(['page' => 1, 'page_size' => 8]);
        if ($recentProducts['status'] !== 'SUCCESS') {
            return $this->propagateFailure($recentProducts, 'MarketplaceServices::getHomeSummary');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'stats' => [
                'businesses_registered' => (int) ($stats['data']['businesses_registered'] ?? 0),
                'platform_users' => (int) ($stats['data']['platform_users'] ?? 0),
                'products_listed' => (int) ($stats['data']['products_listed'] ?? 0),
                'orders_completed' => (int) ($stats['data']['orders_completed'] ?? 0),
            ],
            'categories' => $categories['data']['items'],
            'businesses' => $businesses['data']['items'],
            'popular_businesses' => $popularBusinesses['data']['items'],
            'recent_businesses' => $recentBusinesses['data']['items'],
            'recent_products' => $recentProducts['data']['items'],
            'promotions' => $promotions['data']['items'],
            'discovery_meta' => [
                'popular_businesses_ranking_basis' => $popularBusinesses['data']['ranking_basis'],
                'recent_businesses_sort_basis' => $recentBusinesses['data']['sort_basis'],
                'recent_products_sort_basis' => $recentProducts['data']['sort_basis'],
            ],
        ];
        return $resArr;
    }

    private function publicBusiness(array $row, bool $includeAddress): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $business = [
            'id' => (int) $row['id'],
            'business_name' => $row['business_name'],
            'business_slug' => $row['business_slug'],
            'business_description' => $row['business_description'],
            'category_id' => $row['primary_category_id'] === null ? null : (int) $row['primary_category_id'],
            'category_name' => $row['category_name'],
            'business_phone' => $row['business_phone'],
            'business_email' => $row['business_email'],
            'logo_path' => $row['logo_path'],
            'cover_image_path' => $row['cover_image_path'],
            'city' => $row['city'],
            'state' => $row['state'],
            'postal_code' => $row['postal_code'],
            'whatsapp_enabled' => (bool) $row['whatsapp_enabled'],
            'accept_online_orders' => (bool) $row['accept_online_orders'],
        ];
        if ((bool) $row['whatsapp_enabled'] && !empty($row['whatsapp_number'])) {
            $business['whatsapp_number'] = $row['whatsapp_number'];
        }
        if ($includeAddress) {
            $business['address'] = [
                'address_line_1' => $row['address_line_1'],
                'address_line_2' => $row['address_line_2'],
                'city' => $row['city'],
                'state' => $row['state'],
                'postal_code' => $row['postal_code'],
                'country_code' => $row['country_code'],
            ];
            $business['location'] = [
                'latitude' => $row['latitude'],
                'longitude' => $row['longitude'],
            ];
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $business;
        return $business;
    }

    /**
     * Attach ordered, signed media URLs to public product view models.
     * One batched DAO read avoids one query per product card.
     */
    private function attachPublicProductMedia(array $items): array
    {
        if ($items === []) {
            return $items;
        }

        $productIds = array_map(static fn (array $item): int => (int) $item['id'], $items);
        $mediaResult = $this->dao->getPublicProductMediaForProducts($this->db, $productIds);
        if ($mediaResult['status'] !== 'SUCCESS') {
            foreach ($items as &$item) {
                $item['media'] = [];
                $item['primary_image_url'] = null;
            }
            unset($item);
            return $items;
        }

        $mediaByProduct = [];
        foreach ($mediaResult['data'] as $mediaRow) {
            try {
                $mediaRow['url'] = $this->s3Storage->createDownloadUrl((string) $mediaRow['file_path']);
                $mediaRow['thumbnail_url'] = !empty($mediaRow['thumbnail_path'])
                    ? $this->s3Storage->createDownloadUrl((string) $mediaRow['thumbnail_path'])
                    : null;
            } catch (Throwable $exception) {
                $this->logger->warning('Unable to create a public product media URL.', [
                    'product_id' => (int) $mediaRow['product_id'],
                    'media_id' => (int) $mediaRow['id'],
                    'exception' => $exception,
                ]);
                $mediaRow['url'] = null;
                $mediaRow['thumbnail_url'] = null;
            }
            $mediaByProduct[(int) $mediaRow['product_id']][] = $mediaRow;
        }

        foreach ($items as &$item) {
            $item['media'] = $mediaByProduct[(int) $item['id']] ?? [];
            $primaryImage = null;
            foreach ($item['media'] as $media) {
                if (($media['media_type'] ?? '') === 'IMAGE' && !empty($media['url'])) {
                    $primaryImage = $media['url'];
                    break;
                }
            }
            $item['primary_image_url'] = $primaryImage;
        }
        unset($item);

        return $items;
    }

    private function publicProduct(array $row, bool $showPrices): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $product = [
            'id' => (int) $row['id'],
            'offering_type' => 'PRODUCT',
            'public_id' => $this->productHashids()->encode((int) $row['id']),
            'slug' => $this->productSlug((string) $row['product_name']),
            'product_code' => $row['product_code'],
            'product_name' => $row['product_name'],
            'description' => $row['description'],
            'category_id' => $row['category_id'] === null ? null : (int) $row['category_id'],
            'global_category_id' => ($row['global_category_id'] ?? null) === null ? null : (int) $row['global_category_id'],
            'category_name' => $row['category_name'],
            'brand_name' => $row['brand_name'],
            'barcode' => $row['barcode'],
            'unit' => [
                'id' => (int) $row['base_unit_id'],
                'name' => $row['unit_name'],
                'symbol' => $row['unit_symbol'],
                'quantity_precision' => (int) $row['quantity_precision'],
                'is_fraction_allowed' => (bool) $row['is_fraction_allowed'],
            ],
            'is_variant_product' => (bool) $row['is_variant_product'],
        ];
        if ($showPrices) {
            $product['selling_price'] = $row['selling_price'];
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $product;
        return $product;
    }


    private function productHashids(): Hashids
    {
        $salt = trim((string) (getenv('BBG_PUBLIC_ID_SALT') ?: getenv('AUTH_ACCESS_TOKEN_SECRET')));
        if (strlen($salt) < 32) {
            throw new \RuntimeException('BBG public product ID salt must contain at least 32 characters.');
        }
        return new Hashids($salt, 10);
    }

    private function decodePublicProductId(mixed $value): ?int
    {
        if (!is_string($value) && !is_int($value)) {
            return null;
        }
        $identifier = trim((string) $value);
        if ($identifier === '' || strlen($identifier) > 64) {
            return null;
        }
        if (ctype_digit($identifier)) {
            return $this->positiveInt($identifier);
        }
        $decoded = $this->productHashids()->decode($identifier);
        return count($decoded) === 1 && $decoded[0] > 0 ? (int) $decoded[0] : null;
    }

    private function productSlug(string $name): string
    {
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        return trim($slug, '-') ?: 'product';
    }

    private function businessSlug(mixed $value): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $slug = trim((string) $value);
        return $slug !== '' && strlen($slug) <= 200 ? $slug : null;
    }

    private function optionalPrice(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            return null;
        }
        $price = (float) $value;
        return is_finite($price) && $price >= 0 ? $price : null;
    }

    private function positiveInt(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $number = filter_var($value, FILTER_VALIDATE_INT);
        return $number !== false && $number > 0 ? (int) $number : null;
    }

    private function filterText(mixed $value, int $maxLength): string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return '';
        }
        return substr(trim((string) $value), 0, $maxLength);
    }

    private function propagateFailure(array $downstream, string $context): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $downstream['msgArr'][] = $context . ' returned a non-success response.';
        if (($downstream['status'] ?? '') === 'SUCCESS') {
            $downstream['status'] = 'FAILED';
            $downstream['data'] = [];
        }
        return $downstream;
    }
}
