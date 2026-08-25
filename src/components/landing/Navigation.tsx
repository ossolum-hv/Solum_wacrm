"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#journey", label: "Product" },
  { href: "#brain", label: "AI" },
  { href: "#flow", label: "Automation" },
  { href: "#usecases", label: "Use Cases" },
  { href: "#analytics", label: "Resources" },
  { href: "#pricing", label: "Pricing" },
];

export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 50);

      // Determine active section based on scroll position
      const sections = ["hero", "journey", "brain", "flow", "usecases", "analytics", "security", "pricing"];
      const currentSection = sections.find((section) => {
        const element = document.getElementById(section);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top <= 100 && rect.bottom >= 100;
      });
      if (currentSection) setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const id = href.slice(1);
      const element = document.getElementById(id);
      if (element) {
        const navHeight = scrolled ? 72 : 88;
        const top = element.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  return (
    <nav
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg" : "bg-transparent"
      }`}
      style={{ backgroundColor: scrolled ? "rgba(12, 12, 30, 0.7)" : "transparent" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" aria-label="X.Solum Home">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#7B2CBF] flex items-center justify-center transform group-hover:rotate-180 transition-transform duration-500">
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            X.Solum
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-8 text-sm text-[var(--text-dim)]" role="navigation" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(link.href, e)}
              className={`hover:text-white transition-colors relative py-1 ${
                activeSection === link.href.replace("#", "") ? "text-white" : ""
              }`}
            >
              {link.label}
              {activeSection === link.href.replace("#", "") && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full" />
              )}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-sm text-[var(--text-dim)] hover:text-white h-9 px-4">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="btn-primary px-5 py-2.5 rounded-lg text-sm h-9" style={{ background: "linear-gradient(90deg, #00E5FF 0%, #25D366 100%)" }}>
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}