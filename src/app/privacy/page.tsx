import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy",
  description: "wacrm Privacy Policy - How we collect, use, and protect your data.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  const lastUpdated = "January 15, 2025";

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted/50 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>1. Introduction</CardTitle>
                <CardDescription>
                  Welcome to wacrm ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground">
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our self-hosted WhatsApp CRM software ("the Software"). Please read this policy carefully.
                </p>
                <p className="mt-4 text-muted-foreground">
                  <strong>Important:</strong> wacrm is self-hosted software. You deploy and run it on your own infrastructure. We (the developers of wacrm) do not have access to your instance, your data, or your users' data unless you explicitly share it with us.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>2. Information We Collect</CardTitle>
                <CardDescription>
                  Since wacrm is self-hosted, the data collected depends on your deployment and usage.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <h3 className="font-semibold mt-4">2.1 Data You Provide</h3>
                <ul className="mt-2 list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Account information (name, email, password) for authentication</li>
                  <li>WhatsApp Business Account credentials (phone number ID, access tokens)</li>
                  <li>Contact information you import or create (names, phone numbers, emails, custom fields)</li>
                  <li>Conversation messages, media, and metadata</li>
                  <li>Pipeline deals, stages, and associated notes</li>
                  <li>Broadcast templates, recipient lists, and delivery reports</li>
                  <li>Automation flow definitions and execution logs</li>
                  <li>AI assistant configuration (API keys, business context, knowledge base documents)</li>
                </ul>

                <h3 className="font-semibold mt-6">2.2 Data Collected Automatically</h3>
                <ul className="mt-2 list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Application logs (errors, performance metrics, audit trails)</li>
                  <li>Authentication logs (login attempts, session data)</li>
                  <li>Usage analytics (feature adoption, performance) — only if you enable telemetry</li>
                </ul>

                <h3 className="font-semibold mt-6">2.3 Third-Party Data</h3>
                <ul className="mt-2 list-disc list-inside space-y-2 text-muted-foreground">
                  <li>WhatsApp Cloud API / Meta data: message delivery status, template approvals, webhook events</li>
                  <li>OpenAI (optional): message content sent for AI reply generation when enabled</li>
                  <li>Supabase (your instance): all application data stored in your database</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>3. How We Use Your Information</CardTitle>
                <CardDescription>
                  Your data is used solely to provide the CRM functionality you expect.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                  <li><strong>Authentication & Authorization:</strong> Managing user accounts, roles, and permissions</li>
                  <li><strong>Messaging:</strong> Sending, receiving, and storing WhatsApp conversations</li>
                  <li><strong>CRM Operations:</strong> Managing contacts, pipelines, deals, and activities</li>
                  <li><strong>Broadcasts:</strong> Delivering templated messages and tracking delivery status</li>
                  <li><strong>Automations:</strong> Executing flow logic, capturing variables, routing conversations</li>
                  <li><strong>AI Features (opt-in):</strong> Generating reply suggestions, auto-replies, and knowledge base search</li>
                  <li><strong>Security:</strong> Audit logging, anomaly detection, session management</li>
                  <li><strong>Compliance:</strong> Fulfilling legal obligations, data retention policies you configure</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>4. Data Storage & Hosting</CardTitle>
                <CardDescription>
                  You have full control over where your data lives.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground">
                  wacrm is designed to be self-hosted. All data resides in <strong>your infrastructure</strong>:
                </p>
                <ul className="mt-4 list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Database:</strong> Your Supabase/PostgreSQL instance (you control the region, backups, encryption)</li>
                  <li><strong>File Storage:</strong> Your Supabase Storage or S3-compatible bucket (media, documents)</li>
                  <li><strong>Application:</strong> Your servers, containers, or serverless functions (Vercel, Docker, Kubernetes, etc.)</li>
                  <li><strong>Secrets:</strong> Your environment variables / secret manager (API keys, tokens, encryption keys)</li>
                </ul>
                <p className="mt-4 text-muted-foreground">
                  We do not operate a hosted version of wacrm. We never see your data unless you voluntarily share it (e.g., in a support request or bug report).
                </p>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>5. Data Sharing & Third Parties</CardTitle>
                <CardDescription>
                  We do not sell your data. Third-party access only occurs through integrations you explicitly configure.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                  <li><strong>Meta / WhatsApp:</strong> Messages flow through WhatsApp Cloud API. Meta's privacy policy applies to data in transit.</li>
                  <li><strong>OpenAI (optional):</strong> Only when you enable AI features and provide an API key. Message content is sent to generate replies.</li>
                  <li><strong>Your Supabase Project:</strong> All application data. Supabase's privacy policy applies to their platform.</li>
                  <li><strong>Your Infrastructure Providers:</strong> Vercel, AWS, Docker, etc. — their policies apply to hosting.</li>
                  <li><strong>Legal Requirements:</strong> We may disclose data if required by law, but since we don't host your data, this would apply to you directly.</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>6. Data Retention & Deletion</CardTitle>
                <CardDescription>
                  You control retention policies.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                  <li>Conversation history: Retained until you delete it or configure auto-deletion</li>
                  <li>Contact data: Retained until deleted</li>
                  <li>Broadcast logs: Retained per your compliance settings</li>
                  <li>Flow execution logs: Configurable retention (default 90 days)</li>
                  <li>Audit logs: Configurable retention (default 1 year)</li>
                  <li>Authentication logs: Configurable retention (default 90 days)</li>
                  <li>Account data: Deleted when you delete the account (cascades to related data)</li>
                </ul>
                <p className="mt-4 text-muted-foreground">
                  You can export all data at any time via the Settings &gt; Data Export feature.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>7. Security</CardTitle>
                <CardDescription>
                  Security is a shared responsibility.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                  <li><strong>In Transit:</strong> All external communication uses TLS 1.2+</li>
                  <li><strong>At Rest:</strong> Database encryption provided by your infrastructure (Supabase, PostgreSQL, cloud provider)</li>
                  <li><strong>Authentication:</strong> Supabase Auth with JWT, secure cookies, CSRF protection</li>
                  <li><strong>Authorization:</strong> Role-based access control (Owner, Admin, Agent, Viewer)</li>
                  <li><strong>Secrets:</strong> Stored in environment variables, never in code or database</li>
                  <li><strong>Webhooks:</strong> Signature verification for all incoming WhatsApp webhooks</li>
                  <li><strong>Your Responsibility:</strong> Keep dependencies updated, rotate keys, monitor logs, configure firewall rules</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>8. Your Rights</CardTitle>
                <CardDescription>
                  Since you host the data, you have full control.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                  <li><strong>Access:</strong> View all data in your dashboard or export via Settings</li>
                  <li><strong>Rectification:</strong> Edit any record directly in the UI</li>
                  <li><strong>Erasure:</strong> Delete contacts, conversations, accounts, or the entire instance</li>
                  <li><strong>Portability:</strong> Export all data as JSON/CSV from Settings</li>
                  <li><strong>Restriction:</strong> Disable features, revoke API keys, pause automations</li>
                  <li><strong>Objection:</strong> Opt out of AI features, telemetry, or specific processing</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>9. International Data Transfers</CardTitle>
                <CardDescription>
                  Data location is determined by your infrastructure choices.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground">
                  Since you choose where to deploy, you control data residency:
                </p>
                <ul className="mt-4 list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Select Supabase region (US, EU, APAC, etc.)</li>
                  <li>Choose cloud provider region for application hosting</li>
                  <li>Configure S3 bucket region for file storage</li>
                  <li>OpenAI API calls route through their global infrastructure (if enabled)</li>
                  <li>WhatsApp Cloud API routes through Meta's global infrastructure</li>
                </ul>
                <p className="mt-4 text-muted-foreground">
                  Review each provider's data processing agreements for compliance with your local regulations (GDPR, LGPD, CCPA, etc.).
                </p>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>10. Children's Privacy</CardTitle>
                <CardDescription>
                  wacrm is not directed at children.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground">
                  The Software is a business tool for adults. You are responsible for ensuring your use complies with applicable children's privacy laws (COPPA, GDPR Article 8, etc.). We do not knowingly collect data from children under 13 (or 16 in the EU).
                </p>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>11. AI & Automated Decision Making</CardTitle>
                <CardDescription>
                  AI features are optional and transparent.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                  <li><strong>Opt-in Only:</strong> AI features require explicit configuration with your API key</li>
                  <li><strong>Human in the Loop:</strong> AI suggestions require human approval before sending</li>
                  <li><strong>No Profiling:</strong> We don't build user profiles for automated decision-making</li>
                  <li><strong>Transparency:</strong> AI-generated content is labeled in the UI</li>
                  <li><strong>Data Minimization:</strong> Only message context is sent; no personal identifiers unless in conversation</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>12. Changes to This Policy</CardTitle>
                <CardDescription>
                  We may update this policy as the software evolves.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground">
                  Updates will be posted to this page with a revised "Last updated" date. Since you self-host, you control when to update your instance. We recommend reviewing this policy when upgrading wacrm versions.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Material changes will be highlighted in release notes. Continued use of the software after changes constitutes acceptance.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>13. Contact Us</CardTitle>
                <CardDescription>
                  Questions about this policy or the software?
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>GitHub Issues: <a href="https://github.com/ossolum-hv/Solum_wacrm/issues" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Report issues or ask questions</a></li>
                  <li>Discussions: <a href="https://github.com/ossolum-hv/Solum_wacrm/discussions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Community discussions</a></li>
                  <li>Security: <a href="mailto:security@wacrm.io" className="text-primary hover:underline">security@wacrm.io</a> (for vulnerability reports)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>14. License & Attribution</CardTitle>
                <CardDescription>
                  wacrm is open source software.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground">
                  wacrm is licensed under the <a href="https://github.com/ossolum-hv/Solum_wacrm/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">MIT License</a>. You are free to use, modify, and distribute the software per the license terms.
                </p>
                <p className="mt-4 text-muted-foreground">
                  This privacy policy only covers the wacrm software itself. Your deployment may include third-party services (Supabase, Meta, OpenAI, etc.) each with their own terms and privacy policies.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t py-12 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} wacrm. Self-hosted WhatsApp CRM.
            </p>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link
                href="https://github.com/ossolum-hv/Solum_wacrm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}