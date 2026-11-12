-- BBG V1 API RBAC baseline.
-- Creates standard roles, permission records and role-permission links.
-- Does not assign PLATFORM_ADMIN to any user. Platform access remains default-deny
-- until an authorized operator explicitly assigns that role to a trusted account.
-- Idempotent and additive; no schema changes.

START TRANSACTION;

INSERT INTO ROLES (role_code, role_name, scope_type, description, status)
SELECT 'TENANT_OWNER', 'Tenant Owner', 'TENANT',
       'Owner of an approved BBG tenant workspace.', 'A'
WHERE NOT EXISTS (
    SELECT 1 FROM ROLES
    WHERE role_code = 'TENANT_OWNER' AND scope_type = 'TENANT' AND status = 'A'
);

INSERT INTO ROLES (role_code, role_name, scope_type, description, status)
SELECT 'PLATFORM_ADMIN', 'Platform Administrator', 'PLATFORM',
       'Platform-level administration role. Assign only to trusted platform operators.', 'A'
WHERE NOT EXISTS (
    SELECT 1 FROM ROLES
    WHERE role_code = 'PLATFORM_ADMIN' AND scope_type = 'PLATFORM' AND status = 'A'
);

INSERT INTO PERMISSIONS (permission_code, permission_name, module_code, description, status)
SELECT permission_code, permission_name, module_code, description, 'A'
FROM (
    SELECT 'TENANT_MEMBERS_VIEW' permission_code, 'View Tenant Members' permission_name, 'TENANTS' module_code, 'View active members of an authorized tenant.' description
    UNION ALL SELECT 'BUSINESS_PROFILE_MANAGE', 'Manage Business Profile', 'BUSINESS', 'Manage the authenticated tenant owner business profile.'
    UNION ALL SELECT 'CATALOGUE_MANAGE', 'Manage Catalogue', 'CATALOGUE', 'Manage tenant catalogue categories, products and media metadata.'
    UNION ALL SELECT 'CUSTOMERS_MANAGE', 'Manage Customers', 'CUSTOMERS', 'Manage tenant customer records and addresses.'
    UNION ALL SELECT 'ENQUIRIES_MANAGE', 'Manage Enquiries', 'ENQUIRIES', 'View and respond to tenant enquiries.'
    UNION ALL SELECT 'ORDERS_MANAGE', 'Manage Orders', 'ORDERS', 'View and manage tenant orders.'
    UNION ALL SELECT 'PAYMENTS_VIEW', 'View Payments', 'PAYMENTS', 'View authorized tenant payment records.'
    UNION ALL SELECT 'SUBSCRIPTIONS_MANAGE', 'Manage Subscriptions', 'SUBSCRIPTIONS', 'View and request tenant subscriptions.'
    UNION ALL SELECT 'PROMOTIONS_MANAGE', 'Manage Promotions', 'PROMOTIONS', 'Manage tenant promotional posts.'
    UNION ALL SELECT 'PLATFORM_USERS_MANAGE', 'Manage Platform Users', 'ADMIN', 'List, inspect, suspend and restore platform user accounts.'
    UNION ALL SELECT 'BUSINESS_APPROVE', 'Approve Businesses', 'ADMIN', 'Review, approve, reject and reopen business applications.'
    UNION ALL SELECT 'SUBSCRIPTIONS_APPROVE', 'Approve Subscriptions', 'ADMIN', 'Review subscription payment proof and subscription decisions.'
    UNION ALL SELECT 'CATEGORIES_MANAGE', 'Manage Global Categories', 'ADMIN', 'Create, update and soft-delete global marketplace categories.'
    UNION ALL SELECT 'ANALYTICS_VIEW', 'View Platform Analytics', 'ADMIN', 'View approved platform analytics metrics.'
    UNION ALL SELECT 'MODERATION_MANAGE', 'Manage Content Moderation', 'ADMIN', 'Review content reports and perform moderation actions.'
    UNION ALL SELECT 'SYSTEM_HEALTH_VIEW', 'View Safe System Health', 'ADMIN', 'View safe operational health summaries.'
) AS permission_seed
WHERE NOT EXISTS (
    SELECT 1 FROM PERMISSIONS p
    WHERE p.permission_code = permission_seed.permission_code
      AND p.module_code = permission_seed.module_code
      AND p.status = 'A'
);

INSERT INTO ROLE_PERMISSIONS (role_id, permission_id, status)
SELECT r.id, p.id, 'A'
FROM ROLES r
INNER JOIN PERMISSIONS p ON p.permission_code IN (
    'TENANT_MEMBERS_VIEW', 'BUSINESS_PROFILE_MANAGE', 'CATALOGUE_MANAGE',
    'CUSTOMERS_MANAGE', 'ENQUIRIES_MANAGE', 'ORDERS_MANAGE',
    'PAYMENTS_VIEW', 'SUBSCRIPTIONS_MANAGE', 'PROMOTIONS_MANAGE'
) AND p.status = 'A'
WHERE r.role_code = 'TENANT_OWNER' AND r.scope_type = 'TENANT' AND r.status = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM ROLE_PERMISSIONS rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.status = 'A'
  );

INSERT INTO ROLE_PERMISSIONS (role_id, permission_id, status)
SELECT r.id, p.id, 'A'
FROM ROLES r
INNER JOIN PERMISSIONS p ON p.permission_code IN (
    'PLATFORM_USERS_MANAGE', 'BUSINESS_APPROVE', 'SUBSCRIPTIONS_APPROVE',
    'CATEGORIES_MANAGE', 'ANALYTICS_VIEW', 'MODERATION_MANAGE',
    'SYSTEM_HEALTH_VIEW'
) AND p.status = 'A'
WHERE r.role_code = 'PLATFORM_ADMIN' AND r.scope_type = 'PLATFORM' AND r.status = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM ROLE_PERMISSIONS rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.status = 'A'
  );

COMMIT;

SELECT r.role_code, r.scope_type, COUNT(DISTINCT p.id) AS active_permission_count
FROM ROLES r
LEFT JOIN ROLE_PERMISSIONS rp ON rp.role_id = r.id AND rp.status = 'A'
LEFT JOIN PERMISSIONS p ON p.id = rp.permission_id AND p.status = 'A'
WHERE r.role_code IN ('TENANT_OWNER', 'PLATFORM_ADMIN') AND r.status = 'A'
GROUP BY r.id, r.role_code, r.scope_type
ORDER BY r.role_code;
