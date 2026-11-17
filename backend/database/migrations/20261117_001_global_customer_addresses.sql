-- BBG migration: move My Account saved addresses to global user ownership.
-- Run once after backing up the target database and verifying CUSTOMER_ADDRESSES,
-- TENANT_CUSTOMERS and CUSTOMER_IDENTITIES match the approved schema.
-- Existing tenant-linked addresses are backfilled to their owning USERS.id.
-- Legacy rows that cannot be resolved remain tenant-linked with user_id NULL.

ALTER TABLE CUSTOMER_ADDRESSES
    ADD COLUMN user_id INT UNSIGNED NULL AFTER id;

UPDATE CUSTOMER_ADDRESSES ca
INNER JOIN TENANT_CUSTOMERS tc
    ON tc.id = ca.tenant_customer_id
   AND tc.tenant_id = ca.tenant_id
INNER JOIN CUSTOMER_IDENTITIES ci
    ON ci.id = tc.customer_identity_id
SET ca.user_id = ci.user_id
WHERE ca.user_id IS NULL;

ALTER TABLE CUSTOMER_ADDRESSES
    MODIFY COLUMN tenant_id INT UNSIGNED NULL,
    MODIFY COLUMN tenant_customer_id INT UNSIGNED NULL,
    ADD INDEX idx_customer_addresses_user_status (user_id, status);

-- New My Account addresses set user_id and leave tenant_id / tenant_customer_id NULL.
-- Existing tenant-specific address rows retain their tenant linkage and are backfilled
-- to user_id where their CUSTOMER_IDENTITIES relationship is available.
