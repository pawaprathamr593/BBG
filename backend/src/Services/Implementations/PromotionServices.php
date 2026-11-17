<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\PromotionDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\IPromotionServices;
use App\Utils\AwsS3Storage;
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
        private AwsS3Storage $s3Storage,
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
                case 'listPromotionMedia':
                    $resArr = $this->getMyPromotionMedia($actionData);
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
                case 'generatePromotionMediaUploadUrl':
                    $resArr = $this->generatePromotionMediaUploadUrl($actionData);
                    break;
                case 'linkPromotionMedia':
                    $resArr = $this->managePromotionMedia($actionData, 'link');
                    break;
                case 'deletePromotionMedia':
                    $resArr = $this->managePromotionMedia($actionData, 'delete');
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
        foreach ($rows['data'] as &$promotionRow) {
            $media = $this->dao->getPromotionMedia($this->db, $tenantId, (int) $promotionRow['id']);
            $promotionRow['media'] = [];
            if ($media['status'] === 'SUCCESS') {
                foreach ($media['data'] as $mediaRow) {
                    try { $mediaRow['url'] = $this->s3Storage->createDownloadUrl((string) $mediaRow['file_path']); }
                    catch (Throwable $exception) {
                        $this->logger->warning('Unable to create a post media download URL for promotion list.', [
                            'promotion_id' => (int) $promotionRow['id'], 'exception' => $exception,
                        ]);
                        $mediaRow['url'] = null;
                    }
                    $promotionRow['media'][] = $mediaRow;
                }
            }
        }
        unset($promotionRow);
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

    private function getMyPromotionMedia(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'PromotionServices::getMyPromotionMedia');
        $promotionId = $this->positiveInt($actionData['promotion_id'] ?? null);
        if ($promotionId === null) {
            $resArr['msgArr'][] = 'A valid promotion_id is required.';
            return $resArr;
        }
        $promotion = $this->dao->getMyPromotion($this->db, (int) $context['data']['tenant_id'], $promotionId);
        if ($promotion['status'] !== 'SUCCESS' || $promotion['data'] === []) return $this->propagateFailure($promotion, 'PromotionServices::getMyPromotionMedia');
        $media = $this->dao->getPromotionMedia($this->db, (int) $context['data']['tenant_id'], $promotionId);
        if ($media['status'] !== 'SUCCESS') return $this->propagateFailure($media, 'PromotionServices::getMyPromotionMedia');
        foreach ($media['data'] as &$item) {
            try { $item['url'] = $this->s3Storage->createDownloadUrl((string) $item['file_path']); }
            catch (Throwable $exception) {
                $this->logger->warning('Unable to create a post media download URL.', ['promotion_id' => $promotionId, 'exception' => $exception]);
                $item['url'] = null;
            }
        }
        unset($item);
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $media['data']];
        return $resArr;
    }

    private function generatePromotionMediaUploadUrl(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'PromotionServices::generatePromotionMediaUploadUrl');
        $tenantId = (int) $context['data']['tenant_id'];
        $dailyEntitlement = $this->dao->getActivePromotionDailyLimit($this->db, $tenantId);
        if ($dailyEntitlement['status'] !== 'SUCCESS') return $this->propagateFailure($dailyEntitlement, 'PromotionServices::generatePromotionMediaUploadUrl');
        $dailyLimit = $dailyEntitlement['data']['entitlement_value'] ?? null;
        if (!is_numeric($dailyLimit) || (int) $dailyLimit < 1) {
            $resArr['msgArr'][] = 'An active subscription with a valid DAILY_PROMOTION_LIMIT entitlement is required for post media.';
            return $resArr;
        }
        $promotionId = $this->positiveInt($actionData['promotion_id'] ?? null);
        $fileName = $this->requiredText($actionData['original_file_name'] ?? '', 255);
        $mimeType = strtolower($this->requiredText($actionData['mime_type'] ?? '', 100) ?? '');
        $fileSize = filter_var($actionData['file_size_bytes'] ?? null, FILTER_VALIDATE_INT);
        $supported = [
            'image/jpeg' => ['jpg', 'IMAGE'], 'image/png' => ['png', 'IMAGE'],
            'image/webp' => ['webp', 'IMAGE'], 'image/gif' => ['gif', 'IMAGE'],
            'video/mp4' => ['mp4', 'VIDEO'], 'video/webm' => ['webm', 'VIDEO'],
            'audio/mpeg' => ['mp3', 'AUDIO'], 'audio/wav' => ['wav', 'AUDIO'],
            'audio/ogg' => ['ogg', 'AUDIO'], 'application/pdf' => ['pdf', 'DOCUMENT'],
        ];
        if ($promotionId === null || $fileName === null || !isset($supported[$mimeType])
            || $fileSize === false || $fileSize < 1 || $fileSize > $this->s3Storage->getMaxUploadBytes()) {
            $resArr['msgArr'][] = 'Choose a supported image, video, audio or PDF file within the configured upload size limit.';
            return $resArr;
        }
        $promotion = $this->dao->getMyPromotion($this->db, $tenantId, $promotionId);
        if ($promotion['status'] !== 'SUCCESS' || $promotion['data'] === []) return $this->propagateFailure($promotion, 'PromotionServices::generatePromotionMediaUploadUrl');
        if (($promotion['data']['publication_status'] ?? '') === 'PUBLISHED') {
            $resArr['msgArr'][] = 'Unpublish this post before changing its media.';
            return $resArr;
        }
        $key = 'tenants/' . $tenantId . '/posts/' . $promotionId . '/' . bin2hex(random_bytes(16)) . '.' . $supported[$mimeType][0];
        $upload = $this->s3Storage->createUploadUrl($key, $mimeType);
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['upload_url' => $upload['url'], 'object_key' => $key, 'method' => 'PUT',
            'headers' => ['Content-Type' => $mimeType], 'expires_in' => $upload['expires_in']];
        return $resArr;
    }

    private function managePromotionMedia(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'PromotionServices::managePromotionMedia');
        $tenantId = (int) $context['data']['tenant_id'];
        $userId = (int) $context['data']['user_id'];
        if ($operation === 'link') {
            $dailyEntitlement = $this->dao->getActivePromotionDailyLimit($this->db, $tenantId);
            if ($dailyEntitlement['status'] !== 'SUCCESS') return $this->propagateFailure($dailyEntitlement, 'PromotionServices::managePromotionMedia');
            $dailyLimit = $dailyEntitlement['data']['entitlement_value'] ?? null;
            if (!is_numeric($dailyLimit) || (int) $dailyLimit < 1) {
                $resArr['msgArr'][] = 'An active subscription with a valid DAILY_PROMOTION_LIMIT entitlement is required for post media.';
                return $resArr;
            }
        }
        $promotionId = $this->positiveInt($actionData['promotion_id'] ?? null);
        if ($promotionId === null) {
            $resArr['msgArr'][] = 'A valid promotion_id is required.';
            return $resArr;
        }
        $promotion = $this->dao->getMyPromotion($this->db, $tenantId, $promotionId);
        if ($promotion['status'] !== 'SUCCESS' || $promotion['data'] === []) return $this->propagateFailure($promotion, 'PromotionServices::managePromotionMedia');
        if (($promotion['data']['publication_status'] ?? '') === 'PUBLISHED') {
            $resArr['msgArr'][] = 'Unpublish this post before changing its media.';
            return $resArr;
        }
        if ($operation === 'delete') {
            $mediaId = $this->positiveInt($actionData['media_id'] ?? null);
            if ($mediaId === null) {
                $resArr['msgArr'][] = 'A valid media_id is required.';
                return $resArr;
            }
            $record = $this->dao->getPromotionMediaRecord($this->db, $tenantId, $promotionId, $mediaId);
            if ($record['status'] !== 'SUCCESS' || $record['data'] === []) return $this->propagateFailure($record, 'PromotionServices::managePromotionMedia');
            $deleted = $this->dao->softDeletePromotionMedia($this->db, $tenantId, $promotionId, $mediaId, $userId);
            if ($deleted['status'] === 'SUCCESS') {
                try { $this->s3Storage->deleteObject((string) $record['data']['file_path']); }
                catch (Throwable $exception) { $this->logger->warning('Post media soft-delete succeeded but S3 cleanup failed.', ['media_id' => $mediaId, 'exception' => $exception]); }
            }
            return $deleted;
        }
        $filePath = $this->requiredText($actionData['file_path'] ?? '', 500);
        $mimeType = strtolower($this->requiredText($actionData['mime_type'] ?? '', 100) ?? '');
        $fileSize = filter_var($actionData['file_size_bytes'] ?? null, FILTER_VALIDATE_INT);
        $displayOrder = filter_var($actionData['display_order'] ?? 0, FILTER_VALIDATE_INT);
        $expectedPrefix = 'tenants/' . $tenantId . '/posts/' . $promotionId . '/';
        if ($filePath === null || !str_starts_with($filePath, $expectedPrefix) || str_contains($filePath, '..')
            || str_starts_with($filePath, '/') || preg_match('/^[a-z]+:///i', $filePath)
            || $fileSize === false || $fileSize < 1 || $fileSize > $this->s3Storage->getMaxUploadBytes()
            || $displayOrder === false || $displayOrder < 0) {
            $resArr['msgArr'][] = 'Valid post-scoped media path, size and display order are required.';
            return $resArr;
        }
        $supported = [
            'image/jpeg' => 'IMAGE', 'image/png' => 'IMAGE', 'image/webp' => 'IMAGE', 'image/gif' => 'IMAGE',
            'video/mp4' => 'VIDEO', 'video/webm' => 'VIDEO',
            'audio/mpeg' => 'AUDIO', 'audio/wav' => 'AUDIO', 'audio/ogg' => 'AUDIO',
            'application/pdf' => 'DOCUMENT',
        ];
        if (!isset($supported[$mimeType])) {
            $resArr['msgArr'][] = 'Unsupported post media type.';
            return $resArr;
        }
        $object = $this->s3Storage->headObject($filePath);
        $actualMime = strtolower((string) ($object['ContentType'] ?? ''));
        $actualSize = (int) ($object['ContentLength'] ?? 0);
        $signature = $this->s3Storage->getObjectPrefix($filePath);
        if ($actualMime !== $mimeType || $actualSize !== $fileSize || $actualSize < 1
            || $actualSize > $this->s3Storage->getMaxUploadBytes()
            || !$this->promotionMediaSignatureMatches($mimeType, $signature)) {
            $this->s3Storage->deleteObject($filePath);
            $resArr['msgArr'][] = 'Uploaded post media failed content type, signature or file size verification.';
            return $resArr;
        }
        return $this->dao->insertPromotionMedia(
            $this->db, $tenantId, $promotionId, $filePath, $supported[$mimeType], (int) $displayOrder, $userId,
        );
    }

    private function promotionMediaSignatureMatches(string $mimeType, string $signature): bool
    {
        return match ($mimeType) {
            'image/jpeg' => str_starts_with($signature, "\xFF\xD8\xFF"),
            'image/png' => str_starts_with($signature, "\x89PNG\r\n\x1A\n"),
            'image/webp' => str_starts_with($signature, 'RIFF') && substr($signature, 8, 4) === 'WEBP',
            'image/gif' => str_starts_with($signature, 'GIF87a') || str_starts_with($signature, 'GIF89a'),
            'video/mp4' => strlen($signature) >= 8 && substr($signature, 4, 4) === 'ftyp',
            'video/webm' => str_starts_with($signature, "\x1A\x45\xDF\xA3"),
            'audio/mpeg' => str_starts_with($signature, 'ID3')
                || (strlen($signature) >= 2 && ord($signature[0]) === 0xFF && (ord($signature[1]) & 0xE0) === 0xE0),
            'audio/wav' => str_starts_with($signature, 'RIFF') && substr($signature, 8, 4) === 'WAVE',
            'audio/ogg' => str_starts_with($signature, 'OggS'),
            'application/pdf' => str_starts_with($signature, '%PDF-'),
            default => false,
        };
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
            if ($operation === 'publish') {
                $quota = $this->getPromotionQuota($tenantId, (int) $context['data']['user_id'], $promotionId);
                if ($quota['status'] !== 'SUCCESS') {
                    return $quota;
                }
                $validUntil = $existing['data']['valid_until'] ?? null;
                if ($validUntil !== null && strtotime((string) $validUntil) < time()) {
                    $resArr['msgArr'][] = 'Expired promotions cannot be published.';
                    return $resArr;
                }
            }
            return $this->dao->setPromotionPublicationStatus(
                $this->db, $tenantId, $promotionId, $userId, $operation === 'publish' ? 'PUBLISHED' : 'DRAFT',
            );
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
            $entitlement = $this->dao->getActivePromotionDailyLimit($this->db, $tenantId);
            if ($entitlement['status'] !== 'SUCCESS') {
                return $this->propagateFailure($entitlement, 'PromotionServices::manageMyPromotion');
            }
            $dailyLimit = $entitlement['data']['entitlement_value'] ?? null;
            if (!is_numeric($dailyLimit) || (int) $dailyLimit < 1) {
                $resArr['msgArr'][] = 'An active subscription with a valid DAILY_PROMOTION_LIMIT entitlement is required to create promotions.';
                return $resArr;
            }
            return $this->dao->insertPromotion($this->db, $tenantId, $title, $content, $validUntil, $userId);
        }
        return $this->dao->updatePromotion($this->db, $tenantId, $promotionId, $title, $content, $validUntil, $userId);
    }

    private function getPromotionQuota(int $tenantId, int $userId, int $promotionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $entitlement = $this->dao->getActivePromotionDailyLimit($this->db, $tenantId);
        if ($entitlement['status'] !== 'SUCCESS') {
            return $this->propagateFailure($entitlement, 'PromotionServices::getPromotionQuota');
        }
        $limit = $entitlement['data']['entitlement_value'] ?? null;
        if (!is_numeric($limit) || (int) $limit < 1) {
            $resArr['msgArr'][] = 'An active subscription with a valid DAILY_PROMOTION_LIMIT entitlement is required to publish promotions.';
            return $resArr;
        }

        $tenant = $this->tenantDao->getMyTenant($this->db, $userId, $tenantId);
        if ($tenant['status'] !== 'SUCCESS' || $tenant['data'] === []) {
            return $this->propagateFailure($tenant, 'PromotionServices::getPromotionQuota');
        }
        $timezoneName = trim((string) ($tenant['data']['timezone'] ?? 'UTC'));
        try {
            $timezone = new \DateTimeZone($timezoneName !== '' ? $timezoneName : 'UTC');
            $localStart = new \DateTimeImmutable('today', $timezone);
            $localEnd = $localStart->modify('+1 day');
            $utc = new \DateTimeZone('UTC');
            $startUtc = $localStart->setTimezone($utc)->format('Y-m-d H:i:s');
            $endUtc = $localEnd->setTimezone($utc)->format('Y-m-d H:i:s');
        } catch (\Throwable $exception) {
            $resArr['msgArr'][] = 'The tenant timezone is invalid; promotion publishing is blocked until it is corrected.';
            return $resArr;
        }

        $count = $this->dao->countTenantPromotionsPublishedInRange(
            $this->db, $tenantId, $startUtc, $endUtc, $promotionId,
        );
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'PromotionServices::getPromotionQuota');
        }
        if ((int) ($count['data']['total'] ?? 0) >= (int) $limit) {
            $resArr['msgArr'][] = 'The tenant daily promotion publishing limit has been reached for its local calendar day.';
            return $resArr;
        }

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['daily_limit' => (int) $limit];
        return $resArr;
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
