-- Preserve sufficient precision for browser-captured business coordinates.
-- Additive type widening only; existing coordinate values are retained.
-- Verify the live BUSINESS_PROFILES definition and take a backup before applying.
ALTER TABLE BUSINESS_PROFILES
    MODIFY COLUMN latitude DOUBLE(10,7) NULL,
    MODIFY COLUMN longitude DOUBLE(10,7) NULL;
