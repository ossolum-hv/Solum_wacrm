import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Shared Inbox",
    description: "Manage all WhatsApp conversations in one place with team collaboration.",
  },
  {
    title: "Sales Pipelines",
    description: "Visual deal tracking with custom stages and automated follow-ups.",
  },
  {
    title: "Broadcasts",
    description: "Send templated messages to contact lists with delivery tracking.",
  },
  {
    title: "No-Code Flows",
    description: "Build WhatsApp automations visually — no engineering required.",
  },
  {
    title: "AI Replies",
    description: "Generate contextual responses with OpenAI-powered suggestions.",
  },
  {
    title: "Self-Hosted",
    description: "Full data ownership — deploy on your infrastructure.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/50 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Self-Hosted CRM for <span className="text-primary">WhatsApp</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Shared inbox, sales pipelines, broadcasts, and no-code automations —
              all on your own infrastructure.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a1 1 0 01-1 1H2a1 1 0 01-1-1v-1"
                    />
                  </svg>
                  Sign In
                </Button>
              </Link>
              <Link href="/privacy">
                <Button size="lg" variant="outline">
                  Privacy Policy
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run WhatsApp at scale
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built for teams that want control, privacy, and flexibility.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="h-full">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to run your own WhatsApp CRM?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Clone the repo, deploy to your infrastructure, and start messaging in minutes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link
              href="https://github.com/ossolum-hv/Solum_wacrm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline">
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} wacrm. Self-hosted WhatsApp CRM.
            </p>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
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
