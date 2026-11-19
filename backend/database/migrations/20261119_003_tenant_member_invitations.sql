-- BBG tenant member invitations.
-- Invites are single-use, expiring, tenant-scoped and store only a SHA-256 token hash.
-- The invitation issuer cannot set a recipient password; recipients register/sign in themselves.

CREATE TABLE IF NOT EXISTS TENANT_INVITATIONS (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    email VARCHAR(190) NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    invitation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    expires_on DATETIME NOT NULL,
    accepted_by INT UNSIGNED NULL,
    accepted_on DATETIME NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tenant_invitations_token_hash (token_hash),
    KEY idx_tenant_invitations_tenant_email (tenant_id, email, invitation_status),
    KEY idx_tenant_invitations_expiry (expires_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
