-- BBG Contribution Number (BCN) generation.
-- Additive migration. Back up and inspect the target schema before applying.
-- Existing approved subscriptions are intentionally not backfilled; BCN is issued
-- when an approval occurs after this migration has been applied.

ALTER TABLE TENANT_SUBSCRIPTIONS
    ADD COLUMN bcn VARCHAR(64) NULL AFTER subscription_status,
    ADD UNIQUE KEY uq_tenant_subscriptions_bcn (bcn);

CREATE TABLE BBG_BCN_SERIAL_COUNTER (
    id TINYINT UNSIGNED NOT NULL,
    last_serial BIGINT UNSIGNED NOT NULL DEFAULT 0,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A single locked row provides a platform-wide serial sequence. Since the row
-- update runs inside the approval transaction, failed approvals do not consume
-- a serial and concurrent approvals cannot allocate the same value.
INSERT INTO BBG_BCN_SERIAL_COUNTER
    (id, last_serial, status, created_on, updated_on)
VALUES
    (1, 0, 'A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
