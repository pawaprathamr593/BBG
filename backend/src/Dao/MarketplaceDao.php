<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class MarketplaceDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getBusinesses(
        ConnectionInterface $db,
        string $search = '',
        string $city = '',
        string $state = '',
        ?int $categoryId = null,
        int $limit = 20,
        int $offset = 0,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $filters = ['search' => $search, 'city' => $city, 'state' => $state, 'category_id' => $categoryId];
        $params = $this->publicBusinessParams($filters);
        $params[':limit'] = $limit;
        $params[':offset'] = $offset;
        return $this->many(
            $db,
            "SELECT bp.id, bp.tenant_id, bp.business_name, bp.business_slug,
                    bp.business_description, bp.primary_category_id,
                    c.category_name, bp.business_phone, bp.whatsapp_number,
                    bp.business_email, bp.logo_path, bp.cover_image_path,
                    bp.city, bp.state, bp.postal_code,
                    ss.show_prices, ss.accept_online_orders, ss.whatsapp_enabled
             FROM BUSINESS_PROFILES bp
             JOIN TENANTS t ON t.id = bp.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = bp.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             LEFT JOIN CATEGORIES c ON c.id = bp.primary_category_id AND c.status = 'A'
             WHERE " . $this->publicBusinessWhere($filters) . "
             ORDER BY bp.business_name ASC, bp.id ASC
             LIMIT :limit OFFSET :offset",
            $params,
            'getBusinesses',
        );
    }

    public function countBusinesses(
        ConnectionInterface $db,
        string $search = '',
        string $city = '',
        string $state = '',
        ?int $categoryId = null,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $filters = ['search' => $search, 'city' => $city, 'state' => $state, 'category_id' => $categoryId];
        return $this->one(
            $db,
            "SELECT COUNT(*) AS total
             FROM BUSINESS_PROFILES bp
             JOIN TENANTS t ON t.id = bp.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = bp.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             LEFT JOIN CATEGORIES c ON c.id = bp.primary_category_id AND c.status = 'A'
             WHERE " . $this->publicBusinessWhere($filters),
            $this->publicBusinessParams($filters),
            'countBusinesses',
        );
    }

    public function getBusinessBySlug(ConnectionInterface $db, string $slug): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT bp.id, bp.tenant_id, bp.business_name, bp.business_slug,
                    bp.business_description, bp.primary_category_id,
                    c.category_name, bp.business_phone, bp.whatsapp_number,
                    bp.business_email, bp.logo_path, bp.cover_image_path,
                    bp.address_line_1, bp.address_line_2, bp.city, bp.state,
                    bp.postal_code, bp.country_code, bp.latitude, bp.longitude,
                    t.default_currency,
                    ss.storefront_title, ss.storefront_description, ss.theme_code,
                    ss.show_prices, ss.accept_online_orders, ss.whatsapp_enabled
             FROM BUSINESS_PROFILES bp
             JOIN TENANTS t ON t.id = bp.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = bp.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             LEFT JOIN CATEGORIES c ON c.id = bp.primary_category_id AND c.status = 'A'
             WHERE bp.business_slug = :slug
                AND bp.approval_status = 'APPROVED'
                AND bp.publication_status = 'PUBLISHED'
                AND bp.status = 'A'
             LIMIT 1",
            [':slug' => $slug],
            'getBusinessBySlug',
        );
    }

    public function getProducts(ConnectionInterface $db, string $slug, string $search = '', int $limit = 20, int $offset = 0): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [':slug' => $slug, ':limit' => $limit, ':offset' => $offset];
        $searchSql = '';
        if ($search !== '') {
            $params[':search_name'] = '%' . $search . '%';
            $params[':search_code'] = '%' . $search . '%';
            $searchSql = ' AND (p.product_name LIKE :search_name OR p.product_code LIKE :search_code)';
        }

        return $this->many(
            $db,
            "SELECT p.id, p.tenant_id, p.product_code, p.product_name, p.description,
                    p.category_id, pc.category_name, p.brand_name, p.barcode,
                    p.selling_price, p.base_unit_id, u.unit_name, u.unit_symbol,
                    u.quantity_precision, u.is_fraction_allowed,
                    p.is_variant_product, ss.show_prices
             FROM PRODUCTS p
             JOIN BUSINESS_PROFILES bp ON bp.tenant_id = p.tenant_id
                AND bp.business_slug = :slug
                AND bp.approval_status = 'APPROVED'
                AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
             JOIN TENANTS t ON t.id = p.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = p.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             JOIN UNITS_OF_MEASURE u ON u.id = p.base_unit_id AND u.status = 'A'
             LEFT JOIN TENANT_PRODUCT_CATEGORIES pc ON pc.id = p.category_id
                AND pc.tenant_id = p.tenant_id AND pc.status = 'A'
             WHERE p.product_status = 'ACTIVE'
                AND p.publication_status = 'PUBLISHED' AND p.status = 'A'
                " . $searchSql . "
             ORDER BY p.product_name ASC, p.id ASC
             LIMIT :limit OFFSET :offset",
            $params,
            'getProducts',
        );
    }

    public function countProducts(ConnectionInterface $db, string $slug, string $search = ''): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [':slug' => $slug];
        $searchSql = '';
        if ($search !== '') {
            $params[':search_name'] = '%' . $search . '%';
            $params[':search_code'] = '%' . $search . '%';
            $searchSql = ' AND (p.product_name LIKE :search_name OR p.product_code LIKE :search_code)';
        }

        return $this->one(
            $db,
            "SELECT COUNT(*) AS total
             FROM PRODUCTS p
             JOIN BUSINESS_PROFILES bp ON bp.tenant_id = p.tenant_id
                AND bp.business_slug = :slug
                AND bp.approval_status = 'APPROVED'
                AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
             JOIN TENANTS t ON t.id = p.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = p.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             JOIN UNITS_OF_MEASURE u ON u.id = p.base_unit_id AND u.status = 'A'
             WHERE p.product_status = 'ACTIVE'
                AND p.publication_status = 'PUBLISHED' AND p.status = 'A'
                " . $searchSql,
            $params,
            'countProducts',
        );
    }

    public function getProductById(ConnectionInterface $db, string $slug, int $productId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT p.id, p.tenant_id, p.product_code, p.product_name, p.description,
                    p.category_id, pc.category_name, p.brand_name, p.barcode,
                    p.selling_price, p.base_unit_id, u.unit_name, u.unit_symbol,
                    u.quantity_precision, u.is_fraction_allowed,
                    p.is_variant_product, ss.show_prices
             FROM PRODUCTS p
             JOIN BUSINESS_PROFILES bp ON bp.tenant_id = p.tenant_id
                AND bp.business_slug = :slug
                AND bp.approval_status = 'APPROVED'
                AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
             JOIN TENANTS t ON t.id = p.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = p.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             JOIN UNITS_OF_MEASURE u ON u.id = p.base_unit_id AND u.status = 'A'
             LEFT JOIN TENANT_PRODUCT_CATEGORIES pc ON pc.id = p.category_id
                AND pc.tenant_id = p.tenant_id AND pc.status = 'A'
             WHERE p.id = :product_id
                AND p.product_status = 'ACTIVE'
                AND p.publication_status = 'PUBLISHED' AND p.status = 'A'
             LIMIT 1",
            [':slug' => $slug, ':product_id' => $productId],
            'getProductById',
        );
    }

    public function getProductVariants(ConnectionInterface $db, int $tenantId, int $productId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many(
            $db,
            "SELECT pv.id, pv.variant_code, pv.variant_name, pv.barcode,
                    pv.selling_price, pv.unit_id, u.unit_name, u.unit_symbol,
                    u.quantity_precision, u.is_fraction_allowed
             FROM PRODUCT_VARIANTS pv
             JOIN PRODUCTS p ON p.id = pv.product_id AND p.tenant_id = pv.tenant_id
                AND p.status = 'A'
             LEFT JOIN UNITS_OF_MEASURE u ON u.id = COALESCE(pv.unit_id, p.base_unit_id)
                AND u.status = 'A'
             WHERE pv.tenant_id = :tenant_id AND pv.product_id = :product_id
                AND pv.variant_status = 'ACTIVE' AND pv.status = 'A'
             ORDER BY pv.variant_name ASC, pv.id ASC",
            [':tenant_id' => $tenantId, ':product_id' => $productId],
            'getProductVariants',
        );
    }

    public function getPublicCategories(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many(
            $db,
            "SELECT id, parent_category_id, category_code, category_name, category_type,
                    description, display_order
             FROM CATEGORIES
             WHERE category_status = 'ACTIVE' AND status = 'A'
             ORDER BY display_order ASC, category_name ASC, id ASC",
            [],
            'getPublicCategories',
        );
    }

    public function getPublicPromotions(ConnectionInterface $db, ?int $tenantId = null, int $limit = 20, int $offset = 0): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [':limit' => $limit, ':offset' => $offset];
        $tenantFilter = '';
        if ($tenantId !== null) {
            $tenantFilter = ' AND pp.tenant_id = :tenant_id';
            $params[':tenant_id'] = $tenantId;
        }
        return $this->many(
            $db,
            "SELECT pp.id, pp.tenant_id, pp.post_title, pp.post_content, pp.published_on,
                    pp.valid_until, bp.business_name, bp.business_slug, bp.logo_path
             FROM PROMOTIONAL_POSTS pp
             JOIN BUSINESS_PROFILES bp ON bp.tenant_id = pp.tenant_id
                AND bp.approval_status = 'APPROVED'
                AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
             JOIN TENANTS t ON t.id = pp.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = pp.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             WHERE pp.publication_status = 'PUBLISHED'
                AND pp.published_on <= CURRENT_TIMESTAMP
                AND (pp.valid_until IS NULL OR pp.valid_until >= CURRENT_TIMESTAMP)
                AND pp.status = 'A' " . $tenantFilter . "
             ORDER BY pp.published_on DESC, pp.id DESC
             LIMIT :limit OFFSET :offset",
            $params,
            'getPublicPromotions',
        );
    }

    public function countPublicPromotions(ConnectionInterface $db, ?int $tenantId = null): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [];
        $tenantFilter = '';
        if ($tenantId !== null) {
            $tenantFilter = ' AND pp.tenant_id = :tenant_id';
            $params[':tenant_id'] = $tenantId;
        }
        return $this->one(
            $db,
            "SELECT COUNT(*) AS total
             FROM PROMOTIONAL_POSTS pp
             JOIN BUSINESS_PROFILES bp ON bp.tenant_id = pp.tenant_id
                AND bp.approval_status = 'APPROVED'
                AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
             JOIN TENANTS t ON t.id = pp.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = pp.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             WHERE pp.publication_status = 'PUBLISHED'
                AND pp.published_on <= CURRENT_TIMESTAMP
                AND (pp.valid_until IS NULL OR pp.valid_until >= CURRENT_TIMESTAMP)
                AND pp.status = 'A' " . $tenantFilter,
            $params,
            'countPublicPromotions',
        );
    }

    public function getPublicPromotionById(ConnectionInterface $db, int $promotionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT pp.id, pp.tenant_id, pp.post_title, pp.post_content, pp.published_on,
                    pp.valid_until, bp.business_name, bp.business_slug, bp.logo_path
             FROM PROMOTIONAL_POSTS pp
             JOIN BUSINESS_PROFILES bp ON bp.tenant_id = pp.tenant_id
                AND bp.approval_status = 'APPROVED'
                AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
             JOIN TENANTS t ON t.id = pp.tenant_id
                AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = pp.tenant_id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
             WHERE pp.id = :id AND pp.publication_status = 'PUBLISHED'
                AND pp.published_on <= CURRENT_TIMESTAMP
                AND (pp.valid_until IS NULL OR pp.valid_until >= CURRENT_TIMESTAMP)
                AND pp.status = 'A'
             LIMIT 1",
            [':id' => $promotionId],
            'getPublicPromotionById',
        );
    }

    public function getPublicPromotionMedia(ConnectionInterface $db, int $tenantId, int $promotionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many(
            $db,
            "SELECT id, file_path, media_type, display_order
             FROM POST_MEDIA
             WHERE tenant_id = :tenant_id AND post_id = :post_id AND status = 'A'
             ORDER BY display_order ASC, id ASC",
            [':tenant_id' => $tenantId, ':post_id' => $promotionId],
            'getPublicPromotionMedia',
        );
    }

    private function publicBusinessWhere(array $filters): string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $where = "bp.approval_status = 'APPROVED'
            AND bp.publication_status = 'PUBLISHED'
            AND bp.status = 'A'";
        if ($filters['search'] !== '') {
            $where .= " AND (bp.business_name LIKE :search_name
                OR bp.business_description LIKE :search_description
                OR bp.city LIKE :search_city)";
        }
        if ($filters['city'] !== '') {
            $where .= ' AND bp.city LIKE :city';
        }
        if ($filters['state'] !== '') {
            $where .= ' AND bp.state LIKE :state';
        }
        if ($filters['category_id'] !== null) {
            $where .= ' AND bp.primary_category_id = :category_id';
        }
        return $where;
    }

    private function publicBusinessParams(array $filters): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [];
        if ($filters['search'] !== '') {
            $needle = '%' . $filters['search'] . '%';
            $params[':search_name'] = $needle;
            $params[':search_description'] = $needle;
            $params[':search_city'] = $needle;
        }
        if ($filters['city'] !== '') {
            $params[':city'] = '%' . $filters['city'] . '%';
        }
        if ($filters['state'] !== '') {
            $params[':state'] = '%' . $filters['state'] . '%';
        }
        if ($filters['category_id'] !== null) {
            $params[':category_id'] = $filters['category_id'];
        }
        return $params;
    }

    private function one(ConnectionInterface $db, string $sql, array $params, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $row = $db->createCommand($sql, $params)->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            return $this->error($operation, $exception);
        }
        return $resArr;
    }

    private function many(ConnectionInterface $db, string $sql, array $params, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $rows = $db->createCommand($sql, $params)->queryAll();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($rows) ? $rows : [];
        } catch (Throwable $exception) {
            return $this->error($operation, $exception);
        }
        return $resArr;
    }

    private function error(string $operation, Throwable $exception): array
    {
        $resArr = ['status' => 'EXCEPTION', 'msgArr' => [], 'data' => []];
        $this->logger->error('MarketplaceDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Marketplace data operation failed.';
        return $resArr;
    }
}
