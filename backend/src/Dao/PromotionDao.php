<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class PromotionDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function hasPromotionEntitlement(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT ts.id
            FROM TENANT_SUBSCRIPTIONS ts
            INNER JOIN PLAN_ENTITLEMENTS pe ON pe.plan_id = ts.plan_id
                AND pe.entitlement_code IN ('promotions.enabled', 'DAILY_PROMOTION_LIMIT', 'PROMOTIONAL_POSTS')
                AND (UPPER(pe.entitlement_value) IN ('1', 'TRUE', 'YES') OR CAST(pe.entitlement_value AS SIGNED) > 0)
                AND pe.status = 'A'
            WHERE ts.tenant_id = :tenant_id AND ts.subscription_status = 'ACTIVE'
                AND ts.status = 'A'
                AND (ts.starts_on IS NULL OR ts.starts_on <= CURRENT_TIMESTAMP)
                AND (ts.ends_on IS NULL OR DATE_ADD(ts.ends_on, INTERVAL 2 DAY) >= CURRENT_TIMESTAMP)
            LIMIT 1", [':tenant_id' => $tenantId], 'hasPromotionEntitlement');
    }

    public function getMyPromotions(ConnectionInterface $db, int $tenantId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, post_title, post_content, publication_status,
            published_on, valid_until, created_on
            FROM PROMOTIONAL_POSTS
            WHERE tenant_id = :tenant_id AND status = 'A'
            ORDER BY created_on DESC, id DESC LIMIT :limit OFFSET :offset",
            [':tenant_id' => $tenantId, ':limit' => $limit, ':offset' => $offset], 'getMyPromotions');
    }

    public function countMyPromotions(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM PROMOTIONAL_POSTS
            WHERE tenant_id = :tenant_id AND status = 'A'", [':tenant_id' => $tenantId], 'countMyPromotions');
    }

    public function getMyPromotion(ConnectionInterface $db, int $tenantId, int $promotionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, tenant_id, post_title, post_content, publication_status,
            published_on, valid_until, created_on
            FROM PROMOTIONAL_POSTS
            WHERE id = :id AND tenant_id = :tenant_id AND status = 'A' LIMIT 1",
            [':id' => $promotionId, ':tenant_id' => $tenantId], 'getMyPromotion');
    }

    public function insertPromotion(ConnectionInterface $db, int $tenantId, ?string $title, string $content, ?string $validUntil, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO PROMOTIONAL_POSTS
                (tenant_id, post_title, post_content, publication_status, valid_until, status, created_by, updated_by)
                VALUES (:tenant_id, :title, :content, 'DRAFT', :valid_until, 'A', :created_by, :updated_by)",
                [':tenant_id' => $tenantId, ':title' => $title, ':content' => $content,
                 ':valid_until' => $validUntil, ':created_by' => $userId, ':updated_by' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertPromotion', $exception);
        }
        return $resArr;
    }

    public function updatePromotion(ConnectionInterface $db, int $tenantId, int $promotionId, ?string $title, string $content, ?string $validUntil, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE PROMOTIONAL_POSTS
                SET post_title = :title, post_content = :content, valid_until = :valid_until,
                    updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND status = 'A'
                    AND publication_status <> 'PUBLISHED'",
                [':title' => $title, ':content' => $content, ':valid_until' => $validUntil,
                 ':user_id' => $userId, ':id' => $promotionId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Promotion was not found or cannot be edited while published.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $promotionId];
        } catch (Throwable $exception) {
            return $this->error('updatePromotion', $exception);
        }
        return $resArr;
    }

    public function setPromotionPublicationStatus(ConnectionInterface $db, int $tenantId, int $promotionId, int $userId, string $publicationStatus): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $publishedOn = $publicationStatus === 'PUBLISHED' ? ', published_on = UTC_TIMESTAMP()' : '';
            $affected = $db->createCommand("UPDATE PROMOTIONAL_POSTS
                SET publication_status = :publication_status, updated_by = :user_id,
                    updated_on = CURRENT_TIMESTAMP" . $publishedOn . "
                WHERE id = :id AND tenant_id = :tenant_id AND status = 'A'",
                [':publication_status' => $publicationStatus, ':user_id' => $userId,
                 ':id' => $promotionId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Promotion was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $promotionId, 'publication_status' => $publicationStatus];
        } catch (Throwable $exception) {
            return $this->error('setPromotionPublicationStatus', $exception);
        }
        return $resArr;
    }

    public function softDeletePromotion(ConnectionInterface $db, int $tenantId, int $promotionId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE PROMOTIONAL_POSTS SET status = 'Z',
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND status = 'A'",
                [':user_id' => $userId, ':id' => $promotionId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Promotion was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $promotionId];
        } catch (Throwable $exception) {
            return $this->error('softDeletePromotion', $exception);
        }
        return $resArr;
    }

    public function getPromotionMedia(ConnectionInterface $db, int $tenantId, int $promotionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, file_path, media_type, display_order,
            (CASE WHEN display_order = 0 THEN 1 ELSE 0 END) AS is_primary
            FROM POST_MEDIA WHERE tenant_id = :tenant_id AND post_id = :post_id AND status = 'A'
            ORDER BY display_order ASC, id ASC",
            [':tenant_id' => $tenantId, ':post_id' => $promotionId], 'getPromotionMedia');
    }

    public function softDeleteAllPromotionMedia(ConnectionInterface $db, int $tenantId, int $promotionId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE POST_MEDIA SET status = 'Z',
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND post_id = :post_id AND status = 'A'",
                [':user_id' => $userId, ':tenant_id' => $tenantId, ':post_id' => $promotionId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['deleted_count' => $affected];
        } catch (Throwable $exception) {
            return $this->error('softDeleteAllPromotionMedia', $exception);
        }
        return $resArr;
    }

    public function getPromotionMediaRecord(ConnectionInterface $db, int $tenantId, int $promotionId, int $mediaId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, file_path FROM POST_MEDIA
            WHERE id = :media_id AND tenant_id = :tenant_id AND post_id = :post_id AND status = 'A' LIMIT 1",
            [':media_id' => $mediaId, ':tenant_id' => $tenantId, ':post_id' => $promotionId],
            'getPromotionMediaRecord');
    }

    public function insertPromotionMedia(
        ConnectionInterface $db,
        int $tenantId,
        int $promotionId,
        string $filePath,
        string $mediaType,
        int $displayOrder,
        int $userId,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO POST_MEDIA
                (tenant_id, post_id, file_path, media_type, display_order, status, created_by, updated_by)
                VALUES (:tenant_id, :post_id, :file_path, :media_type, :display_order, 'A', :created_by, :updated_by)",
                [':tenant_id' => $tenantId, ':post_id' => $promotionId, ':file_path' => $filePath,
                 ':media_type' => $mediaType, ':display_order' => $displayOrder,
                 ':created_by' => $userId, ':updated_by' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertPromotionMedia', $exception);
        }
        return $resArr;
    }

    public function softDeletePromotionMedia(
        ConnectionInterface $db,
        int $tenantId,
        int $promotionId,
        int $mediaId,
        int $userId,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE POST_MEDIA SET status = 'Z',
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :media_id AND tenant_id = :tenant_id AND post_id = :post_id AND status = 'A'",
                [':user_id' => $userId, ':media_id' => $mediaId,
                 ':tenant_id' => $tenantId, ':post_id' => $promotionId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Post media was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $mediaId];
        } catch (Throwable $exception) {
            return $this->error('softDeletePromotionMedia', $exception);
        }
        return $resArr;
    }

    public function setPrimaryPromotionMedia(
        ConnectionInterface $db,
        int $tenantId,
        int $promotionId,
        int $mediaId,
        int $userId,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $transaction = $db->beginTransaction();
        try {
            $existing = $db->createCommand("SELECT id, display_order FROM POST_MEDIA
                WHERE id = :media_id AND tenant_id = :tenant_id AND post_id = :post_id AND status = 'A'",
                [':media_id' => $mediaId, ':tenant_id' => $tenantId, ':post_id' => $promotionId])->queryOne();
            if (!$existing) {
                $transaction->rollBack();
                $resArr['msgArr'][] = 'Promotion media record was not found.';
                return $resArr;
            }

            $db->createCommand("UPDATE POST_MEDIA SET display_order = display_order + 1,
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND post_id = :post_id AND id != :media_id AND status = 'A'",
                [':user_id' => $userId, ':tenant_id' => $tenantId, ':post_id' => $promotionId, ':media_id' => $mediaId])->execute();

            $db->createCommand("UPDATE POST_MEDIA SET display_order = 0,
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :media_id AND tenant_id = :tenant_id AND post_id = :post_id AND status = 'A'",
                [':user_id' => $userId, ':media_id' => $mediaId, ':tenant_id' => $tenantId, ':post_id' => $promotionId])->execute();

            $transaction->commit();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['media_id' => $mediaId, 'is_primary' => 1];
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            return $this->error('setPrimaryPromotionMedia', $exception);
        }
        return $resArr;
    }

    public function getPromotionEngagement(ConnectionInterface $db, int $tenantId, int $promotionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT
            (SELECT COUNT(*) FROM CONTENT_LIKES
                WHERE tenant_id = :tenant_like AND content_type = 'POST'
                    AND content_id = :post_like AND status = 'A') AS like_count,
            (SELECT COUNT(*) FROM COMMENTS
                WHERE tenant_id = :tenant_comment AND content_type = 'POST'
                    AND content_id = :post_comment AND moderation_status = 'VISIBLE' AND status = 'A') AS comment_count,
            (SELECT COUNT(*) FROM CONTENT_VIEWS
                WHERE tenant_id = :tenant_view AND content_type = 'POST'
                    AND content_id = :post_view AND status = 'A') AS view_count",
            [':tenant_like' => $tenantId, ':post_like' => $promotionId,
             ':tenant_comment' => $tenantId, ':post_comment' => $promotionId,
             ':tenant_view' => $tenantId, ':post_view' => $promotionId], 'getPromotionEngagement');
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
        $this->logger->error('PromotionDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Promotion data operation failed.';
        return $resArr;
    }
}
