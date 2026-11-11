import { describe, expect, it } from 'vitest'
import { resolveWhatsAppRecipient } from './recipient'

describe('resolveWhatsAppRecipient', () => {
  it('uses a WhatsApp Business-Scoped User ID without phone normalization or retries', () => {
    expect(resolveWhatsAppRecipient({
      phone: '',
      whatsapp_user_id: 'bsuid:customer-123',
    })).toEqual({
      to: 'bsuid:customer-123',
      variants: ['bsuid:customer-123'],
      phone: null,
    })
  })

  it('preserves phone validation and variants for phone-based contacts', () => {
    const recipient = resolveWhatsAppRecipient({ phone: '+15551234567' })
    expect(recipient.to).toBe('15551234567')
    expect(recipient.variants).toContain(recipient.to)
    expect(recipient.phone).toBe(recipient.to)
  })

  it('rejects contacts with neither a phone nor a WhatsApp user ID', () => {
    expect(() => resolveWhatsAppRecipient({ phone: '' })).toThrow(
      'Contact has no WhatsApp phone number or user ID.',
    )
  })
})
