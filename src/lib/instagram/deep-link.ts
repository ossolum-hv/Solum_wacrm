import type { DeepLinkOptions } from './types'

/**
 * Build a wa.me deep link with URL-encoded prefill.
 * Optionally appends -{sourceTag} to the prefill for attribution.
 * 
 * Example output:
 *   https://wa.me/15551234567?text=TESTBUY%20PRODCODE123-IG
 */
export function buildWaMeDeepLink(opts: DeepLinkOptions): string {
  const { whatsappNumber, prefillMessage, sourceTag = 'IG' } = opts
  const cleanNumber = whatsappNumber.replace(/\D/g, '')
  const taggedMessage = `${prefillMessage}-${sourceTag}`
  const encoded = encodeURIComponent(taggedMessage)
  return `https://wa.me/${cleanNumber}?text=${encoded}`
}