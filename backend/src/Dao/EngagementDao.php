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
            'COMMENT' => "SELECT c.tenant_id FROM COMMENTS c
                INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = c.tenant_id
                    AND bp.approval_status = 'APPROVED' AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
                INNER JOIN TENANTS t ON t.id = c.tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
                INNER JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = c.tenant_id
                    AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
                WHERE c.id = :content_id AND c.moderation_status = 'VISIBLE' AND c.status = 'A' LIMIT 1",
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
        return $this->one($db, "SELECT id, status, reaction_type FROM CONTENT_LIKES
            WHERE tenant_id = :tenant_id AND user_id = :user_id
                AND content_type = :content_type AND content_id = :content_id
            ORDER BY id DESC LIMIT 1",
            [':tenant_id' => $tenantId, ':user_id' => $userId, ':content_type' => $contentType, ':content_id' => $contentId],
            'getLike');
    }

    public function insertLike(ConnectionInterface $db, int $tenantId, int $userId, string $contentType, int $contentId, string $reactionType = 'LIKE'): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CONTENT_LIKES
                (tenant_id, user_id, content_type, content_id, reaction_type, liked_on, status, created_by, updated_by)
                VALUES (:tenant_id, :user_id, :content_type, :content_id, :reaction_type, CURRENT_TIMESTAMP, 'A', :created_by, :updated_by)",
                [':tenant_id' => $tenantId, ':user_id' => $userId, ':content_type' => $contentType,
                 ':content_id' => $contentId, ':reaction_type' => $reactionType,
                 ':created_by' => $userId, ':updated_by' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId(), 'liked' => true, 'reaction_type' => $reactionType];
        } catch (Throwable $exception) {
            return $this->error('insertLike', $exception);
        }
        return $resArr;
    }

    public function updateLikeReaction(ConnectionInterface $db, int $likeId, int $userId, string $status, ?string $reactionType = null): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $reactionClause = $reactionType !== null ? ', reaction_type = :reaction_type' : '';
            $params = [
                ':status' => $status,
                ':status_for_date' => $status,
                ':user_id' => $userId,
                ':id' => $likeId,
            ];
            if ($reactionType !== null) {
                $params[':reaction_type'] = $reactionType;
            }

            $affected = $db->createCommand("UPDATE CONTENT_LIKES
                SET status = :status, liked_on = CASE WHEN :status_for_date = 'A' THEN CURRENT_TIMESTAMP ELSE liked_on END,
                    updated_by = :user_id, updated_on = CURRENT_TIMESTAMP {$reactionClause}
                WHERE id = :id",
                $params)->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Like record was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $likeId, 'liked' => $status === 'A', 'reaction_type' => $status === 'A' ? $reactionType : null];
        } catch (Throwable $exception) {
            return $this->error('updateLikeReaction', $exception);
        }
        return $resArr;
    }

    public function getReactionSummary(ConnectionInterface $db, int $tenantId, string $contentType, int $contentId, ?int $userId = null): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $sql = "SELECT
            COUNT(*) AS total_likes,
            COALESCE(SUM(CASE WHEN reaction_type = 'LIKE' THEN 1 ELSE 0 END), 0) AS count_like,
            COALESCE(SUM(CASE WHEN reaction_type = 'LOVE' THEN 1 ELSE 0 END), 0) AS count_love,
            COALESCE(SUM(CASE WHEN reaction_type = 'HAHA' THEN 1 ELSE 0 END), 0) AS count_haha,
            COALESCE(SUM(CASE WHEN reaction_type = 'WOW' THEN 1 ELSE 0 END), 0) AS count_wow,
            COALESCE(SUM(CASE WHEN reaction_type = 'SAD' THEN 1 ELSE 0 END), 0) AS count_sad,
            COALESCE(SUM(CASE WHEN reaction_type = 'ANGRY' THEN 1 ELSE 0 END), 0) AS count_angry
        FROM CONTENT_LIKES
        WHERE tenant_id = :tenant_id AND content_type = :content_type AND content_id = :content_id AND status = 'A'";

        $summary = $this->one($db, $sql, [':tenant_id' => $tenantId, ':content_type' => $contentType, ':content_id' => $contentId], 'getReactionSummary');
        if ($summary['status'] !== 'SUCCESS') {
            return $summary;
        }

        $userReaction = null;
        if ($userId !== null) {
            $userRow = $this->one($db, "SELECT reaction_type FROM CONTENT_LIKES
                WHERE tenant_id = :tenant_id AND user_id = :user_id
                    AND content_type = :content_type AND content_id = :content_id AND status = 'A'
                ORDER BY id DESC LIMIT 1",
                [':tenant_id' => $tenantId, ':user_id' => $userId, ':content_type' => $contentType, ':content_id' => $contentId],
                'getUserReaction');
            if ($userRow['status'] === 'SUCCESS' && !empty($userRow['data']['reaction_type'])) {
                $userReaction = (string) $userRow['data']['reaction_type'];
            }
        }

        $row = $summary['data'];
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'total_likes' => (int) ($row['total_likes'] ?? 0),
            'user_reaction' => $userReaction,
            'reactions' => [
                'LIKE' => (int) ($row['count_like'] ?? 0),
                'LOVE' => (int) ($row['count_love'] ?? 0),
                'HAHA' => (int) ($row['count_haha'] ?? 0),
                'WOW' => (int) ($row['count_wow'] ?? 0),
                'SAD' => (int) ($row['count_sad'] ?? 0),
                'ANGRY' => (int) ($row['count_angry'] ?? 0),
            ],
        ];
        return $resArr;
    }

    public function getComments(ConnectionInterface $db, int $tenantId, string $contentType, int $contentId, int $limit, int $offset, ?int $currentUserId = null): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];

        $isAuthorSql = $currentUserId !== null ? "(c.user_id = :current_user_id)" : "0";
        $userLikedSql = $currentUserId !== null
            ? "(SELECT COUNT(*) FROM CONTENT_LIKES cl_me WHERE cl_me.tenant_id = c.tenant_id AND cl_me.content_type = 'COMMENT' AND cl_me.content_id = c.id AND cl_me.user_id = :liked_user_id AND cl_me.status = 'A') > 0"
            : "0";
        $params = [
            ':tenant_id' => $tenantId,
            ':content_type' => $contentType,
            ':content_id' => $contentId,
            ':limit' => $limit,
            ':offset' => $offset,
        ];
        if ($currentUserId !== null) {
            $params[':current_user_id'] = $currentUserId;
            $params[':liked_user_id'] = $currentUserId;
        }

        $rows = $this->many($db, "SELECT c.id, c.tenant_id, c.user_id, u.full_name AS author_name,
            c.parent_comment_id, c.comment_text, c.commented_on,
            {$isAuthorSql} AS is_author,
            (SELECT COUNT(*) FROM CONTENT_LIKES cl WHERE cl.tenant_id = c.tenant_id AND cl.content_type = 'COMMENT' AND cl.content_id = c.id AND cl.status = 'A') AS like_count,
            {$userLikedSql} AS user_liked
            FROM COMMENTS c
            INNER JOIN USERS u ON u.id = c.user_id AND u.status = 'A'
            WHERE c.tenant_id = :tenant_id AND c.content_type = :content_type
                AND c.content_id = :content_id AND c.moderation_status = 'VISIBLE' AND c.status = 'A'
            ORDER BY c.commented_on ASC, c.id ASC LIMIT :limit OFFSET :offset",
            $params, 'getComments');

        if ($rows['status'] !== 'SUCCESS') {
            return $rows;
        }

        $items = $rows['data'];
        foreach ($items as &$item) {
            $item['id'] = (int) $item['id'];
            $item['tenant_id'] = (int) $item['tenant_id'];
            $item['user_id'] = (int) $item['user_id'];
            $item['parent_comment_id'] = $item['parent_comment_id'] !== null ? (int) $item['parent_comment_id'] : null;
            $item['is_author'] = (bool) ($item['is_author'] ?? false);
            $item['like_count'] = (int) ($item['like_count'] ?? 0);
            $item['user_liked'] = (bool) ($item['user_liked'] ?? false);
        }
        unset($item);

        $countRow = $this->one($db, "SELECT COUNT(*) AS total_count FROM COMMENTS
            WHERE tenant_id = :tenant_id AND content_type = :content_type
                AND content_id = :content_id AND moderation_status = 'VISIBLE' AND status = 'A'",
            [':tenant_id' => $tenantId, ':content_type' => $contentType, ':content_id' => $contentId],
            'countComments');

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $items,
            'total_count' => (int) ($countRow['data']['total_count'] ?? 0),
        ];
        return $resArr;
    }

    public function getCommentById(ConnectionInterface $db, int $commentId): array
    {
        return $this->one($db, "SELECT * FROM COMMENTS WHERE id = :id AND status = 'A' LIMIT 1",
            [':id' => $commentId], 'getCommentById');
    }

    public function updateComment(ConnectionInterface $db, int $tenantId, int $commentId, int $userId, string $commentText): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE COMMENTS
                SET comment_text = :comment_text, updated_by = :updated_by, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND user_id = :user_id AND status = 'A'",
                [':comment_text' => $commentText, ':updated_by' => $userId, ':user_id' => $userId, ':id' => $commentId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Comment was not found or you are not authorized to update it.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $commentId];
        } catch (Throwable $exception) {
            return $this->error('updateComment', $exception);
        }
        return $resArr;
    }

    public function softDeleteComment(ConnectionInterface $db, int $tenantId, int $commentId, int $userId, bool $isAdmin = false): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $whereUser = $isAdmin ? '' : ' AND user_id = :user_id';
            $params = [':id' => $commentId, ':tenant_id' => $tenantId, ':updated_by' => $userId];
            if (!$isAdmin) {
                $params[':user_id'] = $userId;
            }
            $affected = $db->createCommand("UPDATE COMMENTS
                SET status = 'Z', updated_by = :updated_by, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND status = 'A'{$whereUser}",
                $params)->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Comment was not found or you are not authorized to delete it.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $commentId, 'deleted' => true];
        } catch (Throwable $exception) {
            return $this->error('softDeleteComment', $exception);
        }
        return $resArr;
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
                 'VISIBLE', CURRENT_TIMESTAMP, 'A', :created_by, :updated_by)",
                [':tenant_id' => $tenantId, ':user_id' => $userId, ':content_type' => $contentType,
                 ':content_id' => $contentId, ':parent_id' => $parentId, ':comment_text' => $commentText,
                 ':created_by' => $userId, ':updated_by' => $userId])->execute();
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
                VALUES (:tenant_id, :reporter_user_id, :content_type, :content_id, :reason,
                 :details, 'OPEN', 'A', :created_by, :updated_by)",
                [':tenant_id' => $tenantId, ':reporter_user_id' => $userId, ':content_type' => $contentType,
                 ':content_id' => $contentId, ':reason' => $reason, ':details' => $details,
                 ':created_by' => $userId, ':updated_by' => $userId])->execute();
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
                    CURRENT_TIMESTAMP, 'A', :created_by, :updated_by)",
                [':tenant_id' => $tenantId, ':content_type' => $contentType, ':content_id' => $contentId,
                 ':user_id' => $userId, ':visitor_key' => $visitorKey,
                 ':created_by' => $userId, ':updated_by' => $userId])->execute();
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
