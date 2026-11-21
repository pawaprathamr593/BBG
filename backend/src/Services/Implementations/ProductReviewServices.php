<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\ProductReviewDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\IProductReviewServices;
use App\Utils\AwsS3Storage;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class ProductReviewServices implements IProductReviewServices
{
    public function __construct(
        private ConnectionInterface $db,
        private ProductReviewDao $dao,
        private IAuthServices $authServices,
        private AwsS3Storage $s3Storage,
        private LoggerInterface $logger,
    ) {}

    public function getReviews(array $productReviewParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $actionType = (string) ($productReviewParam['actionType'] ?? '');
        $actionData = is_array($productReviewParam['actionData'] ?? null) ? $productReviewParam['actionData'] : [];

        try {
            return match ($actionType) {
                'listProductReviews' => $this->listProductReviews($actionData),
                'getProductRatingSummary' => $this->getProductRatingSummary($actionData),
                default => ['status' => 'FAILED', 'msgArr' => ['Unsupported review read action: ' . $actionType], 'data' => []],
            };
        } catch (Throwable $exception) {
            $this->logger->error('ProductReviewServices::getReviews failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Product review request failed unexpectedly.';
            return $resArr;
        }
    }

    public function manageReviews(array $productReviewParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $actionType = (string) ($productReviewParam['actionType'] ?? '');
        $actionData = is_array($productReviewParam['actionData'] ?? null) ? $productReviewParam['actionData'] : [];

        try {
            return match ($actionType) {
                'createProductReview' => $this->createReview($actionData),
                'updateProductReview' => $this->updateReview($actionData),
                'deleteProductReview' => $this->deleteReview($actionData),
                'voteProductReviewHelpful' => $this->voteHelpful($actionData),
                'reportProductReview' => $this->reportReview($actionData),
                'generateReviewMediaUploadUrl' => $this->generateReviewMediaUploadUrl($actionData),
                default => ['status' => 'FAILED', 'msgArr' => ['Unsupported review management action: ' . $actionType], 'data' => []],
            };
        } catch (Throwable $exception) {
            $this->logger->error('ProductReviewServices::manageReviews failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Product review management failed unexpectedly.';
            return $resArr;
        }
    }

    private function listProductReviews(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($productId === null) {
            $resArr['msgArr'][] = 'product_id is required.';
            return $resArr;
        }

        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 10) ?? 10);
        $sortBy = strtoupper($this->filterText($actionData['sort_by'] ?? 'NEWEST', 20));

        $userId = null;
        if (!empty($actionData['_accessToken'])) {
            $principal = $this->principal($actionData);
            if ($principal['status'] === 'SUCCESS') {
                $userId = (int) $principal['data']['user_id'];
            }
        }

        $result = $this->dao->getProductReviews(
            $this->db,
            $productId,
            $pageSize,
            ($page - 1) * $pageSize,
            $sortBy,
            $userId,
        );

        if ($result['status'] !== 'SUCCESS') {
            return $result;
        }

        $items = $result['data']['items'];
        foreach ($items as &$reviewItem) {
            if (!empty($reviewItem['media']) && is_array($reviewItem['media'])) {
                foreach ($reviewItem['media'] as &$mediaItem) {
                    if (!empty($mediaItem['media_url'])) {
                        $resolved = $this->s3Storage->resolveDownloadUrl((string) $mediaItem['media_url']);
                        if ($resolved !== null) {
                            $mediaItem['media_url'] = $resolved;
                        }
                    }
                }
                unset($mediaItem);
            }
        }
        unset($reviewItem);

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total_count' => $result['data']['total_count'],
                'total_pages' => (int) ceil($result['data']['total_count'] / $pageSize),
            ],
        ];
        return $resArr;
    }

    private function getProductRatingSummary(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($productId === null) {
            $resArr['msgArr'][] = 'product_id is required.';
            return $resArr;
        }

        return $this->dao->getProductRatingSummary($this->db, $productId);
    }

    private function createReview(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'createReview');
        }
        $userId = (int) $principal['data']['user_id'];

        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($productId === null) {
            $resArr['msgArr'][] = 'product_id is required.';
            return $resArr;
        }

        $rating = filter_var($actionData['rating'] ?? null, FILTER_VALIDATE_INT);
        if ($rating === false || $rating < 1 || $rating > 5) {
            $resArr['msgArr'][] = 'Rating must be an integer between 1 and 5 stars.';
            return $resArr;
        }

        $text = $this->requiredText($actionData['review_text'] ?? '', 3000);
        if ($text === null || mb_strlen($text) < 5) {
            $resArr['msgArr'][] = 'review_text is required and must be between 5 and 3000 characters.';
            return $resArr;
        }

        $title = $this->nullableText($actionData['review_title'] ?? null, 180);
        $rawMedia = is_array($actionData['media'] ?? null) ? $actionData['media'] : [];
        $media = [];
        foreach ($rawMedia as $item) {
            if (!is_array($item)) {
                continue;
            }
            $mediaUrl = trim((string) ($item['media_url'] ?? ''));
            if ($mediaUrl === '') {
                continue;
            }
            $isS3Key = str_starts_with($mediaUrl, 'tenants/') && strlen($mediaUrl) <= 500;
            $scheme = strtolower((string) parse_url($mediaUrl, PHP_URL_SCHEME));
            $isHttpUrl = in_array($scheme, ['http', 'https'], true) && strlen($mediaUrl) <= 500 && filter_var($mediaUrl, FILTER_VALIDATE_URL) !== false;

            if (!$isS3Key && !$isHttpUrl) {
                $resArr['msgArr'][] = 'Each review media_url must be an S3 media key or valid HTTP/HTTPS URL up to 500 characters.';
                return $resArr;
            }

            if ($isS3Key) {
                try {
                    $this->s3Storage->headObject($mediaUrl);
                } catch (Throwable) {
                    $resArr['msgArr'][] = 'Review media file not found or upload incomplete on S3: ' . basename($mediaUrl);
                    return $resArr;
                }
            }

            $media[] = [
                'media_url' => $mediaUrl,
                'file_name' => isset($item['file_name']) && is_scalar($item['file_name']) ? (string) $item['file_name'] : null,
                'file_size' => isset($item['file_size']) && is_numeric($item['file_size']) ? (int) $item['file_size'] : null,
                'mime_type' => isset($item['mime_type']) && is_scalar($item['mime_type']) ? (string) $item['mime_type'] : null,
            ];
        }

        // Resolve product, tenant and business
        $prodRow = $this->db->createCommand(
            "SELECT p.id, p.tenant_id, bp.id AS business_id
             FROM PRODUCTS p
             INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = p.tenant_id AND bp.status = 'A'
             WHERE p.id = :product_id AND p.status = 'A' LIMIT 1",
            [':product_id' => $productId]
        )->queryOne();

        if (!is_array($prodRow) || empty($prodRow['tenant_id'])) {
            $resArr['msgArr'][] = 'Product was not found or is inactive.';
            return $resArr;
        }

        $tenantId = (int) $prodRow['tenant_id'];
        $businessId = (int) $prodRow['business_id'];

        return $this->dao->createReview(
            $this->db,
            $tenantId,
            $businessId,
            $productId,
            $userId,
            $rating,
            $title,
            $text,
            $media,
        );
    }

    private function updateReview(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'updateReview');
        }
        $userId = (int) $principal['data']['user_id'];

        $reviewId = $this->positiveInt($actionData['review_id'] ?? null);
        if ($reviewId === null) {
            $resArr['msgArr'][] = 'review_id is required.';
            return $resArr;
        }

        $rating = filter_var($actionData['rating'] ?? null, FILTER_VALIDATE_INT);
        if ($rating === false || $rating < 1 || $rating > 5) {
            $resArr['msgArr'][] = 'Rating must be an integer between 1 and 5 stars.';
            return $resArr;
        }

        $text = $this->requiredText($actionData['review_text'] ?? '', 3000);
        if ($text === null) {
            $resArr['msgArr'][] = 'review_text is required and cannot exceed 3000 characters.';
            return $resArr;
        }

        $title = $this->nullableText($actionData['review_title'] ?? null, 180);

        return $this->dao->updateReview(
            $this->db,
            $reviewId,
            $userId,
            $rating,
            $title,
            $text,
        );
    }

    private function deleteReview(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'deleteReview');
        }
        $userId = (int) $principal['data']['user_id'];

        $reviewId = $this->positiveInt($actionData['review_id'] ?? null);
        if ($reviewId === null) {
            $resArr['msgArr'][] = 'review_id is required.';
            return $resArr;
        }

        $isAdmin = false;
        $roles = is_array($principal['data']['roles'] ?? null) ? $principal['data']['roles'] : [];
        if (in_array('PLATFORM_ADMIN', $roles, true)) {
            $isAdmin = true;
        }

        return $this->dao->softDeleteReview($this->db, $reviewId, $userId, $isAdmin);
    }

    private function voteHelpful(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'voteHelpful');
        }
        $userId = (int) $principal['data']['user_id'];

        $reviewId = $this->positiveInt($actionData['review_id'] ?? null);
        if ($reviewId === null) {
            $resArr['msgArr'][] = 'review_id is required.';
            return $resArr;
        }

        $rev = $this->dao->getReviewById($this->db, $reviewId);
        if ($rev['status'] !== 'SUCCESS' || empty($rev['data'])) {
            $resArr['msgArr'][] = 'Review was not found.';
            return $resArr;
        }

        $tenantId = (int) $rev['data']['tenant_id'];
        return $this->dao->toggleHelpfulVote($this->db, $tenantId, $reviewId, $userId);
    }

    private function reportReview(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'reportReview');
        }
        $userId = (int) $principal['data']['user_id'];

        $reviewId = $this->positiveInt($actionData['review_id'] ?? null);
        if ($reviewId === null) {
            $resArr['msgArr'][] = 'review_id is required.';
            return $resArr;
        }

        $reason = $this->requiredText($actionData['report_reason'] ?? '', 100);
        if ($reason === null) {
            $resArr['msgArr'][] = 'report_reason is required and cannot exceed 100 characters.';
            return $resArr;
        }

        $details = $this->nullableText($actionData['report_details'] ?? null, 1000);

        $rev = $this->dao->getReviewById($this->db, $reviewId);
        if ($rev['status'] !== 'SUCCESS' || empty($rev['data'])) {
            $resArr['msgArr'][] = 'Review was not found.';
            return $resArr;
        }

        $tenantId = (int) $rev['data']['tenant_id'];
        return $this->dao->reportReview($this->db, $tenantId, $reviewId, $userId, $reason, $details);
    }

    private function principal(array $actionData): array
    {
        $resArr = $this->authServices->getAuth([
            'actionType' => 'getPrincipal',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($resArr['status'] !== 'SUCCESS') {
            $resArr['msgArr'][] = 'ProductReviewServices could not resolve the authenticated user.';
        }
        return $resArr;
    }

    private function requiredText(mixed $value, int $maxLength): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return $text !== '' && strlen($text) <= $maxLength ? $text : null;
    }

    private function filterText(mixed $value, int $maxLength): string
    {
        if (!is_scalar($value)) {
            return '';
        }
        return substr(trim((string) $value), 0, $maxLength);
    }

    private function nullableText(mixed $value, int $maxLength): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return $text === '' ? null : (strlen($text) <= $maxLength ? $text : null);
    }

    private function positiveInt(mixed $value): ?int
    {
        $number = filter_var($value, FILTER_VALIDATE_INT);
        return $number !== false && $number > 0 ? (int) $number : null;
    }

    private function generateReviewMediaUploadUrl(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'generateReviewMediaUploadUrl');
        }
        $userId = (int) $principal['data']['user_id'];

        $productId = $this->positiveInt($actionData['product_id'] ?? null);
        if ($productId === null) {
            $resArr['msgArr'][] = 'product_id is required.';
            return $resArr;
        }

        $prodRow = $this->db->createCommand(
            "SELECT p.id, p.tenant_id
             FROM PRODUCTS p
             WHERE p.id = :product_id AND p.status = 'A' LIMIT 1",
            [':product_id' => $productId]
        )->queryOne();

        if (!is_array($prodRow) || empty($prodRow['tenant_id'])) {
            $resArr['msgArr'][] = 'Product was not found or is inactive.';
            return $resArr;
        }
        $tenantId = (int) $prodRow['tenant_id'];

        $mimeType = strtolower(trim((string) ($actionData['mime_type'] ?? $actionData['content_type'] ?? 'image/jpeg')));
        $allowedMimes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];
        if (!isset($allowedMimes[$mimeType])) {
            $resArr['msgArr'][] = 'Unsupported media type. Allowed: image/jpeg, image/png, image/webp.';
            return $resArr;
        }

        $fileSize = $this->positiveInt($actionData['file_size'] ?? 0);
        $maxBytes = $this->s3Storage->getMaxUploadBytes();
        if ($fileSize !== null && $fileSize > $maxBytes) {
            $resArr['msgArr'][] = 'Review image exceeds the maximum permitted file size of ' . round($maxBytes / (1024 * 1024)) . 'MB.';
            return $resArr;
        }

        $ext = $allowedMimes[$mimeType];
        $key = sprintf('tenants/%d/reviews/%d/%d/%s.%s', $tenantId, $productId, $userId, bin2hex(random_bytes(16)), $ext);

        try {
            $upload = $this->s3Storage->createUploadUrl($key, $mimeType);
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = [
                'upload_url' => $upload['url'],
                'object_key' => $key,
                'expires_in' => $upload['expires_in'],
                'required_headers' => [
                    'Content-Type' => $mimeType,
                ],
            ];
            return $resArr;
        } catch (Throwable $e) {
            $this->logger->error('ProductReviewServices::generateReviewMediaUploadUrl failed.', ['exception' => $e]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Unable to generate S3 upload URL for product review media.';
            return $resArr;
        }
    }

    private function propagateFailure(array $downstream, string $context): array
    {
        $downstream['msgArr'][] = $context . ' returned a non-success response.';
        if (($downstream['status'] ?? '') === 'SUCCESS') {
            $downstream['status'] = 'FAILED';
            $downstream['data'] = [];
        }
        return $downstream;
    }
}
