-- BBG subscription entitlements used by the V1 API.
-- Product management is a feature entitlement; PRODUCT_LIMIT is optional and only
-- constrains a tier when a commercial limit is explicitly configured.
-- Gold: listing/storefront/contact only; no product management.
-- Diamond and Platinum: product management enabled.
-- Idempotent DML only; no schema changes.

START TRANSACTION;

UPDATE PLAN_ENTITLEMENTS pe
INNER JOIN PLANS p ON p.id = pe.plan_id
SET pe.status = 'Z'
WHERE UPPER(p.plan_code) LIKE 'GOLD%'
  AND pe.entitlement_code IN ('PRODUCT_MANAGEMENT', 'PRODUCT_LIMIT')
  AND pe.status = 'A';

INSERT INTO PLAN_ENTITLEMENTS
    (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, 'PRODUCT_MANAGEMENT', 'TRUE', 'BOOLEAN', 'A'
FROM PLANS p
WHERE UPPER(p.plan_code) LIKE 'DIAMOND%' AND p.status = 'A'
ON DUPLICATE KEY UPDATE
    entitlement_value = VALUES(entitlement_value),
    value_type = VALUES(value_type),
    status = 'A';

INSERT INTO PLAN_ENTITLEMENTS
    (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, 'PRODUCT_MANAGEMENT', 'TRUE', 'BOOLEAN', 'A'
FROM PLANS p
WHERE UPPER(p.plan_code) LIKE 'PLATINUM%' AND p.status = 'A'
ON DUPLICATE KEY UPDATE
    entitlement_value = VALUES(entitlement_value),
    value_type = VALUES(value_type),
    status = 'A';

INSERT INTO PLAN_ENTITLEMENTS
    (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, 'PROMOTIONAL_POSTS', 'TRUE', 'BOOLEAN', 'A'
FROM PLANS p
WHERE UPPER(p.plan_code) LIKE 'DIAMOND%' AND p.status = 'A'
ON DUPLICATE KEY UPDATE
    entitlement_value = VALUES(entitlement_value),
    value_type = VALUES(value_type),
    status = 'A';

INSERT INTO PLAN_ENTITLEMENTS
    (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, 'PROMOTIONAL_POSTS', 'TRUE', 'BOOLEAN', 'A'
FROM PLANS p
WHERE UPPER(p.plan_code) LIKE 'PLATINUM%' AND p.status = 'A'
ON DUPLICATE KEY UPDATE
    entitlement_value = VALUES(entitlement_value),
    value_type = VALUES(value_type),
    status = 'A';

COMMIT;

SELECT p.plan_code, pe.entitlement_code, pe.entitlement_value, pe.value_type
FROM PLAN_ENTITLEMENTS pe
INNER JOIN PLANS p ON p.id = pe.plan_id
WHERE pe.entitlement_code IN ('PRODUCT_MANAGEMENT', 'PRODUCT_LIMIT', 'PROMOTIONAL_POSTS')
  AND pe.status = 'A'
ORDER BY p.plan_code, pe.entitlement_code;
