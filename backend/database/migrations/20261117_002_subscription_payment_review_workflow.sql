-- BBG subscription payment configuration and immutable review history.
-- Additive migration. Apply only to a verified local/staging database after backup.
-- QR configuration is versioned; subscriptions retain the instructions shown at request time.

CREATE TABLE IF NOT EXISTS PLATFORM_PAYMENT_QR_CONFIG (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    config_version INT UNSIGNED NOT NULL,
    payee_name VARCHAR(150) NOT NULL,
    upi_id VARCHAR(150) NOT NULL,
    qr_file_path VARCHAR(500) NOT NULL,
    payment_instructions VARCHAR(1000) NULL,
    config_status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',
    effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until DATETIME NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_payment_qr_version (config_version),
    KEY idx_platform_payment_qr_active (config_status, status, effective_from, effective_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TENANT_SUBSCRIPTION_PAYMENT_INSTRUCTIONS (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    subscription_id INT UNSIGNED NOT NULL,
    qr_config_id INT UNSIGNED NOT NULL,
    config_version INT UNSIGNED NOT NULL,
    payee_name VARCHAR(150) NOT NULL,
    upi_id VARCHAR(150) NOT NULL,
    qr_file_path VARCHAR(500) NOT NULL,
    payment_instructions VARCHAR(1000) NULL,
    captured_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_subscription_payment_instructions (tenant_id, subscription_id),
    KEY idx_subscription_payment_instructions_config (qr_config_id, config_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS TENANT_SUBSCRIPTION_REVIEW_HISTORY (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    subscription_id INT UNSIGNED NOT NULL,
    payment_proof_id INT UNSIGNED NULL,
    decision VARCHAR(20) NOT NULL,
    review_reason VARCHAR(1000) NULL,
    reviewer_user_id INT UNSIGNED NULL,
    reviewed_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_subscription_review_history (tenant_id, subscription_id, reviewed_on, id),
    KEY idx_subscription_review_reviewer (reviewer_user_id, reviewed_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill the existing decision fields into the append-only review timeline.
INSERT INTO TENANT_SUBSCRIPTION_REVIEW_HISTORY
    (tenant_id, subscription_id, payment_proof_id, decision, review_reason,
     reviewer_user_id, reviewed_on, status, created_by, updated_by)
SELECT ts.tenant_id, ts.id, proof.id, ts.subscription_status, ts.rejection_reason,
       COALESCE(ts.approved_by, proof.reviewed_by, ts.updated_by, ts.created_by),
       COALESCE(ts.approved_on, proof.reviewed_on, ts.updated_on, ts.created_on),
       'A', COALESCE(ts.approved_by, proof.reviewed_by, ts.created_by),
       COALESCE(ts.approved_by, proof.reviewed_by, ts.updated_by, ts.created_by)
FROM TENANT_SUBSCRIPTIONS ts
LEFT JOIN SUBSCRIPTION_PAYMENT_PROOFS proof
    ON proof.id = (
        SELECT MAX(proof_latest.id)
        FROM SUBSCRIPTION_PAYMENT_PROOFS proof_latest
        WHERE proof_latest.tenant_id = ts.tenant_id
            AND proof_latest.subscription_id = ts.id
            AND proof_latest.review_status = CASE WHEN ts.subscription_status = 'ACTIVE' THEN 'APPROVED' ELSE 'REJECTED' END
            AND proof_latest.status = 'A'
    )
WHERE ts.subscription_status IN ('ACTIVE', 'REJECTED')
  AND ts.status = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM TENANT_SUBSCRIPTION_REVIEW_HISTORY h
      WHERE h.tenant_id = ts.tenant_id AND h.subscription_id = ts.id
  );
