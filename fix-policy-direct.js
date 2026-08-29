require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSQL() {
  // Drop the problematic policy
  const dropSql = 'DROP POLICY IF EXISTS "Superadmins can read" ON superadmins;';
  
  // Use the query method
  const { error: dropError } = await supabase.rpc('exec_sql_via_function', { sql: dropSql });
  console.log('Drop error:', dropError);
  
  // Create the fixed policy
  const createSql = `
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
  `;
  
  const { error: createError } = await supabase.rpc('exec_sql_via_function', { sql: createSql });
  console.log('Create error:', createError);
}

executeSQL().catch(console.error);