# Meta integrations and credentials

The CRM connects to Meta products with product- and business-asset-scoped
authorization. A Meta App ID and App Secret identify the developer app; they
do not replace the access token required to operate a WhatsApp Business
Account, phone number, Facebook Page, or Instagram professional account.

## Credentials used by this app

| Credential | Purpose | Does not do |
|---|---|---|
| Meta App ID (`META_APP_ID`) | Identifies this app for Instagram OAuth, webhook checks, and app-scoped template media uploads. | Does not authorize the CRM to send messages or manage a customer asset. |
| Meta App Secret (`META_APP_SECRET`) | Server-side Instagram OAuth code exchange and HMAC-SHA256 validation of Meta webhook signatures. | Is not an access token and must never be exposed to the browser or treated as a universal product token. |
| WhatsApp access token | Authorizes calls to the selected WhatsApp Business Account/phone number, subject to granted permissions and asset assignment. Stored encrypted in the CRM's WhatsApp settings. | Does not authorize Instagram or unrelated Meta assets. |
| Facebook Page access token | Used by this app's current Instagram Facebook Login flow to verify the linked Page/Instagram account and subscribe Page webhooks. Stored encrypted in the CRM's Instagram settings. | Does not grant access to assets or permissions that were not granted to the app/user. |

Meta can issue an App Access Token from app credentials for app-scoped
operations. That is different from the App Secret and is not a replacement for
the user-, system-user-, or asset-scoped tokens needed by these integrations.
An app may cover multiple Meta products, but permissions and asset grants are
still product-specific.

## Instagram configuration in this repository

The current implementation uses **Instagram API with Facebook Login**:

1. Configure the Instagram product and the Facebook Login redirect URI
   `https://<your-domain>/api/instagram/oauth/callback` in Meta for Developers.
2. Set `META_APP_ID` and `META_APP_SECRET` in the server environment.
   Set `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` to a long random value and enter that
   same value in the Meta App Dashboard webhook configuration.
3. Grant the Facebook user access to the Facebook Page linked to the
   Instagram professional account. OAuth must resolve to exactly one eligible
   linked Page; the CRM intentionally refuses to choose an arbitrary Page if
   multiple Instagram Pages are returned.
4. Connect from Settings → Instagram. The CRM validates the Page token and
   requests the Page's `messages` and `comments` webhook subscriptions.
5. In the Meta App Dashboard, configure the webhook callback
   `https://<your-domain>/api/instagram/webhook`, the generated verify token
   (entered only for manual setup), and the corresponding Instagram webhook
   fields. Meta's webhook delivery configuration is still required; the
   Settings health indicator checks the Page's app subscription and does not
   prove that the app-level callback is configured or approved.

For comment replies, the account needs the Instagram comment-management
permission. For DMs, it needs Instagram messaging permission and the required
review/advanced access for the app's deployment model. Meta may change
permission names, eligibility, and review requirements; confirm them in the
current App Dashboard before production use.

This codebase does **not** currently configure Instagram API with Instagram
Login's Unified Login flow or WhatsApp Embedded Signup. Those flows require
Dashboard configuration (including login configuration IDs for applicable
products) and distinct permission/asset onboarding; they are not activated by
copying the App Secret into the CRM.

## WhatsApp configuration in this repository

WhatsApp Cloud API settings require the access token and phone-number ID for
the selected WhatsApp Business Account. The phone number must be registered
with the Cloud API and the app must have the needed WhatsApp permissions.
Inbound delivery also requires the app-level WhatsApp webhook callback and
field subscriptions to be configured in Meta. The App Secret validates the
webhook signature; it is not the token used to send messages.

## API version

Meta Graph API calls in this repository use a shared version constant. The
version is pinned to `v27.0` and must be revisited against Meta's changelog and
product-specific deprecation notices when upgrading the app.

## Official references

- [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog/)
- [Instagram API with Facebook Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/)
- [Instagram Messaging API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/messaging-api/)
- [Instagram webhooks](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/webhooks/)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [WhatsApp Embedded Signup](https://developers.facebook.com/docs/whatsapp/embedded-signup/)
