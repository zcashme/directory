-- Migration: Remove worldcities table and nearest_city_id column
-- Run in this order. All three are irreversible without a backup.
--
-- Prerequisites:
--   - Ensure zcasher_searchable view does not select nearest_city_id (recreate if needed)
--   - Ensure no RLS policies reference nearest_city_id
--   - Code no longer references nearest_city_id or worldcities (done in c2bc932)

-- 1. Remove the FK that ties zcasher.nearest_city_id → worldcities.id
ALTER TABLE zcasher DROP CONSTRAINT zcasher_nearest_city_fk;

-- 2. Drop the column from every profile row (nearest_city_name already stores the display string)
ALTER TABLE zcasher DROP COLUMN nearest_city_id;

-- 3. Delete the ~44k-row reference table entirely (city search now uses city-timezones npm package)
DROP TABLE worldcities;
