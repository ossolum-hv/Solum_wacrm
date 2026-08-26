"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Shield, Zap, Users, Clock, CreditCard, Calendar, Megaphone, Crown } from "lucide-react";
import { Suspense } from "react";
import { Navigation } from "@/components/landing/Navigation";
import { useScrollReveal, useCountUp, getStaggerDelay } from "@/lib/animations";

const problemPoints = [
  "Missed messages. Forgotten follow-ups. No way to track who paid and who didn't.",
  "Every lead lives in your personal chat, buried between family messages and spam.",
  "No shared visibility — your team doesn't know who replied to which customer.",
  "Manual payment chasing and appointment scheduling eats hours every week.",
];

const features = [
  {
    title: "Never lose a lead",
    description: "Every WhatsApp message lands in one shared inbox your team can see and reply from — no more \"who replied to this customer?\"",
    icon: Users,
  },
  {
    title: "Get paid without asking twice",
    description: "Customers type a keyword, get a payment link, and you get notified the moment they pay. No manual follow-up, no chasing.",
    icon: CreditCard,
  },
  {
    title: "Book appointments automatically",
    description: "Customers pick a slot right in WhatsApp. No back-and-forth, no double bookings.",
    icon: Calendar,
  },
  {
    title: "Send updates to everyone at once",
    description: "Announce offers, remind customers of appointments, or send order updates to your whole list in one click.",
    icon: Megaphone,
  },
  {
    title: "It runs itself",
    description: "Once it's set up, it works 24/7 — replying, booking, collecting payment — without you touching it.",
    icon: Zap,
  },
  {
    title: "We set it up for you",
    description: "You don't deploy anything or write code. We handle WhatsApp Business verification, setup, and configuration end-to-end.",
    icon: Shield,
  },
];

const verticals = [
  {
    key: "salons",
    label: "Salons & Clinics",
    headline: "Stop losing appointment bookings in your WhatsApp DMs.",
    description: "Customers book, reschedule, and pay for appointments directly in chat. Your calendar stays full — no manual coordination needed.",
  },
  {
    key: "coaching",
    label: "Coaching Centers",
    headline: "Turn WhatsApp inquiries into enrolled students — automatically.",
    description: "Capture every inquiry, send course info instantly, collect fees via payment links, and nurture leads with automated follow-ups.",
  },
  {
    key: "d2c",
    label: "D2C Sellers",
    headline: "Sell directly on WhatsApp — orders, payment links, and updates, all automated.",
    description: "Customers browse, order, and pay without leaving chat. Broadcast new drops, send shipping updates, and recover abandoned carts.",
  },
];

const pricing = [
  {
    name: "Starter",
    setupFee: "₹5,000",
    monthly: "₹3,000/mo",
    description: "Single-location businesses, <200 conversations/mo",
    features: [
      "Shared inbox for 1 location",
      "Basic keyword auto-replies",
      "Payment link collection",
      "Broadcast to contact lists",
      "Email support",
    ],
    cta: "Start Free Setup Call",
    popular: false,
  },
  {
    name: "Growth",
    setupFee: "₹10,000",
    monthly: "₹5,500/mo",
    description: "Multi-staff shared inbox, broadcasts, payment collection",
    features: [
      "Everything in Starter",
      "Multi-staff shared inbox",
      "Advanced automation flows",
      "Appointment booking system",
      "WhatsApp Business verification included",
      "Priority email support",
    ],
    cta: "Start Free Setup Call",
    popular: true,
  },
  {
    name: "Pro",
    setupFee: "₹15,000",
    monthly: "₹8,000/mo",
    description: "Full automation + booking flows + priority support",
    features: [
      "Everything in Growth",
      "Unlimited automation flows",
      "Custom integration support",
      "Dedicated Slack channel",
      "Monthly strategy call",
      "SLA-backed uptime",
    ],
    cta: "Start Free Setup Call",
    popular: false,
  },
];

