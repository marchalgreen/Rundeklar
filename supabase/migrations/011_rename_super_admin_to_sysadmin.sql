-- Migration: Rename super_admin role to sysadmin
-- This makes the role name more accurate and professional

-- 1. Update existing data: Change all 'super_admin' roles to 'sysadmin'
UPDATE clubs 
SET role = 'sysadmin' 
WHERE role = 'super_admin';

-- 2. Drop old CHECK constraint
ALTER TABLE clubs DROP CONSTRAINT IF EXISTS clubs_role_check;

-- 3. Add new CHECK constraint with 'sysadmin' instead of 'super_admin'
ALTER TABLE clubs ADD CONSTRAINT clubs_role_check 
  CHECK (role IN ('sysadmin', 'admin', 'coach'));

-- 4. Update role_auth_requirements constraint
ALTER TABLE clubs DROP CONSTRAINT IF EXISTS clubs_role_auth_requirements;

ALTER TABLE clubs ADD CONSTRAINT clubs_role_auth_requirements 
  CHECK (
    (role = 'coach' AND username IS NOT NULL AND pin_hash IS NOT NULL AND password_hash IS NULL) OR
    (role IN ('admin', 'sysadmin') AND password_hash IS NOT NULL)
  );

