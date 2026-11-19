-- BBG business onboarding: preserve device geolocation precision.
-- Target: MySQL 8.4 / currently selected BBG database.
-- Idempotent: adds missing coordinate columns or widens existing columns.
-- Apply only after verifying the target database/schema and taking a backup.
--
-- DECIMAL(10,7) preserves sub-metre coordinate resolution for latitude/longitude.
-- This migration intentionally does not add reverse geocoding or an external map dependency.

SET @latitude_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BUSINESS_PROFILES'
      AND COLUMN_NAME = 'latitude'
);

SET @latitude_sql = IF(
    @latitude_column_exists = 0,
    'ALTER TABLE BUSINESS_PROFILES ADD COLUMN latitude DECIMAL(10,7) NULL',
    'ALTER TABLE BUSINESS_PROFILES MODIFY COLUMN latitude DECIMAL(10,7) NULL'
);
PREPARE latitude_statement FROM @latitude_sql;
EXECUTE latitude_statement;
DEALLOCATE PREPARE latitude_statement;

SET @longitude_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BUSINESS_PROFILES'
      AND COLUMN_NAME = 'longitude'
);

SET @longitude_sql = IF(
    @longitude_column_exists = 0,
    'ALTER TABLE BUSINESS_PROFILES ADD COLUMN longitude DECIMAL(10,7) NULL',
    'ALTER TABLE BUSINESS_PROFILES MODIFY COLUMN longitude DECIMAL(10,7) NULL'
);
PREPARE longitude_statement FROM @longitude_sql;
EXECUTE longitude_statement;
DEALLOCATE PREPARE longitude_statement;

SET @accuracy_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BUSINESS_PROFILES'
      AND COLUMN_NAME = 'location_accuracy_m'
);

SET @accuracy_sql = IF(
    @accuracy_column_exists = 0,
    'ALTER TABLE BUSINESS_PROFILES ADD COLUMN location_accuracy_m DECIMAL(10,2) NULL',
    'ALTER TABLE BUSINESS_PROFILES MODIFY COLUMN location_accuracy_m DECIMAL(10,2) NULL'
);
PREPARE accuracy_statement FROM @accuracy_sql;
EXECUTE accuracy_statement;
DEALLOCATE PREPARE accuracy_statement;