export default function HomePage() {
  // Scroll reveal refs for sections
  const heroRef = useScrollReveal(0.1, "0px");
  const problemRef = useScrollReveal(0.1, "0px");
  const featuresRef = useScrollReveal(0.1, "0px");
  const verticalsRef = useScrollReveal(0.1, "0px");
  const pricingRef = useScrollReveal(0.1, "0px");
  const proofRef = useScrollReveal(0.1, "0px");
  const ctaRef = useScrollReveal(0.1, "0px");

  // Counter refs for stats (threshold=0.1 for small stat cards)
  const { count: leadsCount, ref: leadsRef } = useCountUp(15742, 2000, true, 0.1);
  const { count: messagesCount, ref: messagesRef } = useCountUp(210986, 2000, true, 0.1);
  const { count: paymentsCount, ref: paymentsRef } = useCountUp(8547300, 2000, true, 0.1);

  // Cast refs to correct type for div elements
  const leadsDivRef = leadsRef as React.RefObject<HTMLDivElement | null>;
  const messagesDivRef = messagesRef as React.RefObject<HTMLDivElement | null>;
  const paymentsDivRef = paymentsRef as React.RefObject<HTMLDivElement | null>;

  return (
    <main className="min-h-screen bg-background">
      {/* Top Navigation Bar - using new Navigation component */}
      <Suspense fallback={<nav className="fixed top-0 left-0 right-0 z-50 w-full h-14 border-b border-border/50 bg-background/80 backdrop-blur" />}>
        <Navigation />
      </Suspense>

      {/* Hero Section */}
      <section ref={heroRef} className="reveal relative overflow-hidden bg-gradient-to-b from-background to-muted/30 pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              Never miss a <span className="text-primary">WhatsApp lead</span> again.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto">
              We turn your WhatsApp into a full sales and booking system — leads, payments, and follow-ups, all automated. No app to install, nothing to manage.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="#book-call" id="book-call">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Book a Free Setup Call
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features" className="text-primary hover:text-primary/80 font-medium transition-colors">
                See how it works →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section ref={problemRef} id="problem" className="reveal py-20 lg:py-28 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              The Problem
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Your customers are already messaging you on WhatsApp. You're just handling it manually.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {problemPoints.map((point, index) => (
              <Card key={index} className="bg-background border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">{point}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section ref={featuresRef} id="features" className="reveal py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What You Get
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete WhatsApp sales system — set up by us, running for you.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="h-full bg-background border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
{/* Built For Your Business Section */}
      <section ref={verticalsRef} className="reveal py-20 lg:py-28 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built For Your Business
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the vertical that matches your business — or see how it works for all of them.
            </p>
          </div>
          
          {/* Vertical Tabs */}
          <div className="mb-12 flex flex-wrap items-center justify-center gap-2">
            {verticals.map((vertical, index) => (
              <button
                key={vertical.key}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  index === 0
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                }`}
              >
                {vertical.label}
              </button>
            ))}
          </div>

          {/* Active Vertical Content */}
          <div className="grid gap-8 lg:grid-cols-3 items-start">
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6 p-6 bg-background rounded-2xl border border-border">
                <Crown className="h-12 w-12 text-primary" aria-hidden="true" />
                <h3 className="text-2xl font-bold">{verticals[0].headline}</h3>
                <p className="text-muted-foreground">{verticals[0].description}</p>
                <Link href="#book-call" className="inline-flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors mt-4">
                  Book a call for {verticals[0].label} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
              {verticals.slice(1).map((vertical, index) => (
                <Card key={vertical.key} className="bg-background border-border/50 hover:border-primary/30 transition-colors h-full">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold">{vertical.headline}</h3>
                    <p className="mt-2 text-muted-foreground">{vertical.description}</p>
                    <Link href="#book-call" className="inline-flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors mt-4">
                      Learn more <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
{/* Pricing Section */}
      <section ref={pricingRef} id="pricing" className="reveal py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              One-time setup fee + monthly retainer. No per-message fees. No hidden costs.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {pricing.map((plan, index) => (
              <Card
                key={plan.name}
                className={`relative h-full flex flex-col ${
                  plan.popular
                    ? "border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                    : "border-border/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="flex-1 flex flex-col pt-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.monthly}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Setup fee: {plan.setupFee}</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="#book-call">
                    <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-12 text-center text-muted-foreground">
            Not sure which plan fits? <Link href="#book-call" className="text-primary font-medium hover:underline">Book a free 15-min call</Link> and we'll tell you.
          </p>
        </div>
      </section>
{/* Proof Section */}
      <section ref={proofRef} className="reveal py-20 lg:py-28 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                We use this ourselves.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our own agency runs 100% of client inquiries through this system — same setup you'd get. Every lead captured, every payment tracked, every follow-up automated.
              </p>
              {/* Animated Stats */}
              <div className="mt-10 grid gap-6 sm:grid-cols-3" role="list" aria-label="Platform statistics">
                <div ref={leadsDivRef} className="reveal text-center p-6 bg-background rounded-2xl border border-border" style={{ transitionDelay: `${getStaggerDelay(0)}s` }}>
                  <div className="text-4xl sm:text-5xl font-bold text-primary" aria-live="polite">
                    {leadsCount.toLocaleString()}+
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Leads captured</p>
                </div>
                <div ref={messagesDivRef} className="reveal text-center p-6 bg-background rounded-2xl border border-border" style={{ transitionDelay: `${getStaggerDelay(1)}s` }}>
                  <div className="text-4xl sm:text-5xl font-bold text-primary" aria-live="polite">
                    {messagesCount.toLocaleString()}+
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Messages processed</p>
                </div>
                <div ref={paymentsDivRef} className="reveal text-center p-6 bg-background rounded-2xl border border-border" style={{ transitionDelay: `${getStaggerDelay(2)}s` }}>
                  <div className="text-4xl sm:text-5xl font-bold text-primary" aria-live="polite">
                    ₹{paymentsCount.toLocaleString()}+
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Payments collected</p>
                </div>
              </div>
              <div className="mt-8 p-6 bg-background rounded-2xl border border-border">
                <p className="text-muted-foreground italic">
                  "[Screenshot or 20-sec screen recording of the real TESTBUY flow goes here — this is our strongest asset and it's not on the page yet.]"
                </p>
              </div>
            </div>
            <div className="aspect-video bg-background rounded-2xl border border-border flex items-center justify-center">
              <div className="text-center p-8">
                <Clock className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" aria-hidden="true" />
                <p className="text-muted-foreground">Demo recording placeholder</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Replace with actual TESTBUY flow recording</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section ref={ctaRef} id="book-call" className="reveal py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to stop losing leads in WhatsApp?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Book a free setup call — we'll show you exactly how it'd work for your business.
          </p>
          <div className="mt-8">
            <Link href="#book-call">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Book a Free Call
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} X.Solum. WhatsApp sales automation for SMBs.
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
                Developer / self-hosted version →
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
