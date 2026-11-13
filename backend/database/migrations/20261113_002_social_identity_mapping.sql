-- BBG social identity mapping
-- Additive only. Review the target database and take a backup before applying.
-- This table follows the approved USER_IDENTITIES design; no provider token is stored.

CREATE TABLE IF NOT EXISTS USER_IDENTITIES (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_subject VARCHAR(190) NOT NULL,
    provider_email VARCHAR(190) NULL,
    linked_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_identities_provider_subject (provider, provider_subject),
    KEY idx_user_identities_user_id (user_id),
    KEY idx_user_identities_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
