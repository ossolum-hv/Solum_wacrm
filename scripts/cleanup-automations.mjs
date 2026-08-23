// Cleanup script: remove inactive automations, rename active ones to show single flow
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// Inactive automations to delete
const inactiveIds = [
  'e76ead70-60b8-48c8-b1ce-e5ac0c44fcaf', // Welcome Message
  '72cd8f57-b179-47df-afc0-7cd9b181962b', // Sales Order Flow
  '54b81354-f7b8-4bd2-b889-8dcdb7df42c0', // Digital Sales Flow (duplicate)
  '7ac7e5c2-0ddb-4b1c-8998-f7cf4cddd30b'  // Thanks
]

async function cleanup() {
  for (const id of inactiveIds) {
    const { error: stepsErr } = await supabase
      .from('automation_steps')
      .delete()
      .eq('automation_id', id)
    if (stepsErr) console.error('Steps delete error:', id, stepsErr)
    else console.log('Deleted steps for:', id)

    const { error: autoErr } = await supabase
      .from('automations')
      .delete()
      .eq('id', id)
    if (autoErr) console.error('Automation delete error:', id, autoErr)
    else console.log('Deleted automation:', id)
  }

  // Rename the remaining two to show they're a single flow
  await supabase
    .from('automations')
    .update({ name: 'Digital Sales Flow - Intake (Keyword → Payment Link)' })
    .eq('id', '89f3e6f9-b81d-4932-b547-3833db557c33')

  await supabase
    .from('automations')
    .update({ name: 'Digital Sales Flow - Delivery (Order Paid → Download)' })
    .eq('id', 'faa4a92b-2c3a-4f44-8c32-0b3ce6b02cfe')

  console.log('Renamed active automations')

  // Verify final state
  const { data } = await supabase
    .from('automations')
    .select('id, name, trigger_type, is_active')
  console.log('\nFinal automations:', JSON.stringify(data, null, 2))
}

cleanup().catch((e) => {
  console.error(e)
  process.exit(1)
})