<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\CatalogueDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\ICatalogueServices;
use App\Utils\AwsS3Storage;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class CatalogueServices implements ICatalogueServices
{
    public function __construct(
        private ConnectionInterface $db,
        private CatalogueDao $dao,
        private TenantDao $tenantDao,
        private IAuthServices $authServices,
        private AwsS3Storage $s3Storage,
        private LoggerInterface $logger,
    ) {}

    public function getCatalogue(array $catalogueParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($catalogueParam['actionType'])) {
            $resArr['msgArr'][] = "Missing required key 'actionType'.";
            return $resArr;
        }
        if (!isset($catalogueParam['actionData']) || !is_array($catalogueParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $catalogueParam['actionData'];
        try {
            switch ((string) $catalogueParam['actionType']) {
                case 'listUnitsOfMeasure':
                    $resArr = $this->getUnitsOfMeasure($actionData);
                    break;
                case 'listTenantProductCategories':
                    $resArr = $this->getTenantProductCategories($actionData);
                    break;
                case 'listTenantProducts':
                    $resArr = $this->getTenantProducts($actionData);
                    break;
                case 'getTenantProduct':
                    $resArr = $this->getTenantProduct($actionData);
                    break;
                case 'listProductMedia':
                    $resArr = $this->getProductMedia($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported catalogue read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('CatalogueServices::getCatalogue failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Catalogue request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function manageCatalogue(array $catalogueParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($catalogueParam['actionType'])) {
            $resArr['msgArr'][] = "Missing required key 'actionType'.";
            return $resArr;
        }
        if (!isset($catalogueParam['actionData']) || !is_array($catalogueParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $catalogueParam['actionData'];
        try {
            switch ((string) $catalogueParam['actionType']) {
                case 'createTenantProductCategory':
                    $resArr = $this->manageTenantProductCategory($actionData, 'create');
                    break;
                case 'updateTenantProductCategory':
                    $resArr = $this->manageTenantProductCategory($actionData, 'update');
                    break;
                case 'deleteTenantProductCategory':
                    $resArr = $this->manageTenantProductCategory($actionData, 'delete');
                    break;
                case 'createTenantProduct':
                    $resArr = $this->manageTenantProduct($actionData, 'create');
                    break;
                case 'updateTenantProduct':
                    $resArr = $this->manageTenantProduct($actionData, 'update');
                    break;
                case 'deleteTenantProduct':
                    $resArr = $this->manageTenantProduct($actionData, 'delete');
                    break;
                case 'generateProductMediaUploadUrl':
                    $resArr = $this->generateProductMediaUploadUrl($actionData);
                    break;
                case 'linkProductMedia':
                    $resArr = $this->manageProductMedia($actionData, 'link');
                    break;
                case 'deleteProductMedia':
                    $resArr = $this->manageProductMedia($actionData, 'delete');
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported catalogue management action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('CatalogueServices::manageCatalogue failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Catalogue management failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getUnitsOfMeasure(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $result = $this->dao->getUnits($this->db);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'CatalogueServices::getUnitsOfMeasure');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $result['data']];
        return $resArr;
    }

    private function getTenantProductCategories(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::getTenantProductCategories');
        }
        $result = $this->dao->getTenantCategories($this->db, (int) $context['data']['tenant_id']);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'CatalogueServices::getTenantProductCategories');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $result['data']];
        return $resArr;
    }

    private function getTenantProducts(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::getTenantProducts');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $search = $this->filterText($actionData['search'] ?? '', 100);
        $rows = $this->dao->getTenantProducts($this->db, $tenantId, $search, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'CatalogueServices::getTenantProducts');
        }
        $count = $this->dao->countTenantProducts($this->db, $tenantId, $search);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'CatalogueServices::getTenantProducts');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $rows['data'],
            'pagination' => ['page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0)],
        ];
        return $resArr;
    }

    private function getTenantProduct(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::getTenantProduct');
        }
        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($productId === null) {
            $resArr['msgArr'][] = 'A valid product_id is required.';
            return $resArr;
        }
        $result = $this->dao->getTenantProduct($this->db, (int) $context['data']['tenant_id'], $productId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'CatalogueServices::getTenantProduct');
        }
        if ($result['data'] === []) {
            $resArr['msgArr'][] = 'Tenant product was not found.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function getProductMedia(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::getProductMedia');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($productId === null) {
            $resArr['msgArr'][] = 'A valid product_id is required.';
            return $resArr;
        }
        $product = $this->dao->getTenantProduct($this->db, $tenantId, $productId);
        if ($product['status'] !== 'SUCCESS' || $product['data'] === []) {
            return $this->propagateFailure($product, 'CatalogueServices::getProductMedia');
        }
        $media = $this->dao->getProductMedia($this->db, $tenantId, $productId);
        if ($media['status'] !== 'SUCCESS') {
            return $this->propagateFailure($media, 'CatalogueServices::getProductMedia');
        }

        foreach ($media['data'] as &$item) {
            $item['url'] = $this->s3Storage->createDownloadUrl((string) $item['file_path']);
            $item['thumbnail_url'] = !empty($item['thumbnail_path'])
                ? $this->s3Storage->createDownloadUrl((string) $item['thumbnail_path'])
                : null;
        }
        unset($item);

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $media['data']];
        return $resArr;
    }

    private function manageTenantProductCategory(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::manageTenantProductCategory');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $userId = (int) $context['data']['user_id'];
        $categoryId = $this->positiveInt($actionData['category_id'] ?? null);
        if ($operation !== 'create' && $categoryId === null) {
            $resArr['msgArr'][] = 'A valid category_id is required.';
            return $resArr;
        }
        if ($operation === 'delete') {
            $usage = $this->dao->hasActiveProductsInCategory($this->db, $tenantId, $categoryId);
            if ($usage['status'] !== 'SUCCESS') {
                return $this->propagateFailure($usage, 'CatalogueServices::manageTenantProductCategory');
            }
            if ($usage['data'] !== []) {
                $resArr['msgArr'][] = 'Category cannot be deleted while active products reference it.';
                return $resArr;
            }
            return $this->dao->softDeleteTenantCategory($this->db, $tenantId, $categoryId, $userId);
        }

        $name = $this->requiredText($actionData['category_name'] ?? '', 120);
        if ($name === null) {
            $resArr['msgArr'][] = 'category_name is required and must not exceed 120 characters.';
            return $resArr;
        }
        $description = $this->filterText($actionData['description'] ?? '', 500);
        $parentId = $this->positiveInt($actionData['parent_category_id'] ?? null);
        $displayOrder = $this->integerValue($actionData['display_order'] ?? 0);
        if ($displayOrder === null || $displayOrder < 0 || ($parentId !== null && $categoryId !== null && $parentId === $categoryId)) {
            $resArr['msgArr'][] = 'Invalid display_order or parent_category_id.';
            return $resArr;
        }
        if ($parentId !== null) {
            $parent = $this->dao->isTenantCategoryAvailable($this->db, $tenantId, $parentId);
            if ($parent['status'] !== 'SUCCESS' || $parent['data'] === []) {
                return $this->propagateFailure($parent, 'CatalogueServices::manageTenantProductCategory');
            }
        }
        if ($operation === 'create') {
            return $this->dao->insertTenantCategory($this->db, $tenantId, $name, $description, $parentId, $displayOrder, $userId);
        }
        return $this->dao->updateTenantCategory($this->db, $tenantId, $categoryId, $name, $description, $parentId, $displayOrder, $userId);
    }

    private function manageTenantProduct(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::manageTenantProduct');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $userId = (int) $context['data']['user_id'];
        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($operation === 'delete') {
            if ($productId === null) {
                $resArr['msgArr'][] = 'A valid product_id is required.';
                return $resArr;
            }
            return $this->dao->softDeleteProduct($this->db, $tenantId, $productId, $userId);
        }
        if ($operation === 'update' && $productId === null) {
            $resArr['msgArr'][] = 'A valid product_id is required.';
            return $resArr;
        }

        $code = $this->requiredText($actionData['product_code'] ?? '', 80);
        $name = $this->requiredText($actionData['product_name'] ?? '', 180);
        $unitId = $this->positiveInt($actionData['base_unit_id'] ?? null);
        if ($code === null || $name === null || $unitId === null) {
            $resArr['msgArr'][] = 'product_code, product_name and base_unit_id are required.';
            return $resArr;
        }
        $unit = $this->dao->isUnitAvailable($this->db, $unitId);
        if ($unit['status'] !== 'SUCCESS' || $unit['data'] === []) {
            return $this->propagateFailure($unit, 'CatalogueServices::manageTenantProduct');
        }
        $categoryId = $this->positiveInt($actionData['category_id'] ?? null);
        if ($categoryId !== null) {
            $category = $this->dao->isTenantCategoryAvailable($this->db, $tenantId, $categoryId);
            if ($category['status'] !== 'SUCCESS' || $category['data'] === []) {
                return $this->propagateFailure($category, 'CatalogueServices::manageTenantProduct');
            }
        }
        $priceValues = [
            (string) ($actionData['cost_price'] ?? '0'),
            (string) ($actionData['selling_price'] ?? '0'),
            (string) ($actionData['tax_rate'] ?? '0'),
        ];
        foreach ($priceValues as $value) {
            if (!is_numeric($value) || (float) $value < 0) {
                $resArr['msgArr'][] = 'Product prices and tax_rate must be non-negative numeric values.';
                return $resArr;
            }
        }
        if ((float) $priceValues[2] > 100) {
            $resArr['msgArr'][] = 'tax_rate cannot exceed 100.';
            return $resArr;
        }
        $publicationStatus = strtoupper($this->filterText($actionData['publication_status'] ?? 'DRAFT', 20));
        if (!in_array($publicationStatus, ['DRAFT', 'PUBLISHED'], true)) {
            $resArr['msgArr'][] = 'publication_status must be DRAFT or PUBLISHED.';
            return $resArr;
        }
        $codeCheck = $this->dao->isProductCodeAvailable($this->db, $tenantId, $code, $productId ?? 0);
        if ($codeCheck['status'] !== 'SUCCESS') {
            return $this->propagateFailure($codeCheck, 'CatalogueServices::manageTenantProduct');
        }
        if ($codeCheck['data'] !== []) {
            $resArr['msgArr'][] = 'product_code is already in use within this tenant.';
            return $resArr;
        }
        $description = $this->filterText($actionData['description'] ?? '', 5000);
        $brand = $this->filterText($actionData['brand_name'] ?? '', 120);
        $barcode = $this->filterText($actionData['barcode'] ?? '', 100);
        $globalCategoryId = $this->positiveInt($actionData['global_category_id'] ?? null);
        if ($operation === 'create') {
            $limitResult = $this->dao->getActiveProductLimit($this->db, $tenantId);
            if ($limitResult['status'] !== 'SUCCESS') {
                return $this->propagateFailure($limitResult, 'CatalogueServices::manageTenantProduct');
            }
            if ($limitResult['data'] === []) {
                $resArr['msgArr'][] = 'An active subscription with PRODUCT_LIMIT entitlement is required to create products.';
                return $resArr;
            }
            $limitValue = strtoupper((string) ($limitResult['data']['entitlement_value'] ?? ''));
            $count = $this->dao->countTenantProducts($this->db, $tenantId, '');
            if ($count['status'] !== 'SUCCESS') {
                return $this->propagateFailure($count, 'CatalogueServices::manageTenantProduct');
            }
            if ($limitValue !== 'UNLIMITED' && (!is_numeric($limitValue) || (int) $count['data']['total'] >= (int) $limitValue)) {
                $resArr['msgArr'][] = 'The active subscription product limit has been reached or is not configured correctly.';
                return $resArr;
            }
            return $this->dao->insertProduct(
                $this->db, $tenantId, $code, $name, $description, $categoryId, $globalCategoryId, $unitId,
                $brand, $barcode, $priceValues[0], $priceValues[1], $priceValues[2], 0, 0, $userId,
            );
        }
        $existing = $this->dao->getTenantProduct($this->db, $tenantId, $productId);
        if ($existing['status'] !== 'SUCCESS' || $existing['data'] === []) {
            return $this->propagateFailure($existing, 'CatalogueServices::manageTenantProduct');
        }
        if ($publicationStatus === 'PUBLISHED' && ($existing['data']['publication_status'] ?? '') !== 'PUBLISHED') {
            $limitResult = $this->dao->getActiveProductLimit($this->db, $tenantId);
            if ($limitResult['status'] !== 'SUCCESS') {
                return $this->propagateFailure($limitResult, 'CatalogueServices::manageTenantProduct');
            }
            if ($limitResult['data'] === []) {
                $resArr['msgArr'][] = 'An active subscription with PRODUCT_LIMIT entitlement is required to publish products.';
                return $resArr;
            }
            $limitValue = strtoupper((string) ($limitResult['data']['entitlement_value'] ?? ''));
            $count = $this->dao->countTenantProducts($this->db, $tenantId, '');
            if ($count['status'] !== 'SUCCESS') {
                return $this->propagateFailure($count, 'CatalogueServices::manageTenantProduct');
            }
            if ($limitValue !== 'UNLIMITED' && (!is_numeric($limitValue) || (int) $count['data']['total'] > (int) $limitValue)) {
                $resArr['msgArr'][] = 'The active subscription product limit is exceeded or is not configured correctly.';
                return $resArr;
            }
        }
        return $this->dao->updateProduct(
            $this->db, $tenantId, $productId, $code, $name, $description, $categoryId, $globalCategoryId,
            $unitId, $brand, $barcode, $priceValues[0], $priceValues[1], $priceValues[2], 0, 0,
            $publicationStatus, $userId,
        );
    }

    private function generateProductMediaUploadUrl(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::generateProductMediaUploadUrl');
        }

        $tenantId = (int) $context['data']['tenant_id'];
        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        $fileName = $this->requiredText($actionData['original_file_name'] ?? '', 255);
        $mimeType = strtolower($this->requiredText($actionData['mime_type'] ?? '', 100) ?? '');
        $fileSize = $this->integerValue($actionData['file_size_bytes'] ?? null);
        $variantId = $this->positiveInt($actionData['variant_id'] ?? null);
        $mimeExtensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

        if ($productId === null || $fileName === null || !isset($mimeExtensions[$mimeType])
            || $fileSize === null || $fileSize < 1 || $fileSize > $this->s3Storage->getMaxUploadBytes()) {
            $resArr['msgArr'][] = 'A valid product_id, image file name, supported image MIME type and permitted file_size_bytes are required.';
            return $resArr;
        }

        $product = $this->dao->getTenantProduct($this->db, $tenantId, $productId);
        if ($product['status'] !== 'SUCCESS' || $product['data'] === []) {
            return $this->propagateFailure($product, 'CatalogueServices::generateProductMediaUploadUrl');
        }
        if ($variantId !== null) {
            $variant = $this->dao->getTenantProductVariant($this->db, $tenantId, $productId, $variantId);
            if ($variant['status'] !== 'SUCCESS' || $variant['data'] === []) {
                return $this->propagateFailure($variant, 'CatalogueServices::generateProductMediaUploadUrl');
            }
        }

        $key = 'tenants/' . $tenantId . '/products/' . $productId . '/'
            . ($variantId === null ? '' : 'variants/' . $variantId . '/')
            . bin2hex(random_bytes(16)) . '.' . $mimeExtensions[$mimeType];
        $presigned = $this->s3Storage->createUploadUrl($key, $mimeType);

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'upload_url' => $presigned['url'],
            'object_key' => $key,
            'method' => 'PUT',
            'headers' => ['Content-Type' => $mimeType],
            'expires_in' => $presigned['expires_in'],
        ];
        return $resArr;
    }

    private function manageProductMedia(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::manageProductMedia');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $userId = (int) $context['data']['user_id'];
        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($productId === null) {
            $resArr['msgArr'][] = 'A valid product_id is required.';
            return $resArr;
        }
        $product = $this->dao->getTenantProduct($this->db, $tenantId, $productId);
        if ($product['status'] !== 'SUCCESS' || $product['data'] === []) {
            return $this->propagateFailure($product, 'CatalogueServices::manageProductMedia');
        }
        if ($operation === 'delete') {
            $mediaId = $this->positiveInt($actionData['media_id'] ?? null);
            if ($mediaId === null) {
                $resArr['msgArr'][] = 'A valid media_id is required.';
                return $resArr;
            }
            $record = $this->dao->getProductMediaRecord($this->db, $tenantId, $productId, $mediaId);
            if ($record['status'] !== 'SUCCESS' || $record['data'] === []) {
                return $this->propagateFailure($record, 'CatalogueServices::manageProductMedia');
            }
            $deleted = $this->dao->softDeleteProductMedia($this->db, $tenantId, $productId, $mediaId, $userId);
            if ($deleted['status'] !== 'SUCCESS') {
                return $deleted;
            }
            try {
                $this->s3Storage->deleteObject((string) $record['data']['file_path']);
                if (!empty($record['data']['thumbnail_path'])) {
                    $this->s3Storage->deleteObject((string) $record['data']['thumbnail_path']);
                }
            } catch (Throwable $exception) {
                $this->logger->warning('Product media was soft-deleted but S3 cleanup failed.', [
                    'tenant_id' => $tenantId,
                    'product_id' => $productId,
                    'media_id' => $mediaId,
                    'exception' => $exception,
                ]);
            }
            return $deleted;
        }

        $filePath = $this->requiredText($actionData['file_path'] ?? '', 500);
        $originalName = $this->requiredText($actionData['original_file_name'] ?? '', 255);
        $mimeType = strtolower($this->requiredText($actionData['mime_type'] ?? '', 100) ?? '');
        $fileSize = $this->integerValue($actionData['file_size_bytes'] ?? null);
        $mediaType = strtoupper($this->filterText($actionData['media_type'] ?? 'IMAGE', 20));
        $displayOrder = $this->integerValue($actionData['display_order'] ?? 0);
        $isPrimary = $this->booleanValue($actionData['is_primary'] ?? false);
        $variantId = $this->positiveInt($actionData['variant_id'] ?? null);
        $width = $this->positiveInt($actionData['width_px'] ?? null);
        $height = $this->positiveInt($actionData['height_px'] ?? null);
        $thumbnailPath = $this->optionalText($actionData['thumbnail_path'] ?? null, 500);
        $altText = $this->optionalText($actionData['alt_text'] ?? null, 255);
        $caption = $this->optionalText($actionData['caption'] ?? null, 500);
        $expectedPrefix = 'tenants/' . $tenantId . '/products/' . $productId . '/';
        if ($filePath === null || $originalName === null || $fileSize === null || $fileSize < 0
            || $displayOrder === null || $displayOrder < 0 || $isPrimary === null
            || $mediaType !== 'IMAGE' || !in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)
            || !str_starts_with($filePath, $expectedPrefix) || str_contains($filePath, '..')
            || str_starts_with($filePath, '/') || preg_match('/^[a-z]+:\/\//i', $filePath)
        ) {
            $resArr['msgArr'][] = 'Valid stored image metadata and a tenant-scoped relative file_path are required.';
            return $resArr;
        }
        if ($thumbnailPath !== null && (
            !str_starts_with($thumbnailPath, $expectedPrefix) || str_contains($thumbnailPath, '..')
            || str_starts_with($thumbnailPath, '/') || preg_match('/^[a-z]+:\/\//i', $thumbnailPath)
        )) {
            $resArr['msgArr'][] = 'thumbnail_path must be a product-scoped relative S3 object key.';
            return $resArr;
        }
        if ($thumbnailPath !== null) {
            $thumbnailObject = $this->s3Storage->headObject($thumbnailPath);
            $thumbnailMime = strtolower((string) ($thumbnailObject['ContentType'] ?? ''));
            $thumbnailSize = (int) ($thumbnailObject['ContentLength'] ?? 0);
            $thumbnailSignature = $this->s3Storage->getObjectPrefix($thumbnailPath);
            $thumbnailValid = match ($thumbnailMime) {
                'image/jpeg' => str_starts_with($thumbnailSignature, "\xFF\xD8\xFF"),
                'image/png' => str_starts_with($thumbnailSignature, "\x89PNG\r\n\x1A\n"),
                'image/webp' => str_starts_with($thumbnailSignature, 'RIFF')
                    && substr($thumbnailSignature, 8, 4) === 'WEBP',
                default => false,
            };
            if (!$thumbnailValid || $thumbnailSize < 1 || $thumbnailSize > $this->s3Storage->getMaxUploadBytes()) {
                $resArr['msgArr'][] = 'thumbnail_path must reference a verified image object within the upload size limit.';
                return $resArr;
            }
        }

        $storedObject = $this->s3Storage->headObject($filePath);
        $actualMimeType = strtolower((string) ($storedObject['ContentType'] ?? ''));
        $actualFileSize = (int) ($storedObject['ContentLength'] ?? 0);
        $signature = $this->s3Storage->getObjectPrefix($filePath);
        $signatureValid = match ($mimeType) {
            'image/jpeg' => str_starts_with($signature, "\xFF\xD8\xFF"),
            'image/png' => str_starts_with($signature, "\x89PNG\r\n\x1A\n"),
            'image/webp' => str_starts_with($signature, 'RIFF')
                && substr($signature, 8, 4) === 'WEBP',
            default => false,
        };
        if ($actualMimeType !== $mimeType || $actualFileSize !== $fileSize
            || $actualFileSize < 1 || $actualFileSize > $this->s3Storage->getMaxUploadBytes()
            || !$signatureValid) {
            $this->s3Storage->deleteObject($filePath);
            $resArr['msgArr'][] = 'Uploaded S3 object failed image type, content signature or file size verification.';
            return $resArr;
        }
        if ($variantId !== null) {
            $variant = $this->dao->getTenantProductVariant($this->db, $tenantId, $productId, $variantId);
            if ($variant['status'] !== 'SUCCESS' || $variant['data'] === []) {
                return $this->propagateFailure($variant, 'CatalogueServices::manageProductMedia');
            }
        }

        $transaction = $this->db->beginTransaction();
        try {
            if ($isPrimary === 1) {
                $lockedProduct = $this->dao->lockTenantProduct($this->db, $tenantId, $productId);
                if ($lockedProduct['status'] !== 'SUCCESS' || $lockedProduct['data'] === []) {
                    $transaction->rollBack();
                    return $this->propagateFailure($lockedProduct, 'CatalogueServices::manageProductMedia');
                }
                $cleared = $this->dao->clearPrimaryProductMedia($this->db, $tenantId, $productId, $variantId, $userId);
                if ($cleared['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($cleared, 'CatalogueServices::manageProductMedia');
                }
            }
            $result = $this->dao->insertProductMedia(
                $this->db, $tenantId, $productId, $variantId, $mediaType, $mimeType,
                $filePath, $originalName, $fileSize, $altText, $caption, $thumbnailPath,
                $width, $height, $displayOrder, $isPrimary, $userId,
            );
            if ($result['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($result, 'CatalogueServices::manageProductMedia');
            }
            $transaction->commit();
            return $result;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            throw $exception;
        }
    }

    private function tenantContext(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->authServices->getAuth([
            'actionType' => 'getAuth',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($principal['status'] !== 'SUCCESS') {
            $principal['msgArr'][] = 'CatalogueServices could not resolve the authenticated user.';
            return $principal;
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $permission = $this->tenantDao->hasTenantPermission(
            $this->db, (int) $principal['data']['user_id'], $tenantId, 'CATALOGUE_MANAGE',
        );
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'CatalogueServices::tenantContext');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'CATALOGUE_MANAGE permission is required for this tenant.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['tenant_id' => $tenantId, 'user_id' => (int) $principal['data']['user_id']];
        return $resArr;
    }

    private function requiredText(mixed $value, int $maxLength): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return $text !== '' && strlen($text) <= $maxLength ? $text : null;
    }

    private function filterText(mixed $value, int $maxLength): string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return '';
        }
        return substr(trim((string) $value), 0, $maxLength);
    }

    private function booleanValue(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if ($value === 0 || $value === 1 || $value === '0' || $value === '1') {
            return (int) $value;
        }
        return null;
    }

    private function optionalText(mixed $value, int $maxLength): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return $text === '' ? null : (strlen($text) <= $maxLength ? $text : null);
    }

    private function positiveInt(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $number = filter_var($value, FILTER_VALIDATE_INT);
        return $number !== false && $number > 0 ? (int) $number : null;
    }

    private function integerValue(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value) || filter_var($value, FILTER_VALIDATE_INT) === false) {
            return null;
        }
        return (int) $value;
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
