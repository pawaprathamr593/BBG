<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class EngagementDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getPublicContentTenant(ConnectionInterface $db, string $contentType, int $contentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $sql = match ($contentType) {
            'BUSINESS' => "SELECT bp.tenant_id FROM BUSINESS_PROFILES bp
                INNER JOIN TENANTS t ON t.id = bp.tenant_id
                    AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
                INNER JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = bp.tenant_id
                    AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
                WHERE bp.id = :content_id AND bp.approval_status = 'APPROVED'
                    AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A' LIMIT 1",
            'PRODUCT' => "SELECT p.tenant_id FROM PRODUCTS p
                INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = p.tenant_id
                    AND bp.approval_status = 'APPROVED' AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
                INNER JOIN TENANTS t ON t.id = p.tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
                INNER JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = p.tenant_id
                    AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
                WHERE p.id = :content_id AND p.product_status = 'ACTIVE'
                    AND p.publication_status = 'PUBLISHED' AND p.status = 'A' LIMIT 1",
            'POST' => "SELECT pp.tenant_id FROM PROMOTIONAL_POSTS pp
                INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = pp.tenant_id
                    AND bp.approval_status = 'APPROVED' AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
                INNER JOIN TENANTS t ON t.id = pp.tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
                INNER JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = pp.tenant_id
                    AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
                WHERE pp.id = :content_id AND pp.publication_status = 'PUBLISHED'
                    AND pp.published_on <= CURRENT_TIMESTAMP
                    AND (pp.valid_until IS NULL OR pp.valid_until >= CURRENT_TIMESTAMP)
                    AND pp.status = 'A' LIMIT 1",
            default => null,
        };
        if ($sql === null) {
            $resArr['msgArr'][] = 'Unsupported content_type.';
            return $resArr;
        }
        return $this->one($db, $sql, [':content_id' => $contentId], 'getPublicContentTenant');
    }

    public function getLike(ConnectionInterface $db, int $tenantId, int $userId, string $contentType, int $contentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, status FROM CONTENT_LIKES
            WHERE tenant_id = :tenant_id AND user_id = :user_id
                AND content_type = :content_type AND content_id = :content_id
            ORDER BY id DESC LIMIT 1",
            [':tenant_id' => $tenantId, ':user_id' => $userId, ':content_type' => $contentType, ':content_id' => $contentId],
            'getLike');
    }

    public function insertLike(ConnectionInterface $db, int $tenantId, int $userId, string $contentType, int $contentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CONTENT_LIKES
                (tenant_id, user_id, content_type, content_id, liked_on, status, created_by, updated_by)
                VALUES (:tenant_id, :user_id, :content_type, :content_id, CURRENT_TIMESTAMP, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':user_id' => $userId, ':content_type' => $contentType, ':content_id' => $contentId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId(), 'liked' => true];
        } catch (Throwable $exception) {
            return $this->error('insertLike', $exception);
        }
        return $resArr;
    }

    public function updateLikeStatus(ConnectionInterface $db, int $likeId, int $userId, string $status): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE CONTENT_LIKES
                SET status = :status, liked_on = CASE WHEN :status_for_date = 'A' THEN CURRENT_TIMESTAMP ELSE liked_on END,
                    updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id",
                [':status' => $status, ':status_for_date' => $status, ':user_id' => $userId, ':id' => $likeId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Like record was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $likeId, 'liked' => $status === 'A'];
        } catch (Throwable $exception) {
            return $this->error('updateLikeStatus', $exception);
        }
        return $resArr;
    }

    public function getComments(ConnectionInterface $db, int $tenantId, string $contentType, int $contentId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT c.id, c.user_id, u.full_name AS author_name,
            c.parent_comment_id, c.comment_text, c.commented_on
            FROM COMMENTS c
            INNER JOIN USERS u ON u.id = c.user_id AND u.account_status = 'ACTIVE' AND u.status = 'A'
            WHERE c.tenant_id = :tenant_id AND c.content_type = :content_type
                AND c.content_id = :content_id AND c.moderation_status = 'VISIBLE' AND c.status = 'A'
            ORDER BY c.commented_on ASC, c.id ASC LIMIT :limit OFFSET :offset",
            [':tenant_id' => $tenantId, ':content_type' => $contentType, ':content_id' => $contentId,
             ':limit' => $limit, ':offset' => $offset], 'getComments');
    }

    public function getParentComment(ConnectionInterface $db, int $tenantId, string $contentType, int $contentId, int $commentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM COMMENTS
            WHERE id = :id AND tenant_id = :tenant_id AND content_type = :content_type
                AND content_id = :content_id AND moderation_status = 'VISIBLE' AND status = 'A'
            LIMIT 1",
            [':id' => $commentId, ':tenant_id' => $tenantId, ':content_type' => $contentType, ':content_id' => $contentId],
            'getParentComment');
    }

    public function insertComment(ConnectionInterface $db, int $tenantId, int $userId, string $contentType, int $contentId, ?int $parentId, string $commentText): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO COMMENTS
                (tenant_id, user_id, content_type, content_id, parent_comment_id, comment_text,
                 moderation_status, commented_on, status, created_by, updated_by)
                VALUES (:tenant_id, :user_id, :content_type, :content_id, :parent_id, :comment_text,
                 'VISIBLE', CURRENT_TIMESTAMP, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':user_id' => $userId, ':content_type' => $contentType,
                 ':content_id' => $contentId, ':parent_id' => $parentId, ':comment_text' => $commentText])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertComment', $exception);
        }
        return $resArr;
    }

    public function insertReport(ConnectionInterface $db, int $tenantId, int $userId, string $contentType, int $contentId, string $reason, string $details): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CONTENT_REPORTS
                (tenant_id, reporter_user_id, content_type, content_id, report_reason,
                 report_details, report_status, status, created_by, updated_by)
                VALUES (:tenant_id, :user_id, :content_type, :content_id, :reason,
                 :details, 'OPEN', 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':user_id' => $userId, ':content_type' => $contentType,
                 ':content_id' => $contentId, ':reason' => $reason, ':details' => $details])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertReport', $exception);
        }
        return $resArr;
    }

    public function insertView(ConnectionInterface $db, int $tenantId, ?int $userId, ?string $visitorKey, string $contentType, int $contentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CONTENT_VIEWS
                (tenant_id, content_type, content_id, user_id, visitor_key, viewed_on, status, created_by, updated_by)
                VALUES (:tenant_id, :content_type, :content_id, :user_id, :visitor_key,
                    CURRENT_TIMESTAMP, 'A', :created_by, :created_by)",
                [':tenant_id' => $tenantId, ':content_type' => $contentType, ':content_id' => $contentId,
                 ':user_id' => $userId, ':visitor_key' => $visitorKey, ':created_by' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['recorded' => true];
        } catch (Throwable $exception) {
            return $this->error('insertView', $exception);
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
        $this->logger->error('EngagementDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Engagement data operation failed.';
        return $resArr;
    }
}
