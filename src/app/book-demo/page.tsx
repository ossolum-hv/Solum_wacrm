"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Calendar, Mail, Phone, User, Building2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  industry: string;
  team_size: string;
  message: string;
}

const INDUSTRIES = [
  "Real Estate",
  "Education",
  "Healthcare",
  "Automotive",
  "D2C / E-commerce",
  "Coaching / Training",
  "Financial Services",
  "Travel & Hospitality",
  "Other",
];

const TEAM_SIZES = [
  "Just me",
  "2-5 people",
  "6-20 people",
  "21-50 people",
  "51-200 people",
  "200+ people",
];

export default function BookDemoPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    industry: "",
    team_size: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // For now, simulate a successful submission
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In production, send to your API:
      // const res = await fetch("/api/leads", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(formData),
      // });

      console.log("Lead submitted:", formData);
      setSubmitted(true);
      toast.success("Demo request submitted! We'll contact you soon.");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "rgba(37,211,102,0.1)" }}>
            <Check className="w-8 h-8" style={{ color: "var(--wa)" }} />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-gradient">Request Received!</h1>
          <p className="mb-8" style={{ color: "var(--text-dim)" }}>
            Thank you for your interest in X.Solum. Our team will reach out within 24 hours to schedule your personalized demo.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm" style={{ background: "rgba(0,229,255,0.1)", color: "var(--accent)" }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: "var(--text-dim)" }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-4 glass" style={{ color: "var(--accent)" }}>
              <Calendar className="w-3 h-3" />
              Schedule a Demo
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
              See X.Solum in Action
            </h1>
            <p className="text-lg" style={{ color: "var(--text-dim)" }}>
              Get a personalized walkthrough of how AI can transform your WhatsApp sales.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-dim)" }} />
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Rahul Sharma"
                    className="w-full pl-10 pr-4 py-3 rounded-lg glass-card border-0 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Work Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-dim)" }} />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="rahul@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg glass-card border-0 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-dim)" }} />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-3 rounded-lg glass-card border-0 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Company Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-dim)" }} />
                  <input
                    type="text"
                    name="company_name"
                    required
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Acme Realty"
                    className="w-full pl-10 pr-4 py-3 rounded-lg glass-card border-0 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Industry</label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg glass-card border-0 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Team Size</label>
              <select
                name="team_size"
                value={formData.team_size}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg glass-card border-0 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
                style={{ background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
              >
                <option value="">Select team size</option>
                {TEAM_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">What are you hoping to achieve?</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4" style={{ color: "var(--text-dim)" }} />
                <textarea
                  name="message"
                  rows={3}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your current sales process and challenges..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg glass-card border-0 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)] resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, var(--accent), #7B2CBF)", color: "white" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Book My Demo"
              )}
            </button>

            <p className="text-xs text-center" style={{ color: "var(--text-dim)" }}>
              By submitting, you agree to our{" "}
              <Link href="/privacy" className="underline hover:text-white">
                Privacy Policy
              </Link>
              . No spam, ever.
            </p>
          </form>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">What to expect in your demo</h2>
            <ul className="space-y-4">
              {[
                "Personalized walkthrough based on your industry",
                "See AI handling real conversations live",
                "Learn how to capture leads from Instagram & Facebook",
                "Understand lead scoring and qualification",
                "Q&A with our product experts",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: "rgba(37,211,102,0.1)" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "var(--wa)" }} />
                  </div>
                  <span style={{ color: "var(--text-dim)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-6 rounded-2xl" style={{ borderColor: "rgba(0,229,255,0.2)" }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
              <div>
                <div className="font-semibold">Join 500+ businesses</div>
                <div className="text-sm" style={{ color: "var(--text-dim)" }}>
                  already using X.Solum
                </div>
              </div>
            </div>
            <p className="text-sm italic" style={{ color: "var(--text-dim)" }}>
              "X.Solum helped us 3x our lead conversion rate. The AI qualification is incredible."
            </p>
            <div className="mt-3 text-sm font-medium" style={{ color: "var(--wa)" }}>
              — Priya S., Sales Director
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
