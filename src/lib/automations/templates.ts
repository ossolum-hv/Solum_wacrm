import type {
  AutomationStepConfig,
  AutomationStepType,
  AutomationTriggerConfig,
  AutomationTriggerType,
} from '@/types'

export type TemplateSlug =
  | 'welcome_message'
  | 'out_of_office'
  | 'lead_qualifier'
  | 'follow_up_reminder'
  | 'sales_order_flow'
  | 'support_triage_flow'
  | 'whatsapp_reply_menu'

export interface TemplateStepSeed {
  step_type: AutomationStepType
  step_config: AutomationStepConfig
  branch?: 'yes' | 'no' | null
  /** Index (within this seed list) of the Condition parent, if nested. */
  parent_index?: number | null
}

export interface AutomationTemplateDefinition {
  slug: TemplateSlug
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: AutomationTriggerConfig
  steps: TemplateStepSeed[]
}

export const AUTOMATION_TEMPLATES: Record<TemplateSlug, AutomationTemplateDefinition> = {
  welcome_message: {
    slug: 'welcome_message',
    name: 'Welcome Message',
    description: 'Auto-reply to first-time contacts with a greeting.',
    // first_inbound_message (added in PR #33) catches both brand-new
    // contacts AND manually-added/imported contacts on their first-ever
    // reply, which is what a user setting up a "welcome" automation
    // almost always wants. new_contact_created would miss the
    // manually-imported case.
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi! 👋 Thanks for reaching out. We'll get back to you shortly.",
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },
  out_of_office: {
    slug: 'out_of_office',
    name: 'Out of Office',
    description: 'Auto-reply during off-hours so nobody is left waiting.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'time_of_day',
          operand: '18:00-09:00',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Thanks for your message! Our team is offline right now (9am–6pm) and will reply first thing tomorrow.",
        },
        parent_index: 0,
        branch: 'yes',
      },
    ],
  },
  lead_qualifier: {
    slug: 'lead_qualifier',
    name: 'Lead Qualifier',
    description: 'Ask qualification questions to filter inbound leads.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['pricing', 'quote', 'buy'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Great — happy to help with pricing! Quick question: roughly how many seats are you looking for?",
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 10, unit: 'minutes' },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  follow_up_reminder: {
    slug: 'follow_up_reminder',
    name: 'Follow-up Reminder',
    description: 'Send a nudge if a contact has not replied within 24 hours.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 1, unit: 'days' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Just circling back — did you have any other questions for us? Happy to help!",
        },
      },
    ],
  },
  sales_order_flow: {
    slug: 'sales_order_flow',
    name: 'Sales Order Flow',
    description: 'From keyword to product selection, checkout, and delivery follow-up.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['buy', 'order', 'price', 'product', 'delivery'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            'Thanks for reaching out! Tell us which product you want and we will send a secure checkout link to complete the order.',
        },
      },
      {
        step_type: 'send_payment_link',
        step_config: {
          product_id: '',
          provider: 'stripe_checkout',
          message_text:
            'Thanks! Your order is ready. Complete your secure payment to confirm the purchase and we will prepare delivery.',
          button_text: 'Pay now',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            'Once payment is confirmed, our team will prepare the order and share delivery updates with you shortly.',
        },
      },
    ],
  },
  support_triage_flow: {
    slug: 'support_triage_flow',
    name: 'Support Triage Flow',
    description: 'Route support requests to the right queue with quick issue selection.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['support', 'refund', 'cancel', 'return', 'payment'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            'We can help with that. Please share your order number or the issue you are facing, and our support team will review it.',
        },
      },
      {
        step_type: 'send_buttons',
        step_config: {
          kind: 'buttons',
          body: 'What do you need help with?',
          header: 'Support',
          buttons: [
            { id: 'refund_request', title: 'Refund' },
            { id: 'order_issue', title: 'Delivery' },
            { id: 'general_support', title: 'General' },
          ],
        },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  whatsapp_reply_menu: {
    slug: 'whatsapp_reply_menu',
    name: 'WhatsApp Reply Menu',
    description: 'Offer quick options for sales, support, and order status replies.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_buttons',
        step_config: {
          kind: 'buttons',
          body: 'Hi! How can we help today?',
          header: 'Quick options',
          buttons: [
            { id: 'get_quote', title: 'Get quote' },
            { id: 'support', title: 'Support' },
            { id: 'order_status', title: 'Order status' },
          ],
        },
      },
    ],
  },
}

export function getTemplate(slug: string): AutomationTemplateDefinition | null {
  return AUTOMATION_TEMPLATES[slug as TemplateSlug] ?? null
}
