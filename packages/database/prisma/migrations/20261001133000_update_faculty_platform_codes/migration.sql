-- Migration: Update platformCode for faculty members to enforce AF-FAC- prefix
-- Converts existing AF-USR-XXXXX or AF-STU-XXXXX codes for faculty to AF-FAC-XXXXX preserving their suffix

UPDATE "User"
SET "platformCode" = REGEXP_REPLACE("platformCode", '^AF-(USR|STU)-', 'AF-FAC-')
WHERE ("userType" = 'FACULTY' OR "email" ILIKE '%mitsgwalior.in%')
  AND "platformCode" IS NOT NULL
  AND "platformCode" NOT LIKE 'AF-FAC-%';

-- Assign unique AF-FAC- codes to any faculty missing a platformCode
UPDATE "User"
SET "platformCode" = 'AF-FAC-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0')
WHERE ("userType" = 'FACULTY' OR "email" ILIKE '%mitsgwalior.in%')
  AND ("platformCode" IS NULL OR "platformCode" = '');

-- Ensure all faculty email users have userType set to FACULTY
UPDATE "User"
SET "userType" = 'FACULTY'
WHERE "email" ILIKE '%mitsgwalior.in%'
  AND "userType" != 'FACULTY';
