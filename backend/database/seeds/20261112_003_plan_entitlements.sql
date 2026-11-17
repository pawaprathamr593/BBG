-- BBG subscription entitlements for the agreed Gold / Diamond / Platinum tiers.
-- DML only. No schema changes and no invented product caps or prices.
-- Gold: listing, storefront and direct contact.
-- Diamond: Gold + product management + 1 promotion published per tenant-local day.
-- Platinum: Diamond + 5 promotions/day + SEO/AEO/GEO and advanced analytics features.

START TRANSACTION;

-- Retire legacy flags/limits that contradict the current tier matrix.
UPDATE PLAN_ENTITLEMENTS pe
INNER JOIN PLANS p ON p.id = pe.plan_id
SET pe.status = 'Z'
WHERE pe.status = 'A'
  AND (
      (UPPER(p.plan_code) LIKE 'GOLD%' AND pe.entitlement_code IN ('PRODUCT_MANAGEMENT', 'PRODUCT_LIMIT', 'PROMOTIONAL_POSTS', 'DAILY_PROMOTION_LIMIT'))
      OR ((UPPER(p.plan_code) LIKE 'DIAMOND%' OR UPPER(p.plan_code) LIKE 'PLATINUM%') AND pe.entitlement_code = 'PROMOTIONAL_POSTS')
  );

-- Common storefront capabilities for all three tiers.
INSERT INTO PLAN_ENTITLEMENTS (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, e.entitlement_code, 'TRUE', 'BOOLEAN', 'A'
FROM PLANS p
CROSS JOIN (
    SELECT 'BUSINESS_LISTING' AS entitlement_code
    UNION ALL SELECT 'STOREFRONT_ACCESS'
    UNION ALL SELECT 'DIRECT_CONTACT'
) e
WHERE (UPPER(p.plan_code) LIKE 'GOLD%' OR UPPER(p.plan_code) LIKE 'DIAMOND%' OR UPPER(p.plan_code) LIKE 'PLATINUM%')
  AND p.status = 'A'
ON DUPLICATE KEY UPDATE entitlement_value = VALUES(entitlement_value), value_type = VALUES(value_type), status = 'A';

-- Product management is available on Diamond and Platinum; product limits remain uncapped
-- unless a separate, approved PRODUCT_LIMIT value is explicitly configured.
INSERT INTO PLAN_ENTITLEMENTS (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, 'PRODUCT_MANAGEMENT', 'TRUE', 'BOOLEAN', 'A'
FROM PLANS p
WHERE (UPPER(p.plan_code) LIKE 'DIAMOND%' OR UPPER(p.plan_code) LIKE 'PLATINUM%') AND p.status = 'A'
ON DUPLICATE KEY UPDATE entitlement_value = VALUES(entitlement_value), value_type = VALUES(value_type), status = 'A';

-- Daily publication quotas are server-enforced against the tenant's timezone.
INSERT INTO PLAN_ENTITLEMENTS (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, 'DAILY_PROMOTION_LIMIT',
       CASE WHEN UPPER(p.plan_code) LIKE 'DIAMOND%' THEN '1' ELSE '5' END,
       'NUMBER', 'A'
FROM PLANS p
WHERE (UPPER(p.plan_code) LIKE 'DIAMOND%' OR UPPER(p.plan_code) LIKE 'PLATINUM%') AND p.status = 'A'
ON DUPLICATE KEY UPDATE entitlement_value = VALUES(entitlement_value), value_type = VALUES(value_type), status = 'A';

-- Platinum-only discovery and analytics recommendations.
INSERT INTO PLAN_ENTITLEMENTS (plan_id, module_id, entitlement_code, entitlement_value, value_type, status)
SELECT p.id, NULL, e.entitlement_code, 'TRUE', 'BOOLEAN', 'A'
FROM PLANS p
CROSS JOIN (
    SELECT 'SEO_SUGGESTIONS' AS entitlement_code
    UNION ALL SELECT 'AEO_SUGGESTIONS'
    UNION ALL SELECT 'GEO_SUGGESTIONS'
    UNION ALL SELECT 'ADVANCED_ANALYTICS'
    UNION ALL SELECT 'ANALYTICS_CONTENT_RECOMMENDATIONS'
) e
WHERE UPPER(p.plan_code) LIKE 'PLATINUM%' AND p.status = 'A'
ON DUPLICATE KEY UPDATE entitlement_value = VALUES(entitlement_value), value_type = VALUES(value_type), status = 'A';

COMMIT;

SELECT p.plan_code, pe.entitlement_code, pe.entitlement_value, pe.value_type
FROM PLAN_ENTITLEMENTS pe
INNER JOIN PLANS p ON p.id = pe.plan_id
WHERE pe.status = 'A'
  AND (UPPER(p.plan_code) LIKE 'GOLD%' OR UPPER(p.plan_code) LIKE 'DIAMOND%' OR UPPER(p.plan_code) LIKE 'PLATINUM%')
ORDER BY p.plan_code, pe.entitlement_code;
