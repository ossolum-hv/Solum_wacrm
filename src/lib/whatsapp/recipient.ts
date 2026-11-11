import {
  isValidE164,
  phoneVariants,
  sanitizePhoneForMeta,
} from '@/lib/whatsapp/phone-utils'

export interface WhatsAppRecipientContact {
  phone?: string | null
  whatsapp_user_id?: string | null
}

export interface ResolvedWhatsAppRecipient {
  to: string
  variants: string[]
  phone: string | null
}

export function resolveWhatsAppRecipient(
  contact: WhatsAppRecipientContact,
): ResolvedWhatsAppRecipient {
  const whatsappUserId = contact.whatsapp_user_id?.trim()
  if (whatsappUserId) {
    return { to: whatsappUserId, variants: [whatsappUserId], phone: null }
  }

  if (!contact.phone) {
    throw new Error('Contact has no WhatsApp phone number or user ID.')
  }

  const phone = sanitizePhoneForMeta(contact.phone)
  if (!isValidE164(phone)) {
    throw new Error('Invalid phone number format')
  }

  return { to: phone, variants: phoneVariants(phone), phone }
}
