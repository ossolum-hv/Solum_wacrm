// Standalone seed script for the product-sales automation flow.
//
// Flow:
//   keyword_match ("buy")  ->  send_payment_link (manual_url)
//                         ->  condition (payment_status == paid)
//                              ├─ yes -> send_download_link
//                              └─ no  -> send_message (reminder)
//
// Run:  node scripts/seed-product-automation.mjs
//
// Requires the same env vars as the app (.env.local):
//   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//
// The script picks the FIRST active product in the account of the given
// account_id (or the first account if ACCOUNT_ID is omitted). Set
// PRODUCT_ID to force a specific product.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const FORCE_ACCOUNT = process.env.ACCOUNT_ID || null
const FORCE_PRODUCT = process.env.PRODUCT_ID || null
const KEYWORDS = (process.env.KEYWORDS || 'buy,order,purchase').split(',').map((s) => s.trim()).filter(Boolean)
const PAYMENT_BASE = process.env.PAYMENT_BASE_URL || 'https://pay.example.com/checkout'

async function main() {
  // 1. Resolve account + owner user.
  let accountId = FORCE_ACCOUNT
  let ownerId = null
  if (!accountId) {
    const { data: acc } = await supabase
      .from('accounts')
      .select('id')
      .order('created_at')
      .limit(1)
      .single()
    accountId = acc?.id ?? null
  }
  if (!accountId) {
    console.error('No account found. Set ACCOUNT_ID.')
    process.exit(1)
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('account_id', accountId)
    .limit(1)
    .single()
  ownerId = profile?.user_id ?? null
  if (!ownerId) {
    console.error('No profile found for account', accountId)
    process.exit(1)
  }

  // 2. Resolve product.
  let productId = FORCE_PRODUCT
  if (!productId) {
    const { data: prod } = await supabase
      .from('products')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)
      .single()
    productId = prod?.id ?? null
  }
  if (!productId) {
    console.error('No product found. Create one via /products or set PRODUCT_ID.')
    process.exit(1)
  }
  console.log(`Using account=${accountId} owner=${ownerId} product=${productId}`)

  // 3. Read product type so the order-paid follow-up reflects whether this is a digital handoff or a delivery update.
  const { data: productRow } = await supabase
    .from('products')
    .select('type, name')
    .eq('id', productId)
    .single()

  const isDigital = productRow?.type === 'digital'

  // 4. Create the keyword automation that sends the payment link.
  const { data: intakeAutomation, error: intakeErr } = await supabase
    .from('automations')
    .insert({
      account_id: accountId,
      user_id: ownerId,
      name: isDigital ? 'Digital Order Intake' : 'Product Order Intake',
      description:
        'Keyword trigger that sends a secure payment link so the customer can complete the sale.',
      trigger_type: 'keyword_match',
      trigger_config: { keywords: KEYWORDS, match_type: 'contains', case_sensitive: false },
      is_active: true,
    })
    .select()
    .single()
  if (intakeErr || !intakeAutomation) {
    console.error('Intake automation insert failed:', intakeErr?.message)
    process.exit(1)
  }

  const intakeId = intakeAutomation.id
  const intakeSteps = [
    {
      step_type: 'send_message',
      step_config: {
        text: `Thanks for your interest in ${productRow?.name ?? 'our product'}! Please complete the secure checkout below to confirm your order.`,
      },
    },
    {
      step_type: 'send_payment_link',
      step_config: {
        product_id: productId,
        provider: 'manual_url',
        manual_url_template: `${PAYMENT_BASE}?order={{vars.order_id}}&product=${productId}`,
        message_text:
          'Your order is ready. Complete your payment to confirm the purchase and move to the delivery stage.',
        button_text: 'Pay Now',
      },
    },
  ]

  const { error: intakeStepsErr } = await supabase.from('automation_steps').insert(
    flatten(intakeSteps, intakeId, null, null, 0),
  )
  if (intakeStepsErr) {
    console.error('Intake steps insert failed:', intakeStepsErr.message)
    process.exit(1)
  }

  // 5. Create the paid-order automation that sends the delivery/download follow-up after payment success.
  const successMessage = isDigital
    ? 'Payment confirmed! Your digital order is ready to be delivered.'
    : 'Payment confirmed! Your order is being prepared for dispatch and we will share delivery updates as soon as it is on the way.'

  const { data: paidAutomation, error: paidErr } = await supabase
    .from('automations')
    .insert({
      account_id: accountId,
      user_id: ownerId,
      name: isDigital ? 'Digital Delivery Flow' : 'Sales Delivery Flow',
      description: isDigital
        ? 'When an order is successfully paid, send the digital delivery link.'
        : 'When an order is successfully paid, confirm the sale and send the delivery update.',
      trigger_type: 'order_paid',
      trigger_config: {},
      is_active: true,
    })
    .select()
    .single()
  if (paidErr || !paidAutomation) {
    console.error('Paid-order automation insert failed:', paidErr?.message)
    process.exit(1)
  }

  const paidId = paidAutomation.id
  const paidSteps = [
    {
      step_type: 'send_message',
      step_config: {
        text: successMessage,
      },
    },
    ...(isDigital
      ? [
          {
            step_type: 'send_download_link',
            step_config: {
              product_id: productId,
              message_text: 'Your payment is confirmed — here is your delivery link: {{vars.download_url}}',
            },
          },
        ]
      : []),
  ]

  const { error: paidStepsErr } = await supabase.from('automation_steps').insert(
    flatten(paidSteps, paidId, null, null, 0),
  )
  if (paidStepsErr) {
    console.error('Paid-order steps insert failed:', paidStepsErr.message)
    process.exit(1)
  }

  console.log('✅ Created keyword automation', intakeId)
  console.log('✅ Created paid-order delivery automation', paidId)
  console.log('   Trigger: keyword_match -> send_payment_link')
  console.log('   Trigger: order_paid -> send delivery / digital download')
}

function flatten(
  steps,
  automationId,
  parentId,
  branch,
  startPos,
) {
  const rows = []
  steps.forEach((s, idx) => {
    const id = crypto.randomUUID()
    rows.push({
      id,
      automation_id: automationId,
      parent_step_id: parentId,
      branch,
      step_type: s.step_type,
      step_config: s.step_config ?? {},
      position: startPos + idx,
    })
    if (s.step_type === 'condition' && s.branches) {
      if (s.branches.yes) rows.push(...flatten(s.branches.yes, automationId, id, 'yes', 0))
      if (s.branches.no) rows.push(...flatten(s.branches.no, automationId, id, 'no', 0))
    }
  })
  return rows
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
