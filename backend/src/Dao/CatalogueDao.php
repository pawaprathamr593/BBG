<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class CatalogueDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getActiveProductEntitlements(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT pe.entitlement_code, pe.entitlement_value
            FROM TENANT_SUBSCRIPTIONS ts
            INNER JOIN PLAN_ENTITLEMENTS pe ON pe.plan_id = ts.plan_id
                AND pe.entitlement_code IN ('catalogue.enabled', 'product.limit') AND pe.status = 'A'
            WHERE ts.tenant_id = :tenant_id AND ts.subscription_status = 'ACTIVE' AND ts.status = 'A'
                AND (ts.starts_on IS NULL OR ts.starts_on <= CURRENT_TIMESTAMP)
                AND (ts.ends_on IS NULL OR ts.ends_on >= CURRENT_TIMESTAMP)
            ORDER BY ts.starts_on DESC, ts.id DESC, pe.entitlement_code ASC",
            [':tenant_id' => $tenantId], 'getActiveProductEntitlements');
    }

    public function getUnits(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, unit_code, unit_name, unit_symbol, quantity_precision, is_fraction_allowed
            FROM UNITS_OF_MEASURE WHERE status = 'A' ORDER BY unit_name ASC, id ASC", [], 'getUnits');
    }

    public function getTenantCategories(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, parent_category_id, category_name, description, display_order
            FROM TENANT_PRODUCT_CATEGORIES WHERE tenant_id = :tenant_id AND status = 'A'
            ORDER BY display_order ASC, category_name ASC, id ASC", [':tenant_id' => $tenantId], 'getTenantCategories');
    }

    public function insertTenantCategory(ConnectionInterface $db, int $tenantId, string $name, string $description, ?int $parentId, int $displayOrder, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO TENANT_PRODUCT_CATEGORIES
                (tenant_id, parent_category_id, category_name, description, display_order, status, created_by, updated_by)
                VALUES (:tenant_id, :parent_id, :name, :description, :display_order, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':parent_id' => $parentId, ':name' => $name, ':description' => $description,
                 ':display_order' => $displayOrder, ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertTenantCategory', $exception);
        }
        return $resArr;
    }

    public function updateTenantCategory(ConnectionInterface $db, int $tenantId, int $categoryId, string $name, string $description, ?int $parentId, int $displayOrder, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE TENANT_PRODUCT_CATEGORIES
                SET category_name = :name, description = :description, parent_category_id = :parent_id,
                    display_order = :display_order, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND status = 'A'",
                [':name' => $name, ':description' => $description, ':parent_id' => $parentId,
                 ':display_order' => $displayOrder, ':user_id' => $userId,
                 ':id' => $categoryId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Tenant product category was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $categoryId];
        } catch (Throwable $exception) {
            return $this->error('updateTenantCategory', $exception);
        }
        return $resArr;
    }

    public function hasActiveProductsInCategory(ConnectionInterface $db, int $tenantId, int $categoryId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM PRODUCTS
            WHERE tenant_id = :tenant_id AND category_id = :category_id AND status = 'A' LIMIT 1",
            [':tenant_id' => $tenantId, ':category_id' => $categoryId], 'hasActiveProductsInCategory');
    }

    public function softDeleteTenantCategory(ConnectionInterface $db, int $tenantId, int $categoryId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE TENANT_PRODUCT_CATEGORIES SET status = 'Z',
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND status = 'A'",
                [':user_id' => $userId, ':id' => $categoryId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Tenant product category was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $categoryId];
        } catch (Throwable $exception) {
            return $this->error('softDeleteTenantCategory', $exception);
        }
        return $resArr;
    }

    public function isUnitAvailable(ConnectionInterface $db, int $unitId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM UNITS_OF_MEASURE WHERE id = :id AND status = 'A' LIMIT 1",
            [':id' => $unitId], 'isUnitAvailable');
    }

    public function isTenantCategoryAvailable(ConnectionInterface $db, int $tenantId, int $categoryId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM TENANT_PRODUCT_CATEGORIES
            WHERE id = :id AND tenant_id = :tenant_id AND status = 'A' LIMIT 1",
            [':id' => $categoryId, ':tenant_id' => $tenantId], 'isTenantCategoryAvailable');
    }

    public function getTenantProducts(ConnectionInterface $db, int $tenantId, string $search, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [':tenant_id' => $tenantId, ':limit' => $limit, ':offset' => $offset];
        $searchSql = '';
        if ($search !== '') {
            $params[':search_name'] = '%' . $search . '%';
            $params[':search_code'] = '%' . $search . '%';
            $searchSql = ' AND (p.product_name LIKE :search_name OR p.product_code LIKE :search_code)';
        }
        return $this->many($db, "SELECT p.id, p.product_code, p.product_name, p.description, p.category_id,
            pc.category_name, p.base_unit_id, u.unit_name, u.unit_symbol, p.brand_name, p.barcode,
            p.cost_price, p.selling_price, p.tax_rate, p.track_inventory, p.is_variant_product,
            p.publication_status, p.product_status,
            (SELECT pm.file_path FROM PRODUCT_MEDIA pm
                WHERE pm.tenant_id = p.tenant_id AND pm.product_id = p.id
                    AND pm.media_type = 'IMAGE' AND pm.status = 'A'
                ORDER BY pm.is_primary DESC, pm.display_order ASC, pm.id ASC LIMIT 1) AS primary_media_path
            FROM PRODUCTS p
            JOIN UNITS_OF_MEASURE u ON u.id = p.base_unit_id AND u.status = 'A'
            LEFT JOIN TENANT_PRODUCT_CATEGORIES pc ON pc.id = p.category_id
                AND pc.tenant_id = p.tenant_id AND pc.status = 'A'
            WHERE p.tenant_id = :tenant_id AND p.product_status = 'ACTIVE' AND p.status = 'A' " . $searchSql . "
            ORDER BY p.product_name ASC, p.id DESC LIMIT :limit OFFSET :offset",
            $params, 'getTenantProducts');
    }

    public function countTenantProducts(ConnectionInterface $db, int $tenantId, string $search): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [':tenant_id' => $tenantId];
        $searchSql = '';
        if ($search !== '') {
            $params[':search_name'] = '%' . $search . '%';
            $params[':search_code'] = '%' . $search . '%';
            $searchSql = ' AND (product_name LIKE :search_name OR product_code LIKE :search_code)';
        }
        return $this->one($db, "SELECT COUNT(*) AS total FROM PRODUCTS
            WHERE tenant_id = :tenant_id AND product_status = 'ACTIVE' AND status = 'A' " . $searchSql, $params, 'countTenantProducts');
    }

    public function getTenantProduct(ConnectionInterface $db, int $tenantId, int $productId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, product_code, product_name, description, category_id,
            global_category_id, base_unit_id, brand_name, barcode, cost_price, selling_price, tax_rate,
            track_inventory, is_variant_product, publication_status, product_status
            FROM PRODUCTS WHERE id = :id AND tenant_id = :tenant_id AND product_status = 'ACTIVE' AND status = 'A' LIMIT 1",
            [':id' => $productId, ':tenant_id' => $tenantId], 'getTenantProduct');
    }

    public function isProductCodeAvailable(ConnectionInterface $db, int $tenantId, string $productCode, int $excludeProductId = 0): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM PRODUCTS
            WHERE tenant_id = :tenant_id AND product_code = :product_code
                AND id <> :exclude_id AND status = 'A' LIMIT 1",
            [':tenant_id' => $tenantId, ':product_code' => $productCode, ':exclude_id' => $excludeProductId],
            'isProductCodeAvailable');
    }

    public function insertProduct(ConnectionInterface $db, int $tenantId, string $code, string $name, string $description, ?int $categoryId, ?int $globalCategoryId, int $unitId, string $brand, string $barcode, string $costPrice, string $sellingPrice, string $taxRate, int $trackInventory, int $isVariant, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO PRODUCTS
                (tenant_id, product_code, product_name, description, category_id, global_category_id,
                 base_unit_id, brand_name, barcode, cost_price, selling_price, tax_rate, track_inventory,
                 is_variant_product, publication_status, product_status, status, created_by, updated_by)
                VALUES (:tenant_id, :code, :name, :description, :category_id, :global_category_id,
                 :unit_id, :brand, :barcode, :cost_price, :selling_price, :tax_rate, :track_inventory,
                 :is_variant, 'DRAFT', 'ACTIVE', 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':code' => $code, ':name' => $name, ':description' => $description,
                 ':category_id' => $categoryId, ':global_category_id' => $globalCategoryId, ':unit_id' => $unitId,
                 ':brand' => $brand, ':barcode' => $barcode, ':cost_price' => $costPrice,
                 ':selling_price' => $sellingPrice, ':tax_rate' => $taxRate, ':track_inventory' => $trackInventory,
                 ':is_variant' => $isVariant, ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertProduct', $exception);
        }
        return $resArr;
    }

    public function updateProduct(ConnectionInterface $db, int $tenantId, int $productId, string $code, string $name, string $description, ?int $categoryId, ?int $globalCategoryId, int $unitId, string $brand, string $barcode, string $costPrice, string $sellingPrice, string $taxRate, int $trackInventory, int $isVariant, string $publicationStatus, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE PRODUCTS SET product_code = :code, product_name = :name,
                description = :description, category_id = :category_id, global_category_id = :global_category_id,
                base_unit_id = :unit_id, brand_name = :brand, barcode = :barcode, cost_price = :cost_price,
                selling_price = :selling_price, tax_rate = :tax_rate, track_inventory = :track_inventory,
                is_variant_product = :is_variant, publication_status = :publication_status,
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND status = 'A'",
                [':code' => $code, ':name' => $name, ':description' => $description,
                 ':category_id' => $categoryId, ':global_category_id' => $globalCategoryId, ':unit_id' => $unitId,
                 ':brand' => $brand, ':barcode' => $barcode, ':cost_price' => $costPrice,
                 ':selling_price' => $sellingPrice, ':tax_rate' => $taxRate, ':track_inventory' => $trackInventory,
                 ':is_variant' => $isVariant, ':publication_status' => $publicationStatus,
                 ':user_id' => $userId, ':id' => $productId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Tenant product was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $productId];
        } catch (Throwable $exception) {
            return $this->error('updateProduct', $exception);
        }
        return $resArr;
    }

    public function softDeleteProduct(ConnectionInterface $db, int $tenantId, int $productId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE PRODUCTS SET status = 'Z', product_status = 'INACTIVE',
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND status = 'A'",
                [':user_id' => $userId, ':id' => $productId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Tenant product was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $productId];
        } catch (Throwable $exception) {
            return $this->error('softDeleteProduct', $exception);
        }
        return $resArr;
    }

    public function getProductMedia(ConnectionInterface $db, int $tenantId, int $productId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, variant_id, media_type, mime_type, file_path, original_file_name,
            file_size_bytes, alt_text, caption, thumbnail_path, width_px, height_px, display_order, is_primary, media_status
            FROM PRODUCT_MEDIA WHERE tenant_id = :tenant_id AND product_id = :product_id AND status = 'A'
            ORDER BY display_order ASC, id ASC",
            [':tenant_id' => $tenantId, ':product_id' => $productId], 'getProductMedia');
    }

    public function softDeleteAllProductMedia(ConnectionInterface $db, int $tenantId, int $productId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE PRODUCT_MEDIA SET status = 'Z', media_status = 'INACTIVE',
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND product_id = :product_id AND status = 'A'",
                [':user_id' => $userId, ':tenant_id' => $tenantId, ':product_id' => $productId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['deleted_count' => $affected];
        } catch (Throwable $exception) {
            return $this->error('softDeleteAllProductMedia', $exception);
        }
        return $resArr;
    }

    public function getProductMediaRecord(ConnectionInterface $db, int $tenantId, int $productId, int $mediaId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, file_path, thumbnail_path
            FROM PRODUCT_MEDIA
            WHERE id = :media_id AND tenant_id = :tenant_id
                AND product_id = :product_id AND status = 'A'
            LIMIT 1",
            [':media_id' => $mediaId, ':tenant_id' => $tenantId, ':product_id' => $productId],
            'getProductMediaRecord');
    }

    public function lockTenantProduct(ConnectionInterface $db, int $tenantId, int $productId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM PRODUCTS
            WHERE id = :product_id AND tenant_id = :tenant_id AND status = 'A'
            LIMIT 1 FOR UPDATE",
            [':product_id' => $productId, ':tenant_id' => $tenantId], 'lockTenantProduct');
    }

    public function getTenantProductVariant(ConnectionInterface $db, int $tenantId, int $productId, int $variantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM PRODUCT_VARIANTS
            WHERE id = :variant_id AND product_id = :product_id
                AND tenant_id = :tenant_id AND status = 'A' LIMIT 1",
            [':variant_id' => $variantId, ':product_id' => $productId, ':tenant_id' => $tenantId],
            'getTenantProductVariant');
    }

    public function clearPrimaryProductMedia(ConnectionInterface $db, int $tenantId, int $productId, ?int $variantId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("UPDATE PRODUCT_MEDIA SET is_primary = 0,
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND product_id = :product_id AND status = 'A'
                    AND ((:variant_is_null = 1 AND variant_id IS NULL)
                        OR (:variant_is_null = 0 AND variant_id = :variant_id))",
                [':user_id' => $userId, ':tenant_id' => $tenantId, ':product_id' => $productId,
                 ':variant_is_null' => $variantId === null ? 1 : 0, ':variant_id' => $variantId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['product_id' => $productId];
        } catch (Throwable $exception) {
            return $this->error('clearPrimaryProductMedia', $exception);
        }
        return $resArr;
    }

    public function insertProductMedia(
        ConnectionInterface $db,
        int $tenantId,
        int $productId,
        ?int $variantId,
        string $mediaType,
        string $mimeType,
        string $filePath,
        string $originalFileName,
        int $fileSizeBytes,
        ?string $altText,
        ?string $caption,
        ?string $thumbnailPath,
        ?int $widthPx,
        ?int $heightPx,
        int $displayOrder,
        int $isPrimary,
        int $userId,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO PRODUCT_MEDIA
                (tenant_id, product_id, variant_id, media_type, mime_type, file_path,
                 original_file_name, file_size_bytes, alt_text, caption, thumbnail_path,
                 width_px, height_px, display_order, is_primary, media_status,
                 status, created_by, updated_by)
                VALUES (:tenant_id, :product_id, :variant_id, :media_type, :mime_type, :file_path,
                 :original_name, :file_size, :alt_text, :caption, :thumbnail_path,
                 :width_px, :height_px, :display_order, :is_primary, 'ACTIVE',
                 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':product_id' => $productId, ':variant_id' => $variantId,
                 ':media_type' => $mediaType, ':mime_type' => $mimeType, ':file_path' => $filePath,
                 ':original_name' => $originalFileName, ':file_size' => $fileSizeBytes,
                 ':alt_text' => $altText, ':caption' => $caption, ':thumbnail_path' => $thumbnailPath,
                 ':width_px' => $widthPx, ':height_px' => $heightPx, ':display_order' => $displayOrder,
                 ':is_primary' => $isPrimary, ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertProductMedia', $exception);
        }
        return $resArr;
    }

    public function softDeleteProductMedia(ConnectionInterface $db, int $tenantId, int $productId, int $mediaId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE PRODUCT_MEDIA SET status = 'Z', media_status = 'INACTIVE',
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :media_id AND product_id = :product_id AND tenant_id = :tenant_id AND status = 'A'",
                [':user_id' => $userId, ':media_id' => $mediaId, ':product_id' => $productId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Product media was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $mediaId];
        } catch (Throwable $exception) {
            return $this->error('softDeleteProductMedia', $exception);
        }
        return $resArr;
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
        $this->logger->error('CatalogueDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Catalogue data operation failed.';
        return $resArr;
    }
}
