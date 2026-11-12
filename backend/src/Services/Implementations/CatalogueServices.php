<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\CatalogueDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\ICatalogueServices;
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
        if ($catalogueParam['actionType'] !== 'getCatalogue') {
            $resArr['msgArr'][] = 'Unsupported actionType for getCatalogue.';
            return $resArr;
        }

        $actionData = $catalogueParam['actionData'];
        try {
            switch ((string) ($actionData['action'] ?? '')) {
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
        if ($catalogueParam['actionType'] !== 'manageCatalogue') {
            $resArr['msgArr'][] = 'Unsupported actionType for manageCatalogue.';
            return $resArr;
        }

        $actionData = $catalogueParam['actionData'];
        try {
            switch ((string) ($actionData['action'] ?? '')) {
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
                case 'deleteProductMedia':
                    $resArr = $this->manageProductMedia($actionData);
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
        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($productId === null) {
            $resArr['msgArr'][] = 'A valid product_id is required.';
            return $resArr;
        }
        $product = $this->dao->getTenantProduct($this->db, (int) $context['data']['tenant_id'], $productId);
        if ($product['status'] !== 'SUCCESS' || $product['data'] === []) {
            return $this->propagateFailure($product, 'CatalogueServices::getProductMedia');
        }
        $media = $this->dao->getProductMedia($this->db, (int) $context['data']['tenant_id'], $productId);
        if ($media['status'] !== 'SUCCESS') {
            return $this->propagateFailure($media, 'CatalogueServices::getProductMedia');
        }
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
        return $this->dao->updateProduct(
            $this->db, $tenantId, $productId, $code, $name, $description, $categoryId, $globalCategoryId,
            $unitId, $brand, $barcode, $priceValues[0], $priceValues[1], $priceValues[2], 0, 0,
            $publicationStatus, $userId,
        );
    }

    private function manageProductMedia(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CatalogueServices::manageProductMedia');
        }
        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        $mediaId = $this->positiveInt($actionData['media_id'] ?? null);
        if ($productId === null || $mediaId === null) {
            $resArr['msgArr'][] = 'product_id and media_id are required.';
            return $resArr;
        }
        $product = $this->dao->getTenantProduct($this->db, (int) $context['data']['tenant_id'], $productId);
        if ($product['status'] !== 'SUCCESS' || $product['data'] === []) {
            return $this->propagateFailure($product, 'CatalogueServices::manageProductMedia');
        }
        return $this->dao->softDeleteProductMedia(
            $this->db, (int) $context['data']['tenant_id'], $productId, $mediaId, (int) $context['data']['user_id'],
        );
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
