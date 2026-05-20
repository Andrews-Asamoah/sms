-- ============================================================================
-- POSTGRESQL ROW LEVEL SECURITY (RLS) MIGRATION
-- Project: Multi-Tenant School Management System (SMS)
-- Core tables isolated: students, teachers, staff, guardians, classes, subjects
-- ============================================================================

-- 1. Enable Row Level Security (RLS) on core tables
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teachers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guardians" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they already exist (idempotent)
DROP POLICY IF EXISTS school_isolation_policy ON "students";
DROP POLICY IF EXISTS school_isolation_policy ON "teachers";
DROP POLICY IF EXISTS school_isolation_policy ON "staff";
DROP POLICY IF EXISTS school_isolation_policy ON "guardians";
DROP POLICY IF EXISTS school_isolation_policy ON "classes";
DROP POLICY IF EXISTS school_isolation_policy ON "subjects";

-- 3. Create RLS Policies using case-sensitive column "schoolId"
-- Policies leverage current_setting('app.current_school_id', true).
-- If the setting is NULL, empty string '', or not set, RLS allows access 
-- (acting as a safe default for global operations, migrations, and superAdmins).
-- Otherwise, access is strictly limited to rows matching the tenant.
CREATE POLICY school_isolation_policy ON "students"
  USING ("schoolId" = NULLIF(current_setting('app.current_school_id', true), '') OR NULLIF(current_setting('app.current_school_id', true), '') IS NULL);

CREATE POLICY school_isolation_policy ON "teachers"
  USING ("schoolId" = NULLIF(current_setting('app.current_school_id', true), '') OR NULLIF(current_setting('app.current_school_id', true), '') IS NULL);

CREATE POLICY school_isolation_policy ON "staff"
  USING ("schoolId" = NULLIF(current_setting('app.current_school_id', true), '') OR NULLIF(current_setting('app.current_school_id', true), '') IS NULL);

CREATE POLICY school_isolation_policy ON "guardians"
  USING ("schoolId" = NULLIF(current_setting('app.current_school_id', true), '') OR NULLIF(current_setting('app.current_school_id', true), '') IS NULL);

CREATE POLICY school_isolation_policy ON "classes"
  USING ("schoolId" = NULLIF(current_setting('app.current_school_id', true), '') OR NULLIF(current_setting('app.current_school_id', true), '') IS NULL);

CREATE POLICY school_isolation_policy ON "subjects"
  USING ("schoolId" = NULLIF(current_setting('app.current_school_id', true), '') OR NULLIF(current_setting('app.current_school_id', true), '') IS NULL);
