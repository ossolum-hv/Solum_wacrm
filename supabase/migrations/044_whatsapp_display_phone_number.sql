-- Cache the public WhatsApp phone number separately from Meta's internal ID.
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS display_phone_number TEXT;
