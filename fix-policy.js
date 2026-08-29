const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPolicy() {
  // Drop the problematic policy
  const dropSql = 'DROP POLICY IF EXISTS "Superadmins can read" ON superadmins;';
  const { error: dropError } = await supabase.from('_exec_sql').select('*').limit(0); // dummy query
  console.log('Using direct SQL execution...');
  
  // Use pg_metaschema approach - query pg_policies to verify
  const { data: policies, error: policyError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'superadmins');
  
  console.log('Current policies:', policies);
  console.log('Policy error:', policyError);
}

fixPolicy();