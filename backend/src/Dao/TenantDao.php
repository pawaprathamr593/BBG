<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class TenantDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getMyTenants(ConnectionInterface $db, int $userId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many(
            $db,
            "SELECT t.id, t.tenant_code, t.tenant_name, t.tenant_type, t.tenant_status,
                    tm.membership_status, tm.joined_on,
                    GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code SEPARATOR ',') AS role_codes,
                    active_plan.active_entitlements
             FROM TENANT_MEMBERSHIPS tm
             INNER JOIN TENANTS t ON t.id = tm.tenant_id AND t.status = 'A'
             LEFT JOIN USER_ROLE_ASSIGNMENTS ura ON ura.user_id = tm.user_id
                AND ura.tenant_id = tm.tenant_id AND ura.status = 'A'
                AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
             LEFT JOIN ROLES r ON r.id = ura.role_id AND r.scope_type = 'TENANT' AND r.status = 'A'
             LEFT JOIN (
                SELECT ts.tenant_id,
                    GROUP_CONCAT(DISTINCT CONCAT(pe.entitlement_code, '=', pe.entitlement_value)
                        ORDER BY pe.entitlement_code SEPARATOR ';') AS active_entitlements
                FROM TENANT_SUBSCRIPTIONS ts
                INNER JOIN PLAN_ENTITLEMENTS pe ON pe.plan_id = ts.plan_id AND pe.status = 'A'
                WHERE ts.subscription_status = 'ACTIVE' AND ts.status = 'A'
                    AND (ts.starts_on IS NULL OR ts.starts_on <= CURRENT_TIMESTAMP)
                    AND (ts.ends_on IS NULL OR ts.ends_on >= CURRENT_TIMESTAMP)
                GROUP BY ts.tenant_id
             ) active_plan ON active_plan.tenant_id = t.id
             WHERE tm.user_id = :user_id AND tm.membership_status = 'ACTIVE'
                AND tm.status = 'A'
             GROUP BY t.id, t.tenant_code, t.tenant_name, t.tenant_type, t.tenant_status,
                      tm.membership_status, tm.joined_on, active_plan.active_entitlements
             ORDER BY t.tenant_name ASC, t.id ASC
             LIMIT :limit OFFSET :offset",
            [':user_id' => $userId, ':limit' => $limit, ':offset' => $offset],
            'getMyTenants',
        );
    }

    public function countMyTenants(ConnectionInterface $db, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT COUNT(*) AS total
             FROM TENANT_MEMBERSHIPS tm
             INNER JOIN TENANTS t ON t.id = tm.tenant_id AND t.status = 'A'
             WHERE tm.user_id = :user_id AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'",
            [':user_id' => $userId],
            'countMyTenants',
        );
    }

    public function getMyTenant(ConnectionInterface $db, int $userId, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT t.id, t.tenant_code, t.tenant_name, t.tenant_type, t.legal_name,
                    t.default_currency, t.timezone, t.tenant_status,
                    tm.membership_status, tm.joined_on
             FROM TENANT_MEMBERSHIPS tm
             INNER JOIN TENANTS t ON t.id = tm.tenant_id AND t.status = 'A'
             WHERE tm.user_id = :user_id AND tm.tenant_id = :tenant_id
                AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
             LIMIT 1",
            [':user_id' => $userId, ':tenant_id' => $tenantId],
            'getMyTenant',
        );
    }

    public function hasTenantPermission(ConnectionInterface $db, int $userId, int $tenantId, string $permissionCode): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT p.id
             FROM TENANT_MEMBERSHIPS tm
             INNER JOIN TENANTS t ON t.id = tm.tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             INNER JOIN USER_ROLE_ASSIGNMENTS ura ON ura.user_id = tm.user_id
                AND ura.tenant_id = tm.tenant_id AND ura.status = 'A'
                AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
             INNER JOIN ROLES r ON r.id = ura.role_id AND r.scope_type = 'TENANT' AND r.status = 'A'
             INNER JOIN ROLE_PERMISSIONS rp ON rp.role_id = r.id AND rp.status = 'A'
             INNER JOIN PERMISSIONS p ON p.id = rp.permission_id
                AND p.permission_code = :permission_code AND p.status = 'A'
             WHERE tm.user_id = :user_id AND tm.tenant_id = :tenant_id
                AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
             LIMIT 1",
            [':user_id' => $userId, ':tenant_id' => $tenantId, ':permission_code' => $permissionCode],
            'hasTenantPermission',
        );
    }

    public function getTenantMembers(ConnectionInterface $db, int $tenantId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many(
            $db,
            "SELECT u.id AS user_id, u.full_name, u.email, u.mobile,
                    tm.membership_status, tm.joined_on,
                    GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code SEPARATOR ',') AS role_codes
             FROM TENANT_MEMBERSHIPS tm
             INNER JOIN USERS u ON u.id = tm.user_id AND u.account_status = 'ACTIVE' AND u.status = 'A'
             LEFT JOIN USER_ROLE_ASSIGNMENTS ura ON ura.user_id = tm.user_id
                AND ura.tenant_id = tm.tenant_id AND ura.status = 'A'
                AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
             LEFT JOIN ROLES r ON r.id = ura.role_id AND r.scope_type = 'TENANT' AND r.status = 'A'
             WHERE tm.tenant_id = :tenant_id AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
             GROUP BY u.id, u.full_name, u.email, u.mobile, tm.membership_status, tm.joined_on
             ORDER BY u.full_name ASC, u.id ASC
             LIMIT :limit OFFSET :offset",
            [':tenant_id' => $tenantId, ':limit' => $limit, ':offset' => $offset],
            'getTenantMembers',
        );
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
        $this->logger->error('TenantDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Tenant data operation failed.';
        return $resArr;
    }
}
