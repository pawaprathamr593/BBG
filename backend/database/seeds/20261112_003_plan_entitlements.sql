-- BBG subscription entitlements referenced by the V1 API implementation.
-- Adds only entitlements grounded in the frontend requirements:
--   GOLD: configurable baseline product cap is currently 50.
--   PLATINUM: promotional posts are an included feature.
-- Other plan limits/features remain configurable and are not guessed here.
-- Idempotent; no schema changes.

START TRANSACTION;

INSERT INTO PLAN_ENTITLEMENTS
    (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, 'PRODUCT_LIMIT', '50', 'NUMBER', 'A'
FROM PLANS p
WHERE UPPER(p.plan_code) = 'GOLD' AND p.status = 'A'
ON DUPLICATE KEY UPDATE
    entitlement_value = VALUES(entitlement_value),
    value_type = VALUES(value_type),
    status = 'A';

INSERT INTO PLAN_ENTITLEMENTS
    (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, 'PROMOTIONAL_POSTS', '1', 'BOOLEAN', 'A'
FROM PLANS p
WHERE UPPER(p.plan_code) = 'PLATINUM' AND p.status = 'A'
ON DUPLICATE KEY UPDATE
    entitlement_value = VALUES(entitlement_value),
    value_type = VALUES(value_type),
    status = 'A';

COMMIT;

SELECT p.plan_code, pe.entitlement_code, pe.entitlement_value, pe.value_type
FROM PLAN_ENTITLEMENTS pe
INNER JOIN PLANS p ON p.id = pe.plan_id
WHERE pe.entitlement_code IN ('PRODUCT_LIMIT', 'PROMOTIONAL_POSTS')
  AND pe.status = 'A'
ORDER BY p.plan_code, pe.entitlement_code;
