<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\PromotionDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\IPromotionServices;
use DateTimeImmutable;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class PromotionServices implements IPromotionServices
{
    public function __construct(
        private ConnectionInterface $db,
        private PromotionDao $dao,
        private TenantDao $tenantDao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getPromotion(array $promotionParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($promotionParam['actionType']) || !is_string($promotionParam['actionType']) || $promotionParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for getPromotion.';
            return $resArr;
        }
        if (!isset($promotionParam['actionData']) || !is_array($promotionParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $promotionParam['actionData'];
        $actionData['action'] = (string) $promotionParam['actionType'];
        try {
            switch ((string) $promotionParam['actionType']) {
                case 'listMyPromotions':
                    $resArr = $this->getMyPromotions($actionData);
                    break;
                case 'getMyPromotion':
                    $resArr = $this->getMyPromotion($actionData);
                    break;
                case 'getPromotionEngagement':
                    $resArr = $this->getMyPromotionEngagement($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported promotion read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('PromotionServices::getPromotion failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Promotion request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function managePromotion(array $promotionParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($promotionParam['actionType']) || !is_string($promotionParam['actionType']) || $promotionParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for managePromotion.';
            return $resArr;
        }
        if (!isset($promotionParam['actionData']) || !is_array($promotionParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $promotionParam['actionData'];
        $actionData['action'] = (string) $promotionParam['actionType'];
        try {
            switch ((string) $promotionParam['actionType']) {
                case 'createPromotion':
                    $resArr = $this->manageMyPromotion($actionData, 'create');
                    break;
                case 'updatePromotion':
                    $resArr = $this->manageMyPromotion($actionData, 'update');
                    break;
                case 'deletePromotion':
                    $resArr = $this->manageMyPromotion($actionData, 'delete');
                    break;
                case 'publishPromotion':
                    $resArr = $this->manageMyPromotion($actionData, 'publish');
                    break;
                case 'unpublishPromotion':
                    $resArr = $this->manageMyPromotion($actionData, 'unpublish');
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported promotion management action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('PromotionServices::managePromotion failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Promotion management failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getMyPromotions(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'PromotionServices::getMyPromotions');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getMyPromotions($this->db, $tenantId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'PromotionServices::getMyPromotions');
        }
        $count = $this->dao->countMyPromotions($this->db, $tenantId);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'PromotionServices::getMyPromotions');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getMyPromotion(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'PromotionServices::getMyPromotion');
        }
        $promotionId = $this->positiveInt($actionData['promotion_id'] ?? null);
        if ($promotionId === null) {
            $resArr['msgArr'][] = 'A valid promotion_id is required.';
            return $resArr;
        }
        $promotion = $this->dao->getMyPromotion($this->db, (int) $context['data']['tenant_id'], $promotionId);
        if ($promotion['status'] !== 'SUCCESS' || $promotion['data'] === []) {
            return $this->propagateFailure($promotion, 'PromotionServices::getMyPromotion');
        }
        $media = $this->dao->getPromotionMedia($this->db, (int) $context['data']['tenant_id'], $promotionId);
        if ($media['status'] !== 'SUCCESS') {
            return $this->propagateFailure($media, 'PromotionServices::getMyPromotion');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['promotion' => $promotion['data'], 'media' => $media['data']];
        return $resArr;
    }

    private function getMyPromotionEngagement(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'PromotionServices::getMyPromotionEngagement');
        }
        $promotionId = $this->positiveInt($actionData['promotion_id'] ?? null);
        if ($promotionId === null) {
            $resArr['msgArr'][] = 'A valid promotion_id is required.';
            return $resArr;
        }
        $promotion = $this->dao->getMyPromotion($this->db, (int) $context['data']['tenant_id'], $promotionId);
        if ($promotion['status'] !== 'SUCCESS' || $promotion['data'] === []) {
            return $this->propagateFailure($promotion, 'PromotionServices::getMyPromotionEngagement');
        }
        $result = $this->dao->getPromotionEngagement($this->db, (int) $context['data']['tenant_id'], $promotionId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'PromotionServices::getMyPromotionEngagement');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function manageMyPromotion(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'PromotionServices::manageMyPromotion');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $userId = (int) $context['data']['user_id'];
        $promotionId = $this->positiveInt($actionData['promotion_id'] ?? null);
        if ($operation !== 'create') {
            if ($promotionId === null) {
                $resArr['msgArr'][] = 'A valid promotion_id is required.';
                return $resArr;
            }
            $existing = $this->dao->getMyPromotion($this->db, $tenantId, $promotionId);
            if ($existing['status'] !== 'SUCCESS' || $existing['data'] === []) {
                return $this->propagateFailure($existing, 'PromotionServices::manageMyPromotion');
            }
        }
        if ($operation === 'delete') {
            return $this->dao->softDeletePromotion($this->db, $tenantId, $promotionId, $userId);
        }
        if ($operation === 'publish' || $operation === 'unpublish') {
            if ($operation === 'unpublish') {
                return $this->dao->setPromotionPublicationStatus(
                    $this->db, $tenantId, $promotionId, $userId, 'DRAFT',
                );
            }
            if (($existing['data']['publication_status'] ?? '') === 'PUBLISHED') {
                return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => [
                    'id' => $promotionId, 'publication_status' => 'PUBLISHED',
                ]];
            }
            $validUntil = $existing['data']['valid_until'] ?? null;
            if ($validUntil !== null && strtotime((string) $validUntil) < time()) {
                $resArr['msgArr'][] = 'Expired promotions cannot be published.';
                return $resArr;
            }

            $transaction = $this->db->beginTransaction();
            try {
                $lockedTenant = $this->dao->lockTenantForPromotionPublish($this->db, $tenantId);
                if ($lockedTenant['status'] !== 'SUCCESS' || $lockedTenant['data'] === []) {
                    $transaction->rollBack();
                    return $this->propagateFailure($lockedTenant, 'PromotionServices::manageMyPromotion');
                }

                $entitlement = $this->dao->hasPromotionEntitlement($this->db, $tenantId);
                if ($entitlement['status'] !== 'SUCCESS' || $entitlement['data'] === []) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'An active subscription with PROMOTION_MANAGEMENT enabled is required to publish promotions.';
                    return $resArr;
                }

                $limitResult = $this->dao->getActiveDailyPromotionLimit($this->db, $tenantId);
                if ($limitResult['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($limitResult, 'PromotionServices::manageMyPromotion');
                }
                $dailyLimit = filter_var($limitResult['data']['entitlement_value'] ?? null, FILTER_VALIDATE_INT);
                if ($dailyLimit === false || $dailyLimit < 1) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'The active subscription does not include a valid DAILY_PROMOTION_LIMIT.';
                    return $resArr;
                }

                $dailyCount = $this->dao->countPromotionsPublishedOnTenantLocalDay($this->db, $tenantId);
                if ($dailyCount['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($dailyCount, 'PromotionServices::manageMyPromotion');
                }
                if (empty($dailyCount['data']['tenant_now'])) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'The tenant time zone could not be resolved. Promotion publishing is temporarily unavailable.';
                    return $resArr;
                }
                if ((int) ($dailyCount['data']['total'] ?? 0) >= $dailyLimit) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'The daily promotion publishing limit for this business has been reached.';
                    return $resArr;
                }

                $published = $this->dao->setPromotionPublicationStatus(
                    $this->db, $tenantId, $promotionId, $userId, 'PUBLISHED',
                );
                if ($published['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $published;
                }
                $transaction->commit();
                return $published;
            } catch (Throwable $exception) {
                if ($transaction->isActive()) {
                    $transaction->rollBack();
                }
                throw $exception;
            }
        }

        $content = $this->requiredText($actionData['post_content'] ?? '', 10000);
        if ($content === null) {
            $resArr['msgArr'][] = 'post_content is required and must not exceed 10000 characters.';
            return $resArr;
        }
        $title = $this->nullableText($actionData['post_title'] ?? null, 180);
        $validUntil = $this->dateTimeText($actionData['valid_until'] ?? null);
        if (($actionData['valid_until'] ?? null) !== null && $validUntil === null) {
            $resArr['msgArr'][] = 'valid_until must be a valid date-time.';
            return $resArr;
        }
        if ($validUntil !== null && strtotime($validUntil) <= time()) {
            $resArr['msgArr'][] = 'valid_until must be in the future.';
            return $resArr;
        }

        if ($operation === 'create') {
            $entitlement = $this->dao->hasPromotionEntitlement($this->db, $tenantId);
            if ($entitlement['status'] !== 'SUCCESS' || $entitlement['data'] === []) {
                $resArr['msgArr'][] = 'An active subscription with PROMOTION_MANAGEMENT enabled is required to create promotions.';
                return $resArr;
            }
            return $this->dao->insertPromotion($this->db, $tenantId, $title, $content, $validUntil, $userId);
        }
        return $this->dao->updatePromotion($this->db, $tenantId, $promotionId, $title, $content, $validUntil, $userId);
    }

    private function tenantContext(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->authServices->getAuth([
            'actionType' => 'getPrincipal',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'PromotionServices::tenantContext');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $permission = $this->tenantDao->hasTenantPermission(
            $this->db, (int) $principal['data']['user_id'], $tenantId, 'PROMOTIONS_MANAGE',
        );
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'PromotionServices::tenantContext');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'PROMOTIONS_MANAGE permission is required for this tenant.';
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

    private function nullableText(mixed $value, int $maxLength): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return $text === '' ? null : (strlen($text) <= $maxLength ? $text : null);
    }

    private function dateTimeText(mixed $value): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value) || trim((string) $value) === '') {
            return null;
        }
        try {
            return (new DateTimeImmutable((string) $value))->format('Y-m-d H:i:s');
        } catch (Throwable) {
            return null;
        }
    }

    private function positiveInt(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $number = filter_var($value, FILTER_VALIDATE_INT);
        return $number !== false && $number > 0 ? (int) $number : null;
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
