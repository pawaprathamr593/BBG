-- BBG platform role permission defaults
-- Apply once to backfill existing role mappings. This script is idempotent.
-- It does not create users, roles, or permission catalogue records.
--
-- Preconditions:
----   * ROLES contains PLATFORM_ADMIN with scope_type PLATFORM.
--   * PERMISSIONS contains the listed platform codes with status = 'A'.
-- Review the two preflight result sets before relying on the inserts.

-- Preflight: expected role records.
SELECT role_code, scope_type, status
FROM ROLES
WHERE (role_code = 'TENANT_OWNER' AND scope_type = 'TENANT')
   OR (role_code = 'PLATFORM_ADMIN' AND scope_type = 'PLATFORM');

-- Preflight: permission codes that are missing or inactive.
SELECT expected.permission_code
FROM (
    SELECT 'BUSINESS_PROFILE_MANAGE' AS permission_code UNION ALL
    SELECT 'CATALOGUE_MANAGE' UNION ALL
    SELECT 'CUSTOMERS_MANAGE' UNION ALL
    SELECT 'ENQUIRIES_MANAGE' UNION ALL
    SELECT 'ORDERS_MANAGE' UNION ALL
    SELECT 'PAYMENTS_VIEW' UNION ALL
    SELECT 'PROMOTIONS_MANAGE' UNION ALL
    SELECT 'SUBSCRIPTIONS_MANAGE' UNION ALL
    SELECT 'TENANT_MEMBERS_VIEW' UNION ALL
    SELECT 'ANALYTICS_VIEW' UNION ALL
    SELECT 'PLATFORM_USERS_MANAGE' UNION ALL
    SELECT 'BUSINESS_APPROVE' UNION ALL
    SELECT 'SUBSCRIPTIONS_APPROVE' UNION ALL
    SELECT 'CATEGORIES_MANAGE' UNION ALL
    SELECT 'MODERATION_MANAGE' UNION ALL
    SELECT 'SYSTEM_HEALTH_VIEW'
) expected
LEFT JOIN PERMISSIONS p
    ON p.permission_code = expected.permission_code
   AND p.status = 'A'
WHERE p.id IS NULL
ORDER BY expected.permission_code;

-- Tenant-owner permissions are NOT seeded statically. Effective tenant access
-- must be calculated from the tenant's approved active plan entitlements.

-- Backfill all approved platform administration permissions to PLATFORM_ADMIN.
-- Tenant-only permissions are deliberately excluded.
INSERT INTO ROLE_PERMISSIONS
    (role_id, permission_id, status, created_by, updated_by)
SELECT r.id, p.id, 'A', NULL, NULL
FROM ROLES r
INNER JOIN PERMISSIONS p
    ON p.permission_code IN (
        'PLATFORM_USERS_MANAGE',
        'BUSINESS_APPROVE',
        'SUBSCRIPTIONS_APPROVE',
        'CATEGORIES_MANAGE',
        'MODERATION_MANAGE',
        'ANALYTICS_VIEW',
        'SYSTEM_HEALTH_VIEW'
    )
   AND p.status = 'A'
WHERE r.role_code = 'PLATFORM_ADMIN'
  AND r.scope_type = 'PLATFORM'
  AND r.status = 'A'
ON DUPLICATE KEY UPDATE
    status = 'A',
    updated_on = CURRENT_TIMESTAMP;

-- Verification: expected active permission mappings per role.
SELECT r.role_code, r.scope_type, COUNT(DISTINCT p.permission_code) AS active_permission_count
FROM ROLES r
INNER JOIN ROLE_PERMISSIONS rp ON rp.role_id = r.id AND rp.status = 'A'
INNER JOIN PERMISSIONS p ON p.id = rp.permission_id AND p.status = 'A'
WHERE (r.role_code = 'TENANT_OWNER' AND r.scope_type = 'TENANT')
   OR (r.role_code = 'PLATFORM_ADMIN' AND r.scope_type = 'PLATFORM')
GROUP BY r.role_code, r.scope_type
ORDER BY r.scope_type, r.role_code;
