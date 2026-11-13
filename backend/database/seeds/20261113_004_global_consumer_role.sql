-- BBG global Consumer role.
-- Additive and idempotent. Run after confirming the target database and backing it up.
-- Every active registered account receives a global Consumer assignment.
-- This does not create or modify tenant/platform role assignments.

START TRANSACTION;

INSERT INTO ROLES (role_code, role_name, scope_type, description, status)
SELECT 'CONSUMER', 'Consumer', 'GLOBAL',
       'Global BBG marketplace consumer role for personal marketplace activity.', 'A'
WHERE NOT EXISTS (
    SELECT 1 FROM ROLES
    WHERE role_code = 'CONSUMER' AND scope_type = 'GLOBAL' AND status = 'A'
);

INSERT INTO USER_ROLE_ASSIGNMENTS
    (user_id, role_id, tenant_id, assigned_by, assigned_on, expires_on,
     status, created_by, updated_by)
SELECT u.id, r.id, NULL, NULL, CURRENT_TIMESTAMP, NULL,
       'A', NULL, NULL
FROM USERS u
INNER JOIN ROLES r
    ON r.role_code = 'CONSUMER'
   AND r.scope_type = 'GLOBAL'
   AND r.status = 'A'
WHERE u.account_status = 'ACTIVE'
  AND u.status = 'A'
  AND NOT EXISTS (
      SELECT 1
      FROM USER_ROLE_ASSIGNMENTS existing_assignment
      WHERE existing_assignment.user_id = u.id
        AND existing_assignment.role_id = r.id
        AND existing_assignment.tenant_id IS NULL
        AND existing_assignment.status = 'A'
        AND (existing_assignment.expires_on IS NULL
             OR existing_assignment.expires_on > CURRENT_TIMESTAMP)
  );

COMMIT;

SELECT r.role_code, r.scope_type, COUNT(DISTINCT ura.user_id) AS active_consumer_assignments
FROM ROLES r
LEFT JOIN USER_ROLE_ASSIGNMENTS ura
    ON ura.role_id = r.id
   AND ura.tenant_id IS NULL
   AND ura.status = 'A'
   AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
WHERE r.role_code = 'CONSUMER'
  AND r.scope_type = 'GLOBAL'
  AND r.status = 'A'
GROUP BY r.id, r.role_code, r.scope_type;
