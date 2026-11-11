-- 043_contact_whatsapp_user_id.sql
-- WhatsApp Business-Scoped User IDs are not phone numbers. Keep the
-- identifier separate so phone normalization and de-duplication remain valid.
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS whatsapp_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_account_whatsapp_user_id
  ON contacts (account_id, whatsapp_user_id)
  WHERE whatsapp_user_id IS NOT NULL AND whatsapp_user_id <> '';
