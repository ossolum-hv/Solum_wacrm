-- Fix infinite recursion in superadmins RLS policy
-- The "Superadmins can read" policy was querying the superadmins table
-- to check if the user is a superadmin, which caused infinite recursion.
-- Fixed by querying auth.users instead.

-- Drop the problematic policy
DROP POLICY IF EXISTS "Superadmins can read" ON superadmins;

-- Create the fixed policy that avoids infinite recursion
CREATE POLICY "Superadmins can read"
  ON superadmins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM superadmins sa
        WHERE sa.user_id = u.id
      )
    )
  );