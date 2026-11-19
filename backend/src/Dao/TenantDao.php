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
             INNER JOIN TENANTS t ON t.id = tm.tenant_id AND t.status = 'A'
                AND (t.tenant_status = 'ACTIVE'
                    OR (t.tenant_status = 'PENDING' AND :tenant_permission_gate = 'SUBSCRIPTIONS_MANAGE'))
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
            [':user_id' => $userId, ':tenant_id' => $tenantId, ':permission_code' => $permissionCode, ':tenant_permission_gate' => $permissionCode],
            'hasTenantPermission',
        );
    }

    public function hasTenantEntitlement(ConnectionInterface $db, int $tenantId, string $entitlementCode): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT pe.id
             FROM TENANT_SUBSCRIPTIONS ts
             INNER JOIN PLAN_ENTITLEMENTS pe ON pe.plan_id = ts.plan_id
                AND pe.entitlement_code = :entitlement_code
                AND UPPER(pe.entitlement_value) IN ('1', 'TRUE', 'YES')
                AND pe.status = 'A'
             WHERE ts.tenant_id = :tenant_id
                AND ts.subscription_status = 'ACTIVE' AND ts.status = 'A'
                AND (ts.starts_on IS NULL OR ts.starts_on <= CURRENT_TIMESTAMP)
                AND (ts.ends_on IS NULL OR ts.ends_on >= CURRENT_TIMESTAMP)
             ORDER BY ts.starts_on DESC, ts.id DESC
             LIMIT 1",
            [':tenant_id' => $tenantId, ':entitlement_code' => $entitlementCode],
            'hasTenantEntitlement',
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


    public function getOwnedTenant(ConnectionInterface $db, int $userId, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT t.id AS tenant_id, t.tenant_name, t.tenant_status
             FROM TENANTS t
             INNER JOIN TENANT_MEMBERSHIPS tm ON tm.tenant_id = t.id
                AND tm.user_id = :user_id AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
             INNER JOIN USER_ROLE_ASSIGNMENTS ura ON ura.tenant_id = t.id
                AND ura.user_id = :user_id AND ura.status = 'A'
                AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
             INNER JOIN ROLES r ON r.id = ura.role_id
                AND r.role_code = 'TENANT_OWNER' AND r.scope_type = 'TENANT' AND r.status = 'A'
             WHERE t.id = :tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
             LIMIT 1",
            [':user_id' => $userId, ':tenant_id' => $tenantId],
            'getOwnedTenant',
        );
    }

    public function getAssignableTenantRole(ConnectionInterface $db, string $roleCode): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT id, role_code, role_name
             FROM ROLES
             WHERE role_code = :role_code AND scope_type = 'TENANT' AND status = 'A'
             LIMIT 1",
            [':role_code' => $roleCode],
            'getAssignableTenantRole',
        );
    }

    public function searchEligibleTenantUsers(ConnectionInterface $db, int $tenantId, string $emailQuery, int $limit): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many(
            $db,
            "SELECT u.id AS user_id, u.full_name, u.email
             FROM USERS u
             WHERE u.status = 'A' AND u.account_status = 'ACTIVE'
                AND u.email IS NOT NULL AND LOWER(u.email) LIKE :email_query
                AND NOT EXISTS (
                    SELECT 1 FROM TENANT_MEMBERSHIPS tm
                    WHERE tm.tenant_id = :tenant_id AND tm.user_id = u.id
                        AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM USER_ROLE_ASSIGNMENTS owner_assignment
                    INNER JOIN ROLES owner_role ON owner_role.id = owner_assignment.role_id
                        AND owner_role.role_code = 'TENANT_OWNER' AND owner_role.scope_type = 'TENANT' AND owner_role.status = 'A'
                    WHERE owner_assignment.tenant_id = :tenant_id AND owner_assignment.user_id = u.id
                        AND owner_assignment.status = 'A'
                        AND (owner_assignment.expires_on IS NULL OR owner_assignment.expires_on > CURRENT_TIMESTAMP)
                )
             ORDER BY u.full_name ASC, u.id ASC
             LIMIT :limit",
            [':tenant_id' => $tenantId, ':email_query' => '%' . strtolower($emailQuery) . '%', ':limit' => $limit],
            'searchEligibleTenantUsers',
        );
    }


    public function findActiveUserByEmail(ConnectionInterface $db, string $email): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT id AS user_id, full_name, LOWER(email) AS email
             FROM USERS
             WHERE LOWER(email) = :email AND status = 'A' AND account_status = 'ACTIVE'
             LIMIT 1",
            [':email' => strtolower($email)],
            'findActiveUserByEmail',
        );
    }

    public function getActiveUserEmail(ConnectionInterface $db, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT id AS user_id, LOWER(email) AS email
             FROM USERS
             WHERE id = :user_id AND status = 'A' AND account_status = 'ACTIVE'
             LIMIT 1",
            [':user_id' => $userId],
            'getActiveUserEmail',
        );
    }

    public function addTenantMember(ConnectionInterface $db, int $tenantId, int $userId, int $roleId, int $actorUserId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $user = $db->createCommand(
                "SELECT id FROM USERS WHERE id = :user_id AND status = 'A' AND account_status = 'ACTIVE' LIMIT 1",
                [':user_id' => $userId],
            )->queryOne();
            if (!is_array($user)) {
                $resArr['msgArr'][] = 'The selected user account is not active.';
                return $resArr;
            }
            $existingOwner = $db->createCommand(
                "SELECT ura.id
                 FROM USER_ROLE_ASSIGNMENTS ura
                 INNER JOIN ROLES r ON r.id = ura.role_id
                    AND r.role_code = 'TENANT_OWNER' AND r.scope_type = 'TENANT' AND r.status = 'A'
                 WHERE ura.tenant_id = :tenant_id AND ura.user_id = :user_id
                    AND ura.status = 'A' AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
                 LIMIT 1",
                [':tenant_id' => $tenantId, ':user_id' => $userId],
            )->queryOne();
            if (is_array($existingOwner)) {
                $resArr['msgArr'][] = 'A tenant owner cannot be added as a team member.';
                return $resArr;
            }
            $membership = $db->createCommand(
                "SELECT id FROM TENANT_MEMBERSHIPS
                 WHERE tenant_id = :tenant_id AND user_id = :user_id LIMIT 1",
                [':tenant_id' => $tenantId, ':user_id' => $userId],
            )->queryOne();
            if (is_array($membership)) {
                $db->createCommand(
                    "UPDATE TENANT_MEMBERSHIPS
                     SET membership_status = 'ACTIVE', joined_on = CURRENT_TIMESTAMP,
                         invited_by = :actor_id, status = 'A',
                         updated_by = :actor_id, updated_on = CURRENT_TIMESTAMP
                     WHERE id = :membership_id",
                    [':actor_id' => $actorUserId, ':membership_id' => (int) $membership['id']],
                )->execute();
            } else {
                $db->createCommand(
                    "INSERT INTO TENANT_MEMBERSHIPS
                        (tenant_id, user_id, membership_status, joined_on, invited_by, status, created_by, updated_by)
                     VALUES (:tenant_id, :user_id, 'ACTIVE', CURRENT_TIMESTAMP, :actor_id, 'A', :actor_id, :actor_id)",
                    [':tenant_id' => $tenantId, ':user_id' => $userId, ':actor_id' => $actorUserId],
                )->execute();
            }
            $assignment = $db->createCommand(
                "SELECT id FROM USER_ROLE_ASSIGNMENTS
                 WHERE tenant_id = :tenant_id AND user_id = :user_id AND role_id = :role_id
                    AND status = 'A' AND (expires_on IS NULL OR expires_on > CURRENT_TIMESTAMP)
                 LIMIT 1",
                [':tenant_id' => $tenantId, ':user_id' => $userId, ':role_id' => $roleId],
            )->queryOne();
            if (!is_array($assignment)) {
                $db->createCommand(
                    "INSERT INTO USER_ROLE_ASSIGNMENTS
                        (user_id, role_id, tenant_id, assigned_by, assigned_on, expires_on, status, created_by, updated_by)
                     VALUES (:user_id, :role_id, :tenant_id, :actor_id, CURRENT_TIMESTAMP, NULL, 'A', :actor_id, :actor_id)",
                    [':user_id' => $userId, ':role_id' => $roleId, ':tenant_id' => $tenantId, ':actor_id' => $actorUserId],
                )->execute();
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['tenant_id' => $tenantId, 'user_id' => $userId, 'role_code' => 'TENANT_ORDER_MANAGER'];
        } catch (Throwable $exception) {
            return $this->error('addTenantMember', $exception);
        }
        return $resArr;
    }

    public function insertTenantInvitation(
        ConnectionInterface $db,
        int $tenantId,
        string $email,
        int $roleId,
        string $tokenHash,
        string $expiresOn,
        int $actorUserId,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand(
                "UPDATE TENANT_INVITATIONS
                 SET invitation_status = 'REVOKED', status = 'Z',
                     updated_by = :actor_id, updated_on = CURRENT_TIMESTAMP
                 WHERE tenant_id = :tenant_id AND LOWER(email) = :email
                    AND invitation_status = 'PENDING' AND status = 'A'",
                [':actor_id' => $actorUserId, ':tenant_id' => $tenantId, ':email' => strtolower($email)],
            )->execute();
            $db->createCommand(
                "INSERT INTO TENANT_INVITATIONS
                    (tenant_id, email, role_id, token_hash, invitation_status, expires_on,
                     status, created_by, updated_by)
                 VALUES (:tenant_id, :email, :role_id, :token_hash, 'PENDING', :expires_on,
                    'A', :actor_id, :actor_id)",
                [':tenant_id' => $tenantId, ':email' => strtolower($email), ':role_id' => $roleId,
                 ':token_hash' => $tokenHash, ':expires_on' => $expiresOn, ':actor_id' => $actorUserId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['invitation_id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertTenantInvitation', $exception);
        }
        return $resArr;
    }

    public function getTenantInvitationByTokenHash(ConnectionInterface $db, string $tokenHash): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT invitation.id AS invitation_id, invitation.tenant_id, invitation.email,
                    invitation.role_id, invitation.expires_on, role.role_code,
                    tenant.tenant_status
             FROM TENANT_INVITATIONS invitation
             INNER JOIN TENANTS tenant ON tenant.id = invitation.tenant_id AND tenant.status = 'A'
             INNER JOIN ROLES role ON role.id = invitation.role_id
                AND role.scope_type = 'TENANT' AND role.status = 'A'
             WHERE invitation.token_hash = :token_hash
                AND invitation.invitation_status = 'PENDING'
                AND invitation.expires_on > CURRENT_TIMESTAMP
                AND invitation.status = 'A'
             LIMIT 1",
            [':token_hash' => $tokenHash],
            'getTenantInvitationByTokenHash',
        );
    }

    public function markTenantInvitationAccepted(ConnectionInterface $db, int $invitationId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand(
                "UPDATE TENANT_INVITATIONS
                 SET invitation_status = 'ACCEPTED', accepted_by = :user_id,
                     accepted_on = CURRENT_TIMESTAMP, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                 WHERE id = :invitation_id AND invitation_status = 'PENDING' AND status = 'A'
                    AND expires_on > CURRENT_TIMESTAMP",
                [':user_id' => $userId, ':invitation_id' => $invitationId],
            )->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'This invitation has expired or has already been used.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['invitation_id' => $invitationId];
        } catch (Throwable $exception) {
            return $this->error('markTenantInvitationAccepted', $exception);
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
        $this->logger->error('TenantDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Tenant data operation failed.';
        return $resArr;
    }
}
