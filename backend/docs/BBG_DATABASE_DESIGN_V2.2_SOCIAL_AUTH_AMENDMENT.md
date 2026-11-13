# BBG Database Design v2.2 — Social Identity Amendment

**Date:** 13 November 2026  
**Base:** BBG Database Design Final v2.0  
**Implementation migration:** `20261113_002_social_identity_mapping.sql`  
**Target:** MySQL 8.4 / InnoDB / utf8mb4

## 1. Purpose

The v2.0 data dictionary defines `USER_IDENTITIES` as the mapping between a BBG user and an immutable external provider account identifier. This amendment records the additional Apple provider requested for the BBG authentication experience and the additive migration that creates the table when it is absent.

This amendment does not change the table's source-defined columns or add provider-token storage.

## 2. Supported provider values

The `USER_IDENTITIES.provider` column remains `VARCHAR(50) NOT NULL`. The supported values for the current authentication implementation are:

- `GOOGLE`
- `FACEBOOK`
- `APPLE` — added by this amendment to support Sign in with Apple.
- `INSTAGRAM` — Instagram Login for Business and Creator accounts only.

The database design's `LINKEDIN` value remains schema-compatible but is not enabled by the current UI or backend implementation.

## 3. Table definition

The migration creates the table with the source-defined fields:

| Column | MySQL definition |
|---|---|
| `id` | `INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `user_id` | `INT UNSIGNED NOT NULL` |
| `provider` | `VARCHAR(50) NOT NULL` |
| `provider_subject` | `VARCHAR(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL` |
| `provider_email` | `VARCHAR(190) NULL` |
| `linked_on` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `status` | `VARCHAR(1) NOT NULL DEFAULT 'A'` |
| `created_by` | `INT UNSIGNED NULL` |
| `created_on` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `updated_by` | `INT UNSIGNED NULL` |
| `updated_on` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

**Uniqueness:** `(provider, provider_subject)`. A user may link multiple providers. A provider subject is the immutable identity key; email is never used as the provider identity key.

## 4. Security and lifecycle rules

- Store only the provider, immutable provider subject, optional provider email and BBG user mapping. Do not store provider access tokens or ID tokens.
- Use `status='A'` for active identity mappings and `status='Z'` for soft-deleted mappings, consistent with the BBG A/Z convention.
- Do not silently link an external identity to a BBG account because the email addresses match. Linking requires an authenticated BBG session and an explicit provider-link action.
- The backend verifies provider credentials before looking up or creating a BBG account.
- Provider-only accounts retain a nullable `password_hash`; first-time social registration still requires at least an email address or mobile number, supplied by the provider or entered by the user.
- No physical foreign key is introduced by this migration, consistent with the existing backend migration convention.

## 5. Migration safety

The migration is additive and uses `CREATE TABLE IF NOT EXISTS`. It does not execute automatically. Before applying it, verify the active database and compare its live `USER_IDENTITIES` definition with this table specification. Back up the database first. If the table already exists, reconcile its columns and indexes manually; `IF NOT EXISTS` does not repair an existing table.
