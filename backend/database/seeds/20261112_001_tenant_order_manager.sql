-- BBG tenant order-manager RBAC seed.
-- Target: the existing user_id=2 membership in tenant_id=1.
-- Idempotent: inserts only missing active role/permission links and assignment.
-- No schema changes. Review target IDs and apply only to the intended local DB.

START TRANSACTION;

SET @bbg_target_user_id = 2;
SET @bbg_target_tenant_id = 1;

-- Preconditions: user, tenant, and active membership must all exist.
SET @bbg_membership_is_active = (
    SELECT COUNT(*)
    FROM TENANT_MEMBERSHIPS tm
    INNER JOIN USERS u ON u.id = tm.user_id AND u.status = 'A' AND u.account_status = 'ACTIVE'
    INNER JOIN TENANTS t ON t.id = tm.tenant_id AND t.status = 'A' AND t.tenant_status = 'ACTIVE'
    WHERE tm.user_id = @bbg_target_user_id
      AND tm.tenant_id = @bbg_target_tenant_id
      AND tm.membership_status = 'ACTIVE'
      AND tm.status = 'A'
);

-- Create the tenant-scoped role only when the target membership is active.
INSERT INTO ROLES
    (role_code, role_name, scope_type, description, status, created_by, updated_by)
SELECT
    'TENANT_ORDER_MANAGER',
    'Tenant Order Manager',
    'TENANT',
    'Can view and manage WhatsApp orders for the assigned tenant.',
    'A',
    NULL,
    NULL
WHERE @bbg_membership_is_active = 1
  AND NOT EXISTS (
      SELECT 1 FROM ROLES
      WHERE role_code = 'TENANT_ORDER_MANAGER'
        AND scope_type = 'TENANT'
        AND status = 'A'
  );

-- Create the order-management permission only when the target membership is active.
INSERT INTO PERMISSIONS
    (permission_code, permission_name, module_code, description, status, created_by, updated_by)
SELECT
    'ORDERS_MANAGE',
    'Manage Orders',
    'ORDERS',
    'Allows authorized tenant members to view and manage WhatsApp orders.',
    'A',
    NULL,
    NULL
WHERE @bbg_membership_is_active = 1
  AND NOT EXISTS (
      SELECT 1 FROM PERMISSIONS
      WHERE permission_code = 'ORDERS_MANAGE'
        AND module_code = 'ORDERS'
        AND status = 'A'
  );

-- Link the role and permission.
INSERT INTO ROLE_PERMISSIONS
    (role_id, permission_id, status, created_by, updated_by)
SELECT r.id, p.id, 'A', NULL, NULL
FROM ROLES r
INNER JOIN PERMISSIONS p
    ON p.permission_code = 'ORDERS_MANAGE'
   AND p.module_code = 'ORDERS'
   AND p.status = 'A'
WHERE r.role_code = 'TENANT_ORDER_MANAGER'
  AND r.scope_type = 'TENANT'
  AND r.status = 'A'
  AND @bbg_membership_is_active = 1
  AND NOT EXISTS (
      SELECT 1
      FROM ROLE_PERMISSIONS rp
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND rp.status = 'A'
  );

-- Assign the role to user 2 only within tenant 1, and only with active membership.
INSERT INTO USER_ROLE_ASSIGNMENTS
    (user_id, role_id, tenant_id, assigned_by, assigned_on, expires_on, status, created_by, updated_by)
SELECT
    @bbg_target_user_id,
    r.id,
    @bbg_target_tenant_id,
    NULL,
    CURRENT_TIMESTAMP,
    NULL,
    'A',
    NULL,
    NULL
FROM ROLES r
WHERE r.role_code = 'TENANT_ORDER_MANAGER'
  AND r.scope_type = 'TENANT'
  AND r.status = 'A'
  AND @bbg_membership_is_active = 1
  AND NOT EXISTS (
      SELECT 1
      FROM USER_ROLE_ASSIGNMENTS ura
      WHERE ura.user_id = @bbg_target_user_id
        AND ura.role_id = r.id
        AND ura.tenant_id = @bbg_target_tenant_id
        AND ura.status = 'A'
        AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
  );

COMMIT;

-- Verification: the final row should show the active tenant assignment and permission.
SELECT
    @bbg_membership_is_active AS active_membership_precondition,
    ura.user_id,
    ura.tenant_id,
    r.role_code,
    r.scope_type,
    p.permission_code,
    p.module_code,
    ura.status AS assignment_status
FROM USER_ROLE_ASSIGNMENTS ura
INNER JOIN ROLES r ON r.id = ura.role_id AND r.status = 'A'
INNER JOIN ROLE_PERMISSIONS rp ON rp.role_id = r.id AND rp.status = 'A'
INNER JOIN PERMISSIONS p ON p.id = rp.permission_id AND p.status = 'A'
WHERE ura.user_id = @bbg_target_user_id
  AND ura.tenant_id = @bbg_target_tenant_id
  AND r.role_code = 'TENANT_ORDER_MANAGER'
  AND p.permission_code = 'ORDERS_MANAGE'
  AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP);
