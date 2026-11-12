<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\MarketplaceDao;
use App\Services\Interfaces\IMarketplaceServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class MarketplaceServices implements IMarketplaceServices
{
    public function __construct(
        private ConnectionInterface $db,
        private MarketplaceDao $dao,
        private LoggerInterface $logger,
    ) {}

    public function getMarketplace(array $param): array
    {
        if (!isset($param['actionType'], $param['actionData']) || !is_array($param['actionData'])) {
            return $this->failed('Invalid marketplace request envelope.');
        }
        if ($param['actionType'] !== 'getMarketplace') {
            return $this->failed('Unsupported actionType for getMarketplace.');
        }

        $data = $param['actionData'];
        try {
            return match ((string) ($data['action'] ?? '')) {
                'listBusinesses' => $this->listBusinesses($data),
                'getBusiness' => $this->getBusiness($data),
                'listProducts' => $this->listProducts($data),
                'getProduct' => $this->getProduct($data),
                default => $this->failed('Unsupported marketplace read action.'),
            };
        } catch (Throwable $exception) {
            $this->logger->error('MarketplaceServices::getMarketplace failed.', ['exception' => $exception]);
            return ['status' => 'EXCEPTION', 'msgArr' => ['Marketplace request failed unexpectedly.'], 'data' => []];
        }
    }

    private function listBusinesses(array $data): array
    {
        $page = $this->positiveInt($data['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($data['page_size'] ?? 20) ?? 20);
        $categoryId = null;
        if (isset($data['category_id']) && $data['category_id'] !== '') {
            $categoryId = $this->positiveInt($data['category_id']);
            if ($categoryId === null) {
                return $this->failed('A valid category_id is required.');
            }
        }

        $filters = [
            'search' => $this->filterText($data['search'] ?? '', 100),
            'city' => $this->filterText($data['city'] ?? '', 100),
            'state' => $this->filterText($data['state'] ?? '', 100),
            'category_id' => $categoryId,
        ];
        $rows = $this->dao->getBusinesses($this->db, $filters, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $rows;
        }
        $count = $this->dao->countBusinesses($this->db, $filters);
        if ($count['status'] !== 'SUCCESS') {
            return $count;
        }

        $items = array_map(fn (array $row): array => $this->publicBusiness($row, false), $rows['data']);
        return $this->ok([
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => (int) ($count['data']['total'] ?? 0),
            ],
        ]);
    }

    private function getBusiness(array $data): array
    {
        $slug = $this->businessSlug($data['business_slug'] ?? null);
        if ($slug === null) {
            return $this->failed('A valid business_slug is required.');
        }

        $result = $this->dao->getBusinessBySlug($this->db, $slug);
        if ($result['status'] !== 'SUCCESS') {
            return $result;
        }
        if ($result['data'] === []) {
            return $this->failed('Published business storefront was not found.');
        }

        $row = $result['data'];
        $business = $this->publicBusiness($row, true);
        $storefront = [
            'title' => $row['storefront_title'],
            'description' => $row['storefront_description'],
            'theme_code' => $row['theme_code'],
            'show_prices' => (bool) $row['show_prices'],
            'accept_online_orders' => (bool) $row['accept_online_orders'],
            'whatsapp_enabled' => (bool) $row['whatsapp_enabled'],
            'currency' => $row['default_currency'],
        ];

        return $this->ok(['business' => $business, 'storefront' => $storefront]);
    }

    private function listProducts(array $data): array
    {
        $slug = $this->businessSlug($data['business_slug'] ?? null);
        if ($slug === null) {
            return $this->failed('A valid business_slug is required.');
        }
        $business = $this->dao->getBusinessBySlug($this->db, $slug);
        if ($business['status'] !== 'SUCCESS') {
            return $business;
        }
        if ($business['data'] === []) {
            return $this->failed('Published business storefront was not found.');
        }

        $page = $this->positiveInt($data['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($data['page_size'] ?? 20) ?? 20);
        $search = $this->filterText($data['search'] ?? '', 100);
        $rows = $this->dao->getProducts($this->db, $slug, ['search' => $search], $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $rows;
        }
        $count = $this->dao->countProducts($this->db, $slug, $search);
        if ($count['status'] !== 'SUCCESS') {
            return $count;
        }

        $showPrices = (bool) $business['data']['show_prices'];
        $items = array_map(fn (array $row): array => $this->publicProduct($row, $showPrices), $rows['data']);
        return $this->ok([
            'business_slug' => $slug,
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total' => (int) ($count['data']['total'] ?? 0),
            ],
        ]);
    }

    private function getProduct(array $data): array
    {
        $slug = $this->businessSlug($data['business_slug'] ?? null);
        $productId = $this->positiveInt($data['product_id'] ?? null);
        if ($slug === null || $productId === null) {
            return $this->failed('Valid business_slug and product_id are required.');
        }

        $result = $this->dao->getProductById($this->db, $slug, $productId);
        if ($result['status'] !== 'SUCCESS') {
            return $result;
        }
        if ($result['data'] === []) {
            return $this->failed('Published product was not found in this storefront.');
        }

        $product = $result['data'];
        $showPrices = (bool) $product['show_prices'];
        $variants = [];
        if ((bool) $product['is_variant_product']) {
            $variantResult = $this->dao->getProductVariants($this->db, (int) $product['tenant_id'], $productId);
            if ($variantResult['status'] !== 'SUCCESS') {
                return $variantResult;
            }
            $variants = array_map(function (array $variant) use ($showPrices): array {
                if (!$showPrices) {
                    unset($variant['selling_price']);
                }
                return $variant;
            }, $variantResult['data']);
        }

        return $this->ok([
            'product' => $this->publicProduct($product, $showPrices),
            'variants' => $variants,
        ]);
    }

    private function publicBusiness(array $row, bool $includeAddress): array
    {
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
        return $business;
    }

    private function publicProduct(array $row, bool $showPrices): array
    {
        $product = [
            'id' => (int) $row['id'],
            'product_code' => $row['product_code'],
            'product_name' => $row['product_name'],
            'description' => $row['description'],
            'category_id' => $row['category_id'] === null ? null : (int) $row['category_id'],
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
        return $product;
    }

    private function businessSlug(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }
        $slug = trim((string) $value);
        return $slug !== '' && strlen($slug) <= 200 ? $slug : null;
    }

    private function positiveInt(mixed $value): ?int
    {
        $number = filter_var($value, FILTER_VALIDATE_INT);
        return $number !== false && $number > 0 ? (int) $number : null;
    }

    private function filterText(mixed $value, int $maxLength): string
    {
        if (!is_scalar($value)) {
            return '';
        }
        return substr(trim((string) $value), 0, $maxLength);
    }

    private function ok(array $data): array
    {
        return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => $data];
    }

    private function failed(string $message): array
    {
        return ['status' => 'FAILED', 'msgArr' => [$message], 'data' => []];
    }
}
