<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class AdminDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function hasPlatformPermission(ConnectionInterface $db, int $userId, string $permissionCode): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT p.id
            FROM USER_ROLE_ASSIGNMENTS ura
            INNER JOIN ROLES r ON r.id = ura.role_id AND r.scope_type = 'PLATFORM' AND r.status = 'A'
            INNER JOIN ROLE_PERMISSIONS rp ON rp.role_id = r.id AND rp.status = 'A'
            INNER JOIN PERMISSIONS p ON p.id = rp.permission_id
                AND p.permission_code = :permission_code AND p.status = 'A'
            WHERE ura.user_id = :user_id AND ura.tenant_id IS NULL AND ura.status = 'A'
                AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
            LIMIT 1",
            [':user_id' => $userId, ':permission_code' => $permissionCode], 'hasPlatformPermission');
    }

    public function getUsers(ConnectionInterface $db, string $search, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [':limit' => $limit, ':offset' => $offset];
        $searchSql = '';
        if ($search !== '') {
            $searchSql = ' AND (full_name LIKE :name OR email LIKE :email OR mobile LIKE :mobile)';
            $needle = '%' . $search . '%';
            $params[':name'] = $needle;
            $params[':email'] = $needle;
            $params[':mobile'] = $needle;
        }
        return $this->many($db, "SELECT id, full_name, email, mobile, account_status,
            email_verified_on, mobile_verified_on, last_login_on, created_on
            FROM USERS WHERE status = 'A' " . $searchSql . "
            ORDER BY created_on DESC, id DESC LIMIT :limit OFFSET :offset", $params, 'getUsers');
    }

    public function countUsers(ConnectionInterface $db, string $search): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [];
        $searchSql = '';
        if ($search !== '') {
            $searchSql = ' AND (full_name LIKE :name OR email LIKE :email OR mobile LIKE :mobile)';
            $needle = '%' . $search . '%';
            $params = [':name' => $needle, ':email' => $needle, ':mobile' => $needle];
        }
        return $this->one($db, "SELECT COUNT(*) AS total FROM USERS WHERE status = 'A' " . $searchSql, $params, 'countUsers');
    }

    public function getUser(ConnectionInterface $db, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, full_name, email, mobile, account_status,
            email_verified_on, mobile_verified_on, last_login_on, created_on
            FROM USERS WHERE id = :id AND status = 'A' LIMIT 1", [':id' => $userId], 'getUser');
    }

    public function setUserAccountStatus(ConnectionInterface $db, int $userId, int $adminId, string $accountStatus): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE USERS SET account_status = :account_status,
                updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND status = 'A'",
                [':account_status' => $accountStatus, ':admin_id' => $adminId, ':id' => $userId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'User account was not found or no change was required.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['user_id' => $userId, 'account_status' => $accountStatus];
        } catch (Throwable $exception) {
            return $this->error('setUserAccountStatus', $exception);
        }
        return $resArr;
    }

    public function getPendingBusinesses(ConnectionInterface $db, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT bp.id AS business_id, bp.tenant_id, bp.business_name,
            bp.business_slug, bp.primary_category_id, bp.business_phone, bp.business_email,
            bp.city, bp.state, bp.approval_status, bp.created_on, t.tenant_status
            FROM BUSINESS_PROFILES bp
            INNER JOIN TENANTS t ON t.id = bp.tenant_id AND t.status = 'A'
            WHERE bp.approval_status = 'PENDING' AND bp.status = 'A'
            ORDER BY bp.created_on ASC, bp.id ASC LIMIT :limit OFFSET :offset",
            [':limit' => $limit, ':offset' => $offset], 'getPendingBusinesses');
    }

    public function countPendingBusinesses(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM BUSINESS_PROFILES
            WHERE approval_status = 'PENDING' AND status = 'A'", [], 'countPendingBusinesses');
    }

    public function getBusinessForReview(ConnectionInterface $db, int $businessId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT bp.*, t.tenant_code, t.tenant_name, t.tenant_type, t.tenant_status
            FROM BUSINESS_PROFILES bp
            INNER JOIN TENANTS t ON t.id = bp.tenant_id AND t.status = 'A'
            WHERE bp.id = :id AND bp.status = 'A' LIMIT 1",
            [':id' => $businessId], 'getBusinessForReview');
    }

    public function setBusinessApproval(ConnectionInterface $db, int $businessId, int $tenantId, int $adminId, string $newStatus, ?string $reason): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE BUSINESS_PROFILES
                SET approval_status = :new_status,
                    approved_by = CASE WHEN :approved_flag = 1 THEN :admin_id ELSE NULL END,
                    approved_on = CASE WHEN :approved_flag = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
                    rejection_reason = :reason,
                    updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :business_id AND tenant_id = :tenant_id
                    AND approval_status IN ('PENDING', 'REJECTED') AND status = 'A'",
                [':new_status' => $newStatus, ':approved_flag' => $newStatus === 'APPROVED' ? 1 : 0,
                 ':admin_id' => $adminId, ':reason' => $reason,
                 ':business_id' => $businessId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Business application state changed or is not reviewable.';
                return $resArr;
            }
            $tenantStatus = $newStatus === 'APPROVED' ? 'ACTIVE' : 'PENDING';
            $db->createCommand("UPDATE TENANTS SET tenant_status = :tenant_status,
                updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :tenant_id AND status = 'A'",
                [':tenant_status' => $tenantStatus, ':admin_id' => $adminId, ':tenant_id' => $tenantId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['business_id' => $businessId, 'tenant_id' => $tenantId, 'approval_status' => $newStatus];
        } catch (Throwable $exception) {
            return $this->error('setBusinessApproval', $exception);
        }
        return $resArr;
    }

    public function getPendingSubscriptions(ConnectionInterface $db, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT ts.id AS subscription_id, ts.tenant_id, t.tenant_name,
            ts.plan_id, p.plan_name, ts.subscription_status, ts.amount, ts.currency, ts.created_on,
            proof.id AS proof_id, proof.payment_reference, proof.proof_file_path,
            proof.submitted_on, proof.review_status
            FROM TENANT_SUBSCRIPTIONS ts
            INNER JOIN TENANTS t ON t.id = ts.tenant_id AND t.status = 'A'
            INNER JOIN PLANS p ON p.id = ts.plan_id AND p.status = 'A'
            LEFT JOIN SUBSCRIPTION_PAYMENT_PROOFS proof ON proof.subscription_id = ts.id
                AND proof.tenant_id = ts.tenant_id AND proof.status = 'A'
            WHERE ts.subscription_status = 'PENDING' AND ts.status = 'A'
            ORDER BY ts.created_on ASC, ts.id ASC LIMIT :limit OFFSET :offset",
            [':limit' => $limit, ':offset' => $offset], 'getPendingSubscriptions');
    }

    public function countPendingSubscriptions(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM TENANT_SUBSCRIPTIONS
            WHERE subscription_status = 'PENDING' AND status = 'A'", [], 'countPendingSubscriptions');
    }

    public function getSubscriptionForReview(ConnectionInterface $db, int $subscriptionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT ts.*, t.tenant_name, p.plan_code, p.plan_name, p.billing_cycle,
            p.description AS plan_description
            FROM TENANT_SUBSCRIPTIONS ts
            INNER JOIN TENANTS t ON t.id = ts.tenant_id AND t.status = 'A'
            INNER JOIN PLANS p ON p.id = ts.plan_id AND p.status = 'A'
            WHERE ts.id = :id AND ts.status = 'A' LIMIT 1",
            [':id' => $subscriptionId], 'getSubscriptionForReview');
    }

    public function getSubscriptionProofs(ConnectionInterface $db, int $tenantId, int $subscriptionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, payment_reference, proof_file_path, submitted_on,
            reviewed_by, reviewed_on, review_status, review_notes
            FROM SUBSCRIPTION_PAYMENT_PROOFS
            WHERE tenant_id = :tenant_id AND subscription_id = :subscription_id AND status = 'A'
            ORDER BY submitted_on DESC, id DESC",
            [':tenant_id' => $tenantId, ':subscription_id' => $subscriptionId], 'getSubscriptionProofs');
    }

    public function approveSubscription(ConnectionInterface $db, int $subscriptionId, int $tenantId, int $adminId, string $startsOn, string $endsOn): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE TENANT_SUBSCRIPTIONS
                SET subscription_status = 'ACTIVE', starts_on = :starts_on, ends_on = :ends_on,
                    approved_by = :admin_id, approved_on = CURRENT_TIMESTAMP, rejection_reason = NULL,
                    updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id
                    AND subscription_status = 'PENDING' AND status = 'A'",
                [':starts_on' => $startsOn, ':ends_on' => $endsOn, ':admin_id' => $adminId,
                 ':id' => $subscriptionId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Subscription state changed or is not pending.';
                return $resArr;
            }
            $db->createCommand("UPDATE SUBSCRIPTION_PAYMENT_PROOFS
                SET review_status = 'APPROVED', reviewed_by = :admin_id,
                    reviewed_on = CURRENT_TIMESTAMP, updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND subscription_id = :subscription_id
                    AND review_status = 'PENDING' AND status = 'A'",
                [':admin_id' => $adminId, ':tenant_id' => $tenantId, ':subscription_id' => $subscriptionId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['subscription_id' => $subscriptionId, 'subscription_status' => 'ACTIVE'];
        } catch (Throwable $exception) {
            return $this->error('approveSubscription', $exception);
        }
        return $resArr;
    }

    public function rejectSubscription(ConnectionInterface $db, int $subscriptionId, int $tenantId, int $adminId, string $reason): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE TENANT_SUBSCRIPTIONS
                SET subscription_status = 'REJECTED', rejection_reason = :reason,
                    approved_by = NULL, approved_on = NULL, updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id
                    AND subscription_status = 'PENDING' AND status = 'A'",
                [':reason' => $reason, ':admin_id' => $adminId, ':id' => $subscriptionId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Subscription state changed or is not pending.';
                return $resArr;
            }
            $db->createCommand("UPDATE SUBSCRIPTION_PAYMENT_PROOFS
                SET review_status = 'REJECTED', review_notes = :reason, reviewed_by = :admin_id,
                    reviewed_on = CURRENT_TIMESTAMP, updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND subscription_id = :subscription_id
                    AND review_status = 'PENDING' AND status = 'A'",
                [':reason' => $reason, ':admin_id' => $adminId, ':tenant_id' => $tenantId,
                 ':subscription_id' => $subscriptionId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['subscription_id' => $subscriptionId, 'subscription_status' => 'REJECTED'];
        } catch (Throwable $exception) {
            return $this->error('rejectSubscription', $exception);
        }
        return $resArr;
    }

    public function getActiveSubscriptions(ConnectionInterface $db, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT ts.id AS subscription_id, ts.tenant_id, t.tenant_name,
            p.plan_name, ts.starts_on, ts.ends_on, ts.renewal_due_on, ts.amount, ts.currency
            FROM TENANT_SUBSCRIPTIONS ts
            INNER JOIN TENANTS t ON t.id = ts.tenant_id AND t.status = 'A'
            INNER JOIN PLANS p ON p.id = ts.plan_id AND p.status = 'A'
            WHERE ts.subscription_status = 'ACTIVE' AND ts.status = 'A'
            ORDER BY ts.starts_on DESC, ts.id DESC LIMIT :limit OFFSET :offset",
            [':limit' => $limit, ':offset' => $offset], 'getActiveSubscriptions');
    }

    public function getCategories(ConnectionInterface $db, string $search, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [':limit' => $limit, ':offset' => $offset];
        $searchSql = '';
        if ($search !== '') {
            $searchSql = ' AND (category_name LIKE :name OR category_code LIKE :code)';
            $params[':name'] = '%' . $search . '%';
            $params[':code'] = '%' . $search . '%';
        }
        return $this->many($db, "SELECT id, parent_category_id, category_code, category_name,
            category_type, description, display_order, category_status
            FROM CATEGORIES WHERE status = 'A' " . $searchSql . "
            ORDER BY display_order ASC, category_name ASC LIMIT :limit OFFSET :offset",
            $params, 'getCategories');
    }

    public function countCategories(ConnectionInterface $db, string $search): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [];
        $searchSql = '';
        if ($search !== '') {
            $searchSql = ' AND (category_name LIKE :name OR category_code LIKE :code)';
            $params = [':name' => '%' . $search . '%', ':code' => '%' . $search . '%'];
        }
        return $this->one($db, "SELECT COUNT(*) AS total FROM CATEGORIES WHERE status = 'A' " . $searchSql, $params, 'countCategories');
    }

    public function isCategoryCodeAvailable(ConnectionInterface $db, string $code, int $excludeId = 0): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM CATEGORIES
            WHERE category_code = :code AND id <> :exclude_id AND status = 'A' LIMIT 1",
            [':code' => $code, ':exclude_id' => $excludeId], 'isCategoryCodeAvailable');
    }

    public function insertCategory(ConnectionInterface $db, ?int $parentId, string $code, string $name, string $type, string $description, int $displayOrder, int $adminId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CATEGORIES
                (parent_category_id, category_code, category_name, category_type, description,
                 display_order, category_status, status, created_by, updated_by)
                VALUES (:parent_id, :code, :name, :type, :description,
                 :display_order, 'ACTIVE', 'A', :admin_id, :admin_id)",
                [':parent_id' => $parentId, ':code' => $code, ':name' => $name, ':type' => $type,
                 ':description' => $description, ':display_order' => $displayOrder, ':admin_id' => $adminId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertCategory', $exception);
        }
        return $resArr;
    }

    public function updateCategory(ConnectionInterface $db, int $categoryId, ?int $parentId, string $code, string $name, string $type, string $description, int $displayOrder, int $adminId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE CATEGORIES
                SET parent_category_id = :parent_id, category_code = :code, category_name = :name,
                    category_type = :type, description = :description, display_order = :display_order,
                    updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND status = 'A'",
                [':parent_id' => $parentId, ':code' => $code, ':name' => $name, ':type' => $type,
                 ':description' => $description, ':display_order' => $displayOrder,
                 ':admin_id' => $adminId, ':id' => $categoryId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Category was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $categoryId];
        } catch (Throwable $exception) {
            return $this->error('updateCategory', $exception);
        }
        return $resArr;
    }

    public function hasCategoryDependencies(ConnectionInterface $db, int $categoryId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM BUSINESS_PROFILES
            WHERE primary_category_id = :business_category AND status = 'A'
            UNION ALL
            SELECT id FROM PRODUCTS WHERE global_category_id = :product_category AND status = 'A'
            LIMIT 1",
            [':business_category' => $categoryId, ':product_category' => $categoryId], 'hasCategoryDependencies');
    }

    public function softDeleteCategory(ConnectionInterface $db, int $categoryId, int $adminId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE CATEGORIES SET status = 'Z', category_status = 'INACTIVE',
                updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND status = 'A'",
                [':admin_id' => $adminId, ':id' => $categoryId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Category was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $categoryId];
        } catch (Throwable $exception) {
            return $this->error('softDeleteCategory', $exception);
        }
        return $resArr;
    }

    public function getCategoryStatistics(ConnectionInterface $db, int $categoryId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT
            (SELECT COUNT(*) FROM BUSINESS_PROFILES WHERE primary_category_id = :business_category AND status = 'A') AS business_count,
            (SELECT COUNT(*) FROM PRODUCTS WHERE global_category_id = :product_category AND status = 'A') AS product_count",
            [':business_category' => $categoryId, ':product_category' => $categoryId], 'getCategoryStatistics');
    }

    public function getAnalyticsSummary(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT
            (SELECT COUNT(*) FROM USERS WHERE status = 'A') AS total_users,
            (SELECT COUNT(*) FROM BUSINESS_PROFILES WHERE status = 'A') AS total_businesses,
            (SELECT COUNT(*) FROM BUSINESS_PROFILES WHERE approval_status = 'PENDING' AND status = 'A') AS pending_businesses,
            (SELECT COUNT(*) FROM TENANT_SUBSCRIPTIONS WHERE subscription_status = 'ACTIVE' AND status = 'A') AS active_subscriptions,
            (SELECT COUNT(*) FROM ORDERS WHERE status = 'A') AS total_orders,
            (SELECT COUNT(*) FROM CUSTOMER_ENQUIRIES WHERE status = 'A') AS total_enquiries,
            (SELECT COUNT(*) FROM PROMOTIONAL_POSTS WHERE status = 'A') AS total_promotions",
            [], 'getAnalyticsSummary');
    }

    public function getAnalyticsTrends(ConnectionInterface $db, string $startDate, string $endDate): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $params = [':start_users' => $startDate, ':end_users' => $endDate,
            ':start_business' => $startDate, ':end_business' => $endDate,
            ':start_orders' => $startDate, ':end_orders' => $endDate,
            ':start_enquiries' => $startDate, ':end_enquiries' => $endDate];
        return $this->many($db, "SELECT DATE(created_on) AS event_date, 'USERS' AS metric, COUNT(*) AS value
                FROM USERS WHERE created_on >= :start_users AND created_on < DATE_ADD(:end_users, INTERVAL 1 DAY) AND status = 'A'
                GROUP BY DATE(created_on)
            UNION ALL
            SELECT DATE(created_on), 'BUSINESSES', COUNT(*)
                FROM BUSINESS_PROFILES WHERE created_on >= :start_business AND created_on < DATE_ADD(:end_business, INTERVAL 1 DAY) AND status = 'A'
                GROUP BY DATE(created_on)
            UNION ALL
            SELECT DATE(ordered_on), 'ORDERS', COUNT(*)
                FROM ORDERS WHERE ordered_on >= :start_orders AND ordered_on < DATE_ADD(:end_orders, INTERVAL 1 DAY) AND status = 'A'
                GROUP BY DATE(ordered_on)
            UNION ALL
            SELECT DATE(created_on), 'ENQUIRIES', COUNT(*)
                FROM CUSTOMER_ENQUIRIES WHERE created_on >= :start_enquiries AND created_on < DATE_ADD(:end_enquiries, INTERVAL 1 DAY) AND status = 'A'
                GROUP BY DATE(created_on)
            ORDER BY event_date ASC, metric ASC", $params, 'getAnalyticsTrends');
    }

    public function getModerationQueue(ConnectionInterface $db, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT cr.id AS report_id, cr.tenant_id, cr.reporter_user_id,
            cr.content_type, cr.content_id, cr.report_reason, cr.report_details, cr.report_status, cr.created_on,
            u.full_name AS reporter_name
            FROM CONTENT_REPORTS cr
            INNER JOIN USERS u ON u.id = cr.reporter_user_id AND u.status = 'A'
            WHERE cr.report_status = 'OPEN' AND cr.status = 'A'
            ORDER BY cr.created_on ASC, cr.id ASC LIMIT :limit OFFSET :offset",
            [':limit' => $limit, ':offset' => $offset], 'getModerationQueue');
    }

    public function getModerationReport(ConnectionInterface $db, int $reportId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT * FROM CONTENT_REPORTS
            WHERE id = :id AND status = 'A' LIMIT 1", [':id' => $reportId], 'getModerationReport');
    }

    public function updateReportedContent(ConnectionInterface $db, string $contentType, int $contentId, int $adminId, string $actionType): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $sql = match ($actionType) {
            'UNPUBLISH_POST' => "UPDATE PROMOTIONAL_POSTS SET publication_status = 'DRAFT', updated_by = :admin_id,
                updated_on = CURRENT_TIMESTAMP WHERE id = :id AND status = 'A'",
            'UNPUBLISH_PRODUCT' => "UPDATE PRODUCTS SET publication_status = 'DRAFT', product_status = 'INACTIVE',
                updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP WHERE id = :id AND status = 'A'",
            default => null,
        };
        if ($sql === null) {
            $resArr['msgArr'][] = 'Unsupported content moderation action.';
            return $resArr;
        }
        try {
            $affected = $db->createCommand($sql, [':admin_id' => $adminId, ':id' => $contentId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Reported content was not found or already inactive.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['content_type' => $contentType, 'content_id' => $contentId];
        } catch (Throwable $exception) {
            return $this->error('updateReportedContent', $exception);
        }
        return $resArr;
    }

    public function updateReportStatus(ConnectionInterface $db, int $reportId, int $adminId, string $status): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE CONTENT_REPORTS
                SET report_status = :report_status, reviewed_by = :admin_id, reviewed_on = CURRENT_TIMESTAMP,
                    updated_by = :admin_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND report_status = 'OPEN' AND status = 'A'",
                [':report_status' => $status, ':admin_id' => $adminId, ':id' => $reportId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Report is no longer open or was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['report_id' => $reportId, 'report_status' => $status];
        } catch (Throwable $exception) {
            return $this->error('updateReportStatus', $exception);
        }
        return $resArr;
    }

    public function insertModerationLog(ConnectionInterface $db, ?int $tenantId, int $adminId, string $targetType, int $targetId, string $actionType, string $reason): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO MODERATION_LOGS
                (tenant_id, moderator_user_id, target_type, target_id, action_type, action_reason,
                 action_on, status, created_by, updated_by)
                VALUES (:tenant_id, :admin_id, :target_type, :target_id, :action_type, :reason,
                 CURRENT_TIMESTAMP, 'A', :admin_id, :admin_id)",
                [':tenant_id' => $tenantId, ':admin_id' => $adminId, ':target_type' => $targetType,
                 ':target_id' => $targetId, ':action_type' => $actionType, ':reason' => $reason])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertModerationLog', $exception);
        }
        return $resArr;
    }

    public function getModerationHistory(ConnectionInterface $db, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT ml.id, ml.tenant_id, ml.moderator_user_id,
            u.full_name AS moderator_name, ml.target_type, ml.target_id,
            ml.action_type, ml.action_reason, ml.action_on
            FROM MODERATION_LOGS ml
            INNER JOIN USERS u ON u.id = ml.moderator_user_id AND u.status = 'A'
            WHERE ml.status = 'A'
            ORDER BY ml.action_on DESC, ml.id DESC LIMIT :limit OFFSET :offset",
            [':limit' => $limit, ':offset' => $offset], 'getModerationHistory');
    }

    public function healthCheck(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT 1 AS database_ok, CURRENT_TIMESTAMP AS checked_on", [], 'healthCheck');
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
        $this->logger->error('AdminDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Administration data operation failed.';
        return $resArr;
    }
}
