<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class ProductReviewDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getProductReviews(
        ConnectionInterface $db,
        int $productId,
        int $limit = 10,
        int $offset = 0,
        string $sortBy = 'NEWEST',
        ?int $currentUserId = null,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $orderClause = match ($sortBy) {
            'OLDEST' => 'pr.reviewed_on ASC, pr.id ASC',
            'RATING_HIGH' => 'pr.rating DESC, pr.reviewed_on DESC',
            'RATING_LOW' => 'pr.rating ASC, pr.reviewed_on DESC',
            'MOST_HELPFUL' => 'pr.helpful_count DESC, pr.reviewed_on DESC',
            default => 'pr.reviewed_on DESC, pr.id DESC',
        };

        $votedSql = $currentUserId !== null
            ? "(SELECT COUNT(*) FROM PRODUCT_REVIEW_VOTES prv WHERE prv.review_id = pr.id AND prv.user_id = :current_user_id AND prv.status = 'A') > 0"
            : '0';

        $isAuthorSql = $currentUserId !== null
            ? "(pr.user_id = :current_user_id_author)"
            : '0';

        $sql = "SELECT pr.id, pr.tenant_id, pr.product_id, pr.business_id, pr.user_id,
                       u.full_name AS author_name,
                       pr.rating, pr.review_title, pr.review_text, pr.review_status,
                       pr.is_verified_purchase, pr.helpful_count, pr.reviewed_on,
                       {$votedSql} AS user_voted_helpful,
                       {$isAuthorSql} AS is_author
                FROM PRODUCT_REVIEWS pr
                INNER JOIN USERS u ON u.id = pr.user_id AND u.status = 'A'
                WHERE pr.product_id = :product_id AND pr.review_status = 'PUBLISHED' AND pr.status = 'A'
                ORDER BY {$orderClause}
                LIMIT :limit OFFSET :offset";

        $params = [
            ':product_id' => $productId,
            ':limit' => $limit,
            ':offset' => $offset,
        ];
        if ($currentUserId !== null) {
            $params[':current_user_id'] = $currentUserId;
            $params[':current_user_id_author'] = $currentUserId;
        }

        $reviewsResult = $this->many($db, $sql, $params, 'getProductReviews');
        if ($reviewsResult['status'] !== 'SUCCESS') {
            return $reviewsResult;
        }

        $reviews = $reviewsResult['data'];
        if (!empty($reviews)) {
            $reviewIds = array_column($reviews, 'id');
            $placeholders = implode(',', array_fill(0, count($reviewIds), '?'));
            $mediaResult = $this->many(
                $db,
                "SELECT id, review_id, media_url, file_name, file_size, mime_type, display_order
                 FROM PRODUCT_REVIEW_MEDIA
                 WHERE review_id IN ({$placeholders}) AND status = 'A'
                 ORDER BY display_order ASC, id ASC",
                $reviewIds,
                'getProductReviewMedia'
            );

            $mediaByReview = [];
            if ($mediaResult['status'] === 'SUCCESS') {
                foreach ($mediaResult['data'] as $mediaItem) {
                    $mediaByReview[$mediaItem['review_id']][] = $mediaItem;
                }
            }

            foreach ($reviews as &$rev) {
                $rev['id'] = (int) $rev['id'];
                $rev['tenant_id'] = (int) $rev['tenant_id'];
                $rev['product_id'] = (int) $rev['product_id'];
                $rev['business_id'] = (int) $rev['business_id'];
                $rev['user_id'] = (int) $rev['user_id'];
                $rev['rating'] = (int) $rev['rating'];
                $rev['helpful_count'] = (int) $rev['helpful_count'];
                $rev['is_verified_purchase'] = (bool) $rev['is_verified_purchase'];
                $rev['user_voted_helpful'] = (bool) $rev['user_voted_helpful'];
                $rev['is_author'] = (bool) $rev['is_author'];
                $rev['media'] = $mediaByReview[$rev['id']] ?? [];
            }
            unset($rev);
        }

        // Total count for pagination
        $countSql = "SELECT COUNT(*) AS total_count FROM PRODUCT_REVIEWS
                     WHERE product_id = :product_id AND review_status = 'PUBLISHED' AND status = 'A'";
        $countResult = $this->one($db, $countSql, [':product_id' => $productId], 'countProductReviews');
        $totalCount = (int) ($countResult['data']['total_count'] ?? 0);

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $reviews,
            'total_count' => $totalCount,
        ];
        return $resArr;
    }

    public function getProductRatingSummary(ConnectionInterface $db, int $productId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $sql = "SELECT COUNT(*) AS total_reviews,
                       COALESCE(ROUND(AVG(rating), 1), 0.0) AS average_rating,
                       COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) AS count_5,
                       COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) AS count_4,
                       COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) AS count_3,
                       COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) AS count_2,
                       COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS count_1
                FROM PRODUCT_REVIEWS
                WHERE product_id = :product_id AND review_status = 'PUBLISHED' AND status = 'A'";

        $result = $this->one($db, $sql, [':product_id' => $productId], 'getProductRatingSummary');
        if ($result['status'] !== 'SUCCESS') {
            return $result;
        }

        $row = $result['data'];
        $total = (int) ($row['total_reviews'] ?? 0);
        $avg = (float) ($row['average_rating'] ?? 0.0);

        $c5 = (int) ($row['count_5'] ?? 0);
        $c4 = (int) ($row['count_4'] ?? 0);
        $c3 = (int) ($row['count_3'] ?? 0);
        $c2 = (int) ($row['count_2'] ?? 0);
        $c1 = (int) ($row['count_1'] ?? 0);

        $calcPct = static fn(int $cnt) => $total > 0 ? (int) round(($cnt / $total) * 100) : 0;

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'product_id' => $productId,
            'average_rating' => $avg,
            'total_reviews' => $total,
            'distribution' => [
                5 => ['count' => $c5, 'percentage' => $calcPct($c5)],
                4 => ['count' => $c4, 'percentage' => $calcPct($c4)],
                3 => ['count' => $c3, 'percentage' => $calcPct($c3)],
                2 => ['count' => $c2, 'percentage' => $calcPct($c2)],
                1 => ['count' => $c1, 'percentage' => $calcPct($c1)],
            ],
        ];
        return $resArr;
    }

    public function createReview(
        ConnectionInterface $db,
        int $tenantId,
        int $businessId,
        int $productId,
        int $userId,
        int $rating,
        ?string $title,
        string $text,
        array $media = [],
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        try {
            $transaction = $db->beginTransaction();

            $db->createCommand(
                "INSERT INTO PRODUCT_REVIEWS
                 (tenant_id, product_id, business_id, user_id, rating, review_title, review_text,
                  review_status, is_verified_purchase, helpful_count, reviewed_on, status, created_by, updated_by)
                 VALUES
                 (:tenant_id, :product_id, :business_id, :user_id, :rating, :review_title, :review_text,
                  'PUBLISHED', 0, 0, CURRENT_TIMESTAMP, 'A', :created_by, :updated_by)",
                [
                    ':tenant_id' => $tenantId,
                    ':product_id' => $productId,
                    ':business_id' => $businessId,
                    ':user_id' => $userId,
                    ':rating' => $rating,
                    ':review_title' => $title,
                    ':review_text' => $text,
                    ':created_by' => $userId,
                    ':updated_by' => $userId,
                ]
            )->execute();

            $reviewId = (int) $db->getLastInsertId();

            if (!empty($media)) {
                $order = 0;
                foreach ($media as $item) {
                    $mediaUrl = trim((string) ($item['media_url'] ?? ''));
                    if ($mediaUrl === '') {
                        continue;
                    }
                    $fileName = !empty($item['file_name']) ? substr(trim((string) $item['file_name']), 0, 255) : null;
                    $fileSize = !empty($item['file_size']) ? (int) $item['file_size'] : null;
                    $mimeType = !empty($item['mime_type']) ? substr(trim((string) $item['mime_type']), 0, 100) : null;

                    $db->createCommand(
                        "INSERT INTO PRODUCT_REVIEW_MEDIA
                         (tenant_id, review_id, media_url, file_name, file_size, mime_type, display_order, status, created_by, updated_by)
                         VALUES
                         (:tenant_id, :review_id, :media_url, :file_name, :file_size, :mime_type, :display_order, 'A', :created_by, :updated_by)",
                        [
                            ':tenant_id' => $tenantId,
                            ':review_id' => $reviewId,
                            ':media_url' => $mediaUrl,
                            ':file_name' => $fileName,
                            ':file_size' => $fileSize,
                            ':mime_type' => $mimeType,
                            ':display_order' => $order++,
                            ':created_by' => $userId,
                            ':updated_by' => $userId,
                        ]
                    )->execute();
                }
            }

            $transaction->commit();

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $reviewId, 'review_status' => 'PUBLISHED'];
        } catch (Throwable $exception) {
            if (isset($transaction) && $transaction->isActive()) {
                $transaction->rollBack();
            }
            return $this->error('createReview', $exception);
        }

        return $resArr;
    }

    public function getReviewById(ConnectionInterface $db, int $reviewId): array
    {
        return $this->one(
            $db,
            "SELECT * FROM PRODUCT_REVIEWS WHERE id = :id AND status = 'A' LIMIT 1",
            [':id' => $reviewId],
            'getReviewById'
        );
    }

    public function updateReview(
        ConnectionInterface $db,
        int $reviewId,
        int $userId,
        int $rating,
        ?string $title,
        string $text,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        try {
            $affected = $db->createCommand(
                "UPDATE PRODUCT_REVIEWS
                 SET rating = :rating, review_title = :review_title, review_text = :review_text,
                     updated_by = :updated_by, updated_on = CURRENT_TIMESTAMP
                 WHERE id = :id AND user_id = :user_id AND status = 'A'",
                [
                    ':rating' => $rating,
                    ':review_title' => $title,
                    ':review_text' => $text,
                    ':updated_by' => $userId,
                    ':user_id' => $userId,
                    ':id' => $reviewId,
                ]
            )->execute();

            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Review was not found or you are not authorized to update it.';
                return $resArr;
            }

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $reviewId];
        } catch (Throwable $exception) {
            return $this->error('updateReview', $exception);
        }

        return $resArr;
    }

    public function softDeleteReview(ConnectionInterface $db, int $reviewId, int $userId, bool $isAdmin = false): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        try {
            $whereUser = $isAdmin ? '' : ' AND user_id = :user_id';
            $params = [':id' => $reviewId, ':updated_by' => $userId];
            if (!$isAdmin) {
                $params[':user_id'] = $userId;
            }

            $affected = $db->createCommand(
                "UPDATE PRODUCT_REVIEWS
                 SET status = 'Z', updated_by = :updated_by, updated_on = CURRENT_TIMESTAMP
                 WHERE id = :id AND status = 'A'{$whereUser}",
                $params
            )->execute();

            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Review was not found or you are not authorized to delete it.';
                return $resArr;
            }

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $reviewId, 'deleted' => true];
        } catch (Throwable $exception) {
            return $this->error('softDeleteReview', $exception);
        }

        return $resArr;
    }

    public function toggleHelpfulVote(ConnectionInterface $db, int $tenantId, int $reviewId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        try {
            $transaction = $db->beginTransaction();

            $existing = $this->one(
                $db,
                "SELECT id, status FROM PRODUCT_REVIEW_VOTES
                 WHERE review_id = :review_id AND user_id = :user_id LIMIT 1",
                [':review_id' => $reviewId, ':user_id' => $userId],
                'checkVote'
            );

            $isVoted = false;
            if ($existing['status'] === 'SUCCESS' && !empty($existing['data'])) {
                $voteId = (int) $existing['data']['id'];
                $currentStatus = $existing['data']['status'];
                $newStatus = $currentStatus === 'A' ? 'Z' : 'A';
                $isVoted = $newStatus === 'A';

                $db->createCommand(
                    "UPDATE PRODUCT_REVIEW_VOTES
                     SET status = :status, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                     WHERE id = :id",
                    [':status' => $newStatus, ':user_id' => $userId, ':id' => $voteId]
                )->execute();
            } else {
                $isVoted = true;
                $db->createCommand(
                    "INSERT INTO PRODUCT_REVIEW_VOTES
                     (tenant_id, review_id, user_id, vote_type, status, created_by, updated_by)
                     VALUES
                     (:tenant_id, :review_id, :user_id, 'HELPFUL', 'A', :created_by, :updated_by)",
                    [
                        ':tenant_id' => $tenantId,
                        ':review_id' => $reviewId,
                        ':user_id' => $userId,
                        ':created_by' => $userId,
                        ':updated_by' => $userId,
                    ]
                )->execute();
            }

            // Sync helpful_count on PRODUCT_REVIEWS
            $countRow = $this->one(
                $db,
                "SELECT COUNT(*) AS cnt FROM PRODUCT_REVIEW_VOTES
                 WHERE review_id = :review_id AND vote_type = 'HELPFUL' AND status = 'A'",
                [':review_id' => $reviewId],
                'countHelpful'
            );
            $helpfulCount = (int) ($countRow['data']['cnt'] ?? 0);

            $db->createCommand(
                "UPDATE PRODUCT_REVIEWS
                 SET helpful_count = :helpful_count, updated_on = CURRENT_TIMESTAMP
                 WHERE id = :review_id",
                [':helpful_count' => $helpfulCount, ':review_id' => $reviewId]
            )->execute();

            $transaction->commit();

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = [
                'review_id' => $reviewId,
                'user_voted_helpful' => $isVoted,
                'helpful_count' => $helpfulCount,
            ];
        } catch (Throwable $exception) {
            if (isset($transaction) && $transaction->isActive()) {
                $transaction->rollBack();
            }
            return $this->error('toggleHelpfulVote', $exception);
        }

        return $resArr;
    }

    public function reportReview(
        ConnectionInterface $db,
        int $tenantId,
        int $reviewId,
        int $userId,
        string $reason,
        ?string $details,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        try {
            $db->createCommand(
                "INSERT INTO PRODUCT_REVIEW_REPORTS
                 (tenant_id, review_id, reporter_user_id, report_reason, report_details,
                  report_status, status, created_by, updated_by)
                 VALUES
                 (:tenant_id, :review_id, :reporter_user_id, :reason, :details,
                  'OPEN', 'A', :created_by, :updated_by)",
                [
                    ':tenant_id' => $tenantId,
                    ':review_id' => $reviewId,
                    ':reporter_user_id' => $userId,
                    ':reason' => $reason,
                    ':details' => $details,
                    ':created_by' => $userId,
                    ':updated_by' => $userId,
                ]
            )->execute();

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId(), 'report_status' => 'OPEN'];
        } catch (Throwable $exception) {
            return $this->error('reportReview', $exception);
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
        $this->logger->error('ProductReviewDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Product review data operation failed.';
        return $resArr;
    }
}
