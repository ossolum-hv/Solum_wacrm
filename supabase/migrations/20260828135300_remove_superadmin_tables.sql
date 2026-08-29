-- ============================================================
-- Remove superadmin functionality from the application
--
-- This migration removes all superadmin-related tables, functions,
-- and policies. The superadmin concept has been removed from the
-- application architecture.
-- ============================================================

-- Drop policies first
DROP POLICY IF EXISTS "Superadmins can read audit logs" ON superadmin_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON superadmin_audit_log;
DROP POLICY IF EXISTS "Superadmins can read" ON superadmins;
DROP POLICY IF EXISTS "Superadmins can insert" ON superadmins;
DROP POLICY IF EXISTS "Superadmins can delete" ON superadmins;
DROP POLICY IF EXISTS "Users can check own superadmin status" ON superadmins;

-- Drop indexes
DROP INDEX IF EXISTS idx_superadmin_audit_log_superadmin;
DROP INDEX IF EXISTS idx_superadmin_audit_log_target_user;
DROP INDEX IF EXISTS idx_superadmin_audit_log_action;
DROP INDEX IF EXISTS idx_superadmin_audit_log_created_at;

-- Drop tables
DROP TABLE IF EXISTS superadmin_audit_log;
DROP TABLE IF EXISTS superadmins;

-- Drop functions
DROP FUNCTION IF EXISTS public.is_superadmin_user(uuid);

-- Note: Leads table is retained as it may have non-superadmin use cases
