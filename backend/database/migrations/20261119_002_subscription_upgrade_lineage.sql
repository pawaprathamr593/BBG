-- BBG subscription upgrade/renewal lineage
-- Adds an explicit link from a pending replacement subscription to the current
-- subscription that it will replace only after payment proof is approved.
-- Apply after taking a database backup and confirming the target schema.

SET @bbg_upgrade_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'TENANT_SUBSCRIPTIONS'
      AND column_name = 'upgrade_from_subscription_id'
);
SET @bbg_upgrade_column_sql = IF(
    @bbg_upgrade_column_exists = 0,
    'ALTER TABLE TENANT_SUBSCRIPTIONS ADD COLUMN upgrade_from_subscription_id INT UNSIGNED NULL AFTER tenant_id',
    'SELECT 1'
);
PREPARE bbg_upgrade_column_stmt FROM @bbg_upgrade_column_sql;
EXECUTE bbg_upgrade_column_stmt;
DEALLOCATE PREPARE bbg_upgrade_column_stmt;

SET @bbg_upgrade_index_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'TENANT_SUBSCRIPTIONS'
      AND index_name = 'idx_tenant_subscriptions_upgrade_from'
);
SET @bbg_upgrade_index_sql = IF(
    @bbg_upgrade_index_exists = 0,
    'CREATE INDEX idx_tenant_subscriptions_upgrade_from ON TENANT_SUBSCRIPTIONS (tenant_id, upgrade_from_subscription_id)',
    'SELECT 1'
);
PREPARE bbg_upgrade_index_stmt FROM @bbg_upgrade_index_sql;
EXECUTE bbg_upgrade_index_stmt;
DEALLOCATE PREPARE bbg_upgrade_index_stmt;
