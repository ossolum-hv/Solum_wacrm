"use client";

import { useEffect, useRef, Suspense, useState } from "react";
import Link from "next/link";
import { getStaggerDelay } from "@/lib/animations";
import {
  Zap,
  ArrowRight,
  Calendar,
  Brain,
  Shield,
  UserPlus,
  Users,
  Filter,
  RotateCcw,
  Handshake,
  Star,
  Building2,
  GraduationCap,
  HeartPulse,
  Car,
  Presentation,
  ShoppingBag,
  Check,
  ShieldCheck,
  Key,
  History,
  Cpu,
  Database,
  XCircle,
  CreditCard,
  Megaphone,
  Crown,
  Clock,
  Bot,
  Workflow,
  MessageCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Three.js Background                                                */
/* ------------------------------------------------------------------ */

function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let animationId: number;

    const init = async () => {
      const THREE = await import("three");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Particles
      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 2000;
      const posArray = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 30;
      }
      particleGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(posArray, 3)
      );

      const particleMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      // Lines
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.1,
      });
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions: number[] = [];
      for (let i = 0; i < 50; i++) {
        const x1 = (Math.random() - 0.5) * 20;
        const y1 = (Math.random() - 0.5) * 20;
        const z1 = (Math.random() - 0.5) * 20;
        const x2 = (Math.random() - 0.5) * 20;
        const y2 = (Math.random() - 0.5) * 20;
        const z2 = (Math.random() - 0.5) * 20;
        linePositions.push(x1, y1, z1, x2, y2, z2);
      }
      lineGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(linePositions, 3)
      );
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lines);

      camera.position.z = 5;

      let mouseX = 0,
        mouseY = 0;
      document.addEventListener("mousemove", (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
      });

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        particles.rotation.x += 0.0005;
        particles.rotation.y += 0.0005;
        lines.rotation.x += 0.0002;
        lines.rotation.y += 0.0002;
        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += (-mouseY - camera.position.y) * 0.05;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    init();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="bg-canvas"
      className="fixed inset-0 -z-10 opacity-60"
      style={{ background: "#030014" }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Scroll Reveal Hook                                                */
/* ------------------------------------------------------------------ */

function useScrollReveal(threshold = 0.1) {
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [threshold]);
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                        */
/* ------------------------------------------------------------------ */

function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      id="navbar"
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "lp-glass shadow-lg" : ""
      }`}
      style={{
        backgroundColor: scrolled ? "var(--lp-glass-bg)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : undefined,
        WebkitBackdropFilter: scrolled ? "blur(20px)" : undefined,
        borderBottom: scrolled ? "1px solid var(--lp-border)" : undefined,
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#7B2CBF] flex items-center justify-center transform group-hover:rotate-180 transition-transform duration-500">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            X.Solum
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-8 text-sm" style={{ color: "var(--lp-text-dim)" }}>
          <a href="#journey" className="hover:text-white transition-colors">Product</a>
          <a href="#brain" className="hover:text-white transition-colors">AI</a>
          <a href="#flow" className="hover:text-white transition-colors">Automation</a>
          <a href="#usecases" className="hover:text-white transition-colors">Use Cases</a>
          <a href="#analytics" className="hover:text-white transition-colors">Resources</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/book-demo" className="px-4 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/5 transition-colors">
            Book Demo
          </Link>
          <Link href="/login" className="lp-btn-primary px-5 py-2.5 rounded-lg text-sm">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat Demo Animation                                               */
/* ------------------------------------------------------------------ */

function ChatDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  const chatScript = [
    { text: "Is this available in Mumbai?", sender: "lead" as const },
    { text: "Yes. We currently have availability in Mumbai. Are you looking for this for personal use or investment?", sender: "ai" as const },
    { text: "Investment.", sender: "lead" as const },
    { text: "Got it. What's your approximate investment range?", sender: "ai" as const },
    { text: "₹2–3 Cr.", sender: "lead" as const },
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runChatDemo(container);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    function runChatDemo(el: HTMLDivElement) {
      el.innerHTML = "";
      let delay = 0;
      chatScript.forEach((msg, index) => {
        setTimeout(() => {
          const bubble = document.createElement("div");
          bubble.className = `chat-bubble-enter p-3 rounded-xl text-sm w-fit max-w-[80%] ${
            msg.sender === "lead"
              ? "bg-white/5 rounded-tl-none"
              : "bg-[var(--wa)]/20 rounded-tr-none ml-auto"
          }`;
          bubble.textContent = msg.text;
          el.appendChild(bubble);
          el.scrollTop = el.scrollHeight;
        }, delay);
        delay += 1200;
      });
    }

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Chat bubbles injected by effect */}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Counter                                                     */
/* ------------------------------------------------------------------ */

function StatsCounter() {
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const statNumbers = document.querySelectorAll(".stat-number");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = parseInt(entry.target.getAttribute("data-target") || "0");
            let current = 0;
            const increment = target / 50;
            const interval = setInterval(() => {
              current += increment;
              if (current >= target) {
                entry.target.textContent = target.toLocaleString();
                clearInterval(interval);
              } else {
                entry.target.textContent = Math.floor(current).toLocaleString();
              }
            }, 30);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statNumbers.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return <div ref={statsRef} />;
}

/* ------------------------------------------------------------------ */
/*  Lead Score Animation                                              */
/* ------------------------------------------------------------------ */

function LeadScorePanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const attributesRef = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const bar = barRef.current;
    const number = numberRef.current;
    const attributes = attributesRef.current;
    if (!container || !bar || !number || !attributes) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggered.current) {
            triggered.current = true;
            let score = 0;
            const target = 82;
            const interval = setInterval(() => {
              if (score < target) {
                score++;
                number.textContent = score.toString();
                bar.style.width = `${score}%`;
              } else {
                clearInterval(interval);
                attributes.classList.remove("opacity-0");
              }
            }, 20);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div ref={barRef} className="h-full rounded-full transition-all duration-1000" style={{ background: "linear-gradient(90deg, var(--accent), var(--wa))", width: "0%" }} />
        </div>
        <div ref={numberRef} className="stat-number font-bold text-2xl" style={{ color: "var(--wa)" }}>0</div>
      </div>
      <div ref={attributesRef} className="grid grid-cols-2 gap-2 mt-4 text-xs opacity-0 transition-opacity duration-500">
        <div className="flex justify-between p-2 rounded" style={{ background: "rgba(255,255,255,0.05)" }}><span style={{ color: "var(--text-dim)" }}>Intent</span><span style={{ color: "var(--wa)" }}>HIGH</span></div>
        <div className="flex justify-between p-2 rounded" style={{ background: "rgba(255,255,255,0.05)" }}><span style={{ color: "var(--text-dim)" }}>Budget</span><span>₹2-3 Cr</span></div>
        <div className="flex justify-between p-2 rounded" style={{ background: "rgba(255,255,255,0.05)" }}><span style={{ color: "var(--text-dim)" }}>Purpose</span><span>Investment</span></div>
        <div className="flex justify-between p-2 rounded" style={{ background: "rgba(255,255,255,0.05)" }}><span style={{ color: "var(--text-dim)" }}>Location</span><span>Mumbai</span></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pulse Dot Component                                               */
/* ------------------------------------------------------------------ */

function PulseDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${className}`}
      style={{
        background: "var(--wa)",
        boxShadow: "0 0 0 0 rgba(37, 211, 102, 0.7)",
        animation: "pulse 2s infinite",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  useScrollReveal(0.1);

  return (
    <div className="relative min-h-screen lp-root" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <ThreeBackground />

      {/* Navigation */}
      <Suspense fallback={<nav className="fixed top-0 w-full z-50 h-[72px]" />}>
        <Navigation />
      </Suspense>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: "50px 50px"
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#00E5FF] opacity-10 blur-[150px] rounded-full" />

        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs mb-8" style={{ color: "var(--text-dim)" }}>
              <PulseDot />
              AI-Powered WhatsApp Sales CRM
            </div>

            <h1 className="font-bold text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tighter mb-6 text-gradient">
              Turn Every Conversation Into a Customer.
            </h1>

            <p className="text-lg max-w-xl mb-10 leading-relaxed" style={{ color: "var(--text-dim)" }}>
              Capture leads from Instagram and Facebook. Move them to WhatsApp. Let AI engage, qualify and nurture them. Your sales team steps in when it matters.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="#journey" className="btn-primary px-7 py-3.5 rounded-lg text-sm flex items-center gap-2">
                See How It Works <ArrowRight className="w-3 h-3" />
              </Link>
              <button className="btn-secondary px-7 py-3.5 rounded-lg text-sm">Explore the Platform</button>
            </div>

            <div className="mt-16 flex items-center gap-8 text-xs" style={{ color: "var(--text-dim)" }}>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--wa)" }}>WhatsApp</span> Native
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" style={{ color: "var(--accent)" }} /> GPT-4 / Claude Ready
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" /> Enterprise Secure
              </div>
            </div>
          </div>

          {/* Right: 3D Floating UI Ecosystem */}
          <div className="relative h-[600px] hidden lg:block">
            {/* Floating Instagram Node */}
            <div className="absolute top-10 right-10 glass-card glow-ig p-4 rounded-2xl w-64 float-3d" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: "var(--ig)" }}>Instagram</span>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>Instagram Comment</span>
              </div>
              <p className="text-sm">"Interested. What's the price?"</p>
            </div>

            {/* Lead Detected */}
            <div className="absolute top-40 left-0 glass-card p-4 rounded-2xl w-56 float-3d" style={{ animationDelay: "1s" }}>
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-3 h-3" style={{ color: "var(--accent)" }} />
                <span className="text-xs font-semibold">LEAD CAPTURED</span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>Rahul Sharma detected</p>
            </div>

            {/* AI Core */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full ai-core flex items-center justify-center" style={{ background: "#030014", border: "1px solid rgba(0,229,255,0.3)" }}>
              <div className="text-center">
                <Brain className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--accent)" }} />
                <div className="text-xs font-bold tracking-widest" style={{ color: "var(--accent)" }}>AI PROCESSING</div>
                <div className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>Understanding Intent...</div>
              </div>
            </div>

            {/* WhatsApp Conversation */}
            <div className="absolute bottom-20 right-0 glass-card glow-wa p-4 rounded-2xl w-72 float-3d" style={{ animationDelay: "2s" }}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: "var(--wa)", fontSize: "1.25rem" }}>WhatsApp</span>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>WhatsApp Connected</span>
              </div>
              <div className="space-y-2">
                <div className="text-xs p-2 rounded-lg rounded-tl-none w-fit" style={{ background: "rgba(37,211,102,0.1)" }}>
                  "Great. Are you purchasing for yourself or your business?"
                </div>
                <div className="text-xs p-2 rounded-lg rounded-tr-none w-fit ml-auto" style={{ background: "rgba(255,255,255,0.05)" }}>
                  "The premium one."
                </div>
              </div>
            </div>

            {/* High Intent */}
            <div className="absolute bottom-0 left-10 glass-card p-3 rounded-xl float-3d border-l-2" style={{ animationDelay: "1.5s", borderColor: "var(--wa)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--wa)" }}>HIGH INTENT</div>
                  <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>Sales Rep Notified</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-10 border-y overflow-hidden" style={{ borderColor: "var(--border)", background: "rgba(3,0,20,0.5)", backdropFilter: "blur(10px)" }}>
        <div className="flex marquee-track">
          <div className="flex items-center gap-16 px-8 shrink-0 opacity-50" style={{ color: "var(--text-dim)" }}>
            <span className="text-lg font-medium">Powered by</span>
            <span className="text-xl font-bold">OpenAI</span>
            <span className="text-xl font-bold">Anthropic</span>
            <span className="text-xl font-bold">WhatsApp Cloud API</span>
            <span className="text-xl font-bold">GPT-4 Turbo</span>
            <span className="text-xl font-bold">Claude 3.5</span>
          </div>
          <div className="flex items-center gap-16 px-8 shrink-0 opacity-50" style={{ color: "var(--text-dim)" }}>
            <span className="text-lg font-medium">Powered by</span>
            <span className="text-xl font-bold">OpenAI</span>
            <span className="text-xl font-bold">Anthropic</span>
            <span className="text-xl font-bold">WhatsApp Cloud API</span>
            <span className="text-xl font-bold">GPT-4 Turbo</span>
            <span className="text-xl font-bold">Claude 3.5</span>
          </div>
        </div>
      </section>

      {/* Interactive Product Journey */}
      <section id="journey" className="relative py-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-20 reveal">
            <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>THE PIPELINE</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 text-gradient">From Comment to Customer.</h2>
            <p className="mt-4 max-w-2xl mx-auto" style={{ color: "var(--text-dim)" }}>Watch how unstructured social engagement transforms into qualified sales pipelines in real-time.</p>
          </div>

          {/* Stage 1 & 2 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32 reveal">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 text-xs mb-2" style={{ color: "var(--ig)" }}>
                <span>Instagram</span> STAGE 01 / SOCIAL MEDIA
              </div>
              <h3 className="text-3xl font-bold mb-4">Every interaction is a potential lead.</h3>
              <p className="mb-6" style={{ color: "var(--text-dim)" }}>The platform continuously monitors Facebook and Instagram comments and DMs. When someone asks "Price?", "Details?", or "How much?", buying intent is instantly detected.</p>

              <div className="space-y-3 mt-6">
                <div className="glass-card p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--ig)" }}>Instagram</span>
                    <span className="text-sm">"Is this available in Mumbai?"</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--wa)" }}>Captured</span>
                </div>
                <div className="glass-card p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--fb)" }}>Facebook</span>
                    <span className="text-sm">"Send details please"</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--wa)" }}>Captured</span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative h-[400px] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--ig)]/10 to-transparent blur-3xl" />
              <div className="glass-card p-6 rounded-2xl w-80 float-3d relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--ig)] to-[var(--fb)]" />
                    <div>
                      <div className="font-semibold text-sm">Rahul Sharma</div>
                      <div className="text-xs" style={{ color: "var(--text-dim)" }}>Instagram</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(0,229,255,0.2)", color: "var(--accent)" }}>NEW</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2"><span style={{ color: "var(--text-dim)" }}>Interest</span><span>Premium Package</span></div>
                  <div className="flex justify-between border-b border-white/5 pb-2"><span style={{ color: "var(--text-dim)" }}>Intent</span><span style={{ color: "var(--wa)" }}>High</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Status</span><span>Lead Captured</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Stage 3: WhatsApp */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32 reveal">
            <div className="relative h-[450px] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-l from-[var(--wa)]/10 to-transparent blur-3xl" />
              <div className="glass-card w-[340px] rounded-2xl overflow-hidden relative z-10 glow-wa">
                <div className="p-4 flex items-center gap-3 border-b border-white/5" style={{ background: "rgba(37,211,102,0.1)" }}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--ig)] to-[var(--fb)]" />
                  <div>
                    <div className="font-semibold text-sm">Rahul Sharma</div>
                    <div className="text-xs flex items-center gap-1" style={{ color: "var(--wa)" }}>
                      <PulseDot className="w-1.5 h-1.5" /> Online
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3 h-64 overflow-hidden">
                  <div className="p-3 rounded-xl rounded-tl-none text-sm w-fit max-w-[80%]" style={{ background: "rgba(255,255,255,0.05)" }}>Hi, what's the price?</div>
                  <div className="p-3 rounded-xl rounded-tr-none text-sm w-fit max-w-[80%] ml-auto" style={{ background: "rgba(37,211,102,0.2)" }}>Absolutely. Which package are you interested in?</div>
                  <div className="p-3 rounded-xl rounded-tl-none text-sm w-fit max-w-[80%]" style={{ background: "rgba(255,255,255,0.05)" }}>The premium one.</div>
                  <div className="p-3 rounded-xl rounded-tr-none text-sm w-fit max-w-[80%] ml-auto" style={{ background: "rgba(37,211,102,0.2)" }}>Great. Are you purchasing for yourself or your business?</div>
                </div>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 text-xs mb-2" style={{ color: "var(--wa)" }}>
                <span>WhatsApp</span> STAGE 02 / WHATSAPP
              </div>
              <h3 className="text-3xl font-bold mb-4">The conversation starts instantly.</h3>
              <p className="mb-6" style={{ color: "var(--text-dim)" }}>No waiting. No manual follow-ups. The moment a lead is detected, WhatsApp opens a conversational thread that feels human, responsive, and immediate.</p>

              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(37,211,102,0.2)" }}>
                    <Zap className="w-3 h-3" style={{ color: "var(--wa)" }} />
                  </div>
                  <div className="text-sm font-semibold">Response Time: 0.4s</div>
                </div>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>AI handles the initial dialogue, asking qualifying questions naturally without rigid scripts.</p>
              </div>
            </div>
          </div>

          {/* Stage 4: AI Brain */}
          <div id="brain" className="relative py-32 my-20 reveal">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-10 blur-[120px] rounded-full" style={{ background: "var(--accent)" }} />
            <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 text-xs mb-2" style={{ color: "var(--accent)" }}>
                  <Brain className="w-3 h-3" /> STAGE 03 / AI BRAIN
                </div>
                <h3 className="text-4xl font-bold mb-4">AI doesn't just reply. It understands.</h3>
                <p className="mb-8" style={{ color: "var(--text-dim)" }}>Beneath the conversation, the AI engine is structuring the chaos of human dialogue into actionable CRM data.</p>

                <div className="grid grid-cols-2 gap-4">
                  {["Understand", "Classify", "Qualify", "Predict"].map((cap) => (
                    <div key={cap} className="glass-card p-4 rounded-xl">
                      <div className="text-xs mb-1" style={{ color: "var(--accent)" }}>CAPABILITY</div>
                      <div className="font-bold text-lg">{cap}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative flex items-center justify-center h-[400px]">
                <div className="absolute w-64 h-64 rounded-full border animate-spin" style={{ borderColor: "rgba(0,229,255,0.2)", animationDuration: "20s" }} />
                <div className="absolute w-48 h-48 rounded-full border animate-spin" style={{ borderColor: "rgba(0,229,255,0.4)", animationDuration: "15s", animationDirection: "reverse" }} />
                <div className="absolute w-32 h-32 rounded-full border animate-spin" style={{ borderColor: "rgba(0,229,255,0.6)", animationDuration: "10s" }} />
                <div className="w-24 h-24 rounded-full ai-core flex items-center justify-center" style={{ background: "var(--bg)", border: "1px solid var(--accent)" }}>
                  <Cpu className="w-8 h-8" style={{ color: "var(--accent)" }} />
                </div>

                <div className="absolute top-0 left-1/4 glass-card p-2 rounded text-xs float-3d" style={{ color: "var(--text-dim)" }}>Intent: High</div>
                <div className="absolute top-1/4 right-0 glass-card p-2 rounded text-xs float-3d" style={{ animationDelay: "1s", color: "var(--text-dim)" }}>Budget: ₹2Cr</div>
                <div className="absolute bottom-1/4 left-0 glass-card p-2 rounded text-xs float-3d" style={{ animationDelay: "2s", color: "var(--text-dim)" }}>Timeline: 30d</div>
                <div className="absolute bottom-0 right-1/4 glass-card p-2 rounded text-xs float-3d" style={{ animationDelay: "1.5s", color: "var(--text-dim)" }}>Location: Mumbai</div>
              </div>
            </div>
          </div>

          {/* Stage 5 & 6: Human Handoff */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mt-32 reveal">
            <div className="order-2 lg:order-1 relative h-[450px] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/10 to-transparent blur-3xl" />
              <div className="glass-card p-6 rounded-2xl w-80 border-l-4 glow-wa relative z-10 float-3d" style={{ borderColor: "var(--wa)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <span className="font-bold text-sm" style={{ color: "var(--wa)" }}>HIGH INTENT LEAD</span>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: "var(--wa)" }}>87</span>
                </div>
                <div className="text-sm font-semibold mb-3">Rahul Sharma</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Budget</span><span>₹2Cr+</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Requirement</span><span>3 BHK</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Timeline</span><span>30 Days</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Intent Score</span><span>87/100</span></div>
                </div>
                <button className="w-full mt-4 py-2 text-xs rounded-lg font-semibold" style={{ background: "rgba(37,211,102,0.2)", color: "var(--wa)" }}>Assign to Sales Rep</button>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-xs mb-2" style={{ color: "var(--wa)" }}>
                <Handshake className="w-3 h-3" /> STAGE 04 / HUMAN HANDOFF
              </div>
              <h3 className="text-3xl font-bold mb-4">AI knows when to step aside.</h3>
              <p className="mb-6" style={{ color: "var(--text-dim)" }}>When purchase intent crosses the threshold, the lead is instantly routed to the right salesperson with full conversational context attached.</p>

              <div className="glass-card p-4 rounded-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Salesperson Notified</div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>AI recommends immediate sales intervention.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-20 reveal">
            <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>CAPABILITIES</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 text-gradient">Explore the Intelligence.</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <MessageCircle className="w-6 h-6" />, color: "var(--ig)", title: "Social Lead Capture", desc: "Turn comments into conversations. Automatically capture relevant leads from Facebook and Instagram." },
              { icon: <MessageCircle className="w-6 h-6" />, color: "var(--wa)", title: "WhatsApp CRM", desc: "Every conversation. One intelligent workspace. Centralize contacts, status, and sales activity." },
              { icon: <Bot className="w-6 h-6" />, color: "var(--accent)", title: "AI Sales Agent", desc: "Let AI have the first conversation. Understands context rather than following rigid scripts." },
              { icon: <Workflow className="w-6 h-6" />, color: "#A855F7", title: "Flow Builder", desc: "Build your sales logic visually. Drag-and-drop triggers, conditions, delays, and AI steps." },
              { icon: <Filter className="w-6 h-6" />, color: "#F97316", title: "AI Lead Qualification", desc: "Know who's serious. AI extracts budget, intent, requirement, location, and buying signals." },
              { icon: <History className="w-6 h-6" />, color: "#3B82F6", title: "Smart Follow-Up", desc: "Never let a warm lead go cold. Automated follow-ups based on behavior and lead score." },
            ].map((f, i) => (
              <div key={i} className="glass-card p-8 rounded-2xl reveal group cursor-pointer transform transition-all hover:scale-[1.02]">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform" style={{ background: `${f.color}20` }}>
                  <span style={{ color: f.color }}>{f.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-6">
            {[
              { icon: <Handshake className="w-5 h-5" />, color: "#22C55E", title: "Human Handoff", desc: "Route high-intent leads instantly." },
              { icon: <Star className="w-5 h-5" />, color: "#EAB308", title: "Lead Scoring", desc: "Prioritize prospects likely to buy." },
              { icon: <Brain className="w-5 h-5" />, color: "#EF4444", title: "Knowledge Brain", desc: "Upload FAQs, docs, and scripts." },
            ].map((f, i) => (
              <div key={i} className="glass-card p-6 rounded-xl flex items-center gap-4 reveal">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${f.color}20` }}>
                  <span style={{ color: f.color }}>{f.icon}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{f.title}</h4>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live AI Demonstration */}
      <section className="relative py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-16 reveal">
            <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>LIVE DEMONSTRATION</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 text-gradient">Watch AI Close the Gap<br />Between Interest and Intent.</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="glass-card p-6 rounded-2xl reveal">
              <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-4">
                <span style={{ color: "var(--ig)", fontSize: "1.5rem" }}>Instagram</span>
                <div>
                  <div className="text-sm font-semibold">x.solum_realestate</div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>Instagram Post</div>
                </div>
              </div>
              <div className="aspect-video rounded-lg mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgba(225,48,108,0.2), rgba(24,119,242,0.2))` }}>
                <span className="text-4xl opacity-10">Image</span>
              </div>
              <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-dim)" }}>
                <span style={{ color: "var(--ig)" }}>♥</span> 1,204 Likes
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold">priya_singh</div>
                    <div className="text-sm">"Is this available in Mumbai?"</div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(0,229,255,0.1)", color: "var(--accent)" }}>CAPTURED</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl reveal glow-wa">
              <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-4">
                <span style={{ color: "var(--wa)", fontSize: "1.5rem" }}>WhatsApp</span>
                <div>
                  <div className="text-sm font-semibold">Priya Singh</div>
                  <div className="text-xs flex items-center gap-1" style={{ color: "var(--wa)" }}>
                    <PulseDot className="w-1.5 h-1.5" /> AI Active
                  </div>
                </div>
              </div>

              <div className="space-y-3 h-64 overflow-hidden">
                <ChatDemo />
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>DYNAMIC LEAD SCORE</div>
                <LeadScorePanel />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flow Builder Section */}
      <section id="flow" className="relative py-32 overflow-hidden" style={{ background: "var(--bg-2)" }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-5 blur-[120px] rounded-full" style={{ background: "var(--accent)" }} />

        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative z-10">
          <div className="text-center mb-20 reveal">
            <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>AUTOMATION ENGINE</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 text-gradient">Build Once. Automate Every Conversation.</h2>
            <p className="mt-4 max-w-2xl mx-auto" style={{ color: "var(--text-dim)" }}>A visual canvas to design your entire sales logic without code.</p>
          </div>

          <div className="relative glass p-10 rounded-3xl reveal">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-y-8 gap-x-4 items-center relative">
              <div className="flow-node glass-card p-4 rounded-xl text-center transform hover:scale-105 transition-transform" style={{ borderColor: "rgba(225,48,108,0.3)" }}>
                <div className="text-xs mb-2" style={{ color: "var(--ig)" }}>TRIGGER</div>
                <MessageCircle className="w-5 h-5 mx-auto mb-2 block" style={{ color: "var(--ig)" }} />
                <div className="text-sm font-semibold">Instagram Comment</div>
              </div>

              <div className="hidden md:block text-center" style={{ color: "var(--text-dim)" }}>
                <div className="w-full h-px relative" style={{ background: "linear-gradient(90deg, var(--ig), var(--accent))" }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-y-4 border-y-transparent" style={{ borderLeftColor: "var(--accent)" }} />
                </div>
              </div>

              <div className="flow-node glass-card p-4 rounded-xl text-center transform hover:scale-105 transition-transform">
                <div className="text-xs mb-2" style={{ color: "var(--accent)" }}>ACTION</div>
                <UserPlus className="w-5 h-5 mx-auto mb-2 block" style={{ color: "var(--accent)" }} />
                <div className="text-sm font-semibold">Create Lead</div>
              </div>

              <div className="hidden md:block text-center" style={{ color: "var(--text-dim)" }}>
                <div className="w-full h-px relative" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent))" }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-y-4 border-y-transparent" style={{ borderLeftColor: "var(--accent)" }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-y-8 gap-x-4 items-center mt-8">
              <div className="flow-node glass-card p-4 rounded-xl text-center transform hover:scale-105 transition-transform" style={{ borderColor: "rgba(37,211,102,0.3)" }}>
                <div className="text-xs mb-2" style={{ color: "var(--wa)" }}>ACTION</div>
                <MessageCircle className="w-5 h-5 mx-auto mb-2 block" style={{ color: "var(--wa)" }} />
                <div className="text-sm font-semibold">Start WhatsApp</div>
              </div>

              <div className="hidden md:block text-center" style={{ color: "var(--text-dim)" }}>
                <div className="w-full h-px relative" style={{ background: "linear-gradient(90deg, var(--wa), var(--accent))" }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-y-4 border-y-transparent" style={{ borderLeftColor: "var(--accent)" }} />
                </div>
              </div>

              <div className="flow-node glass-card p-4 rounded-xl text-center transform hover:scale-105 transition-transform">
                <div className="text-xs mb-2" style={{ color: "#A855F7" }}>AI</div>
                <Brain className="w-5 h-5 mx-auto mb-2 block" style={{ color: "#A855F7" }} />
                <div className="text-sm font-semibold">Analyze Intent</div>
              </div>

              <div className="hidden md:block text-center" style={{ color: "var(--text-dim)" }}>
                <div className="w-full h-px relative" style={{ background: "linear-gradient(90deg, #A855F7, var(--accent))" }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-y-4 border-y-transparent" style={{ borderLeftColor: "var(--accent)" }} />
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <div className="flow-node glass-card p-4 rounded-xl text-center transform hover:scale-105 transition-transform w-full md:w-1/3" style={{ borderColor: "rgba(234,179,8,0.3)" }}>
                <div className="text-xs mb-2" style={{ color: "#EAB308" }}>CONDITION</div>
                <Workflow className="w-5 h-5 mx-auto mb-2 block" />
                <div className="text-sm font-semibold">Lead Score &gt; 70?</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="glass-card p-6 rounded-xl text-center glow-wa" style={{ borderLeft: "4px solid var(--wa)" }}>
                <div className="text-xs mb-2" style={{ color: "var(--wa)" }}>PATH: YES</div>
                <div className="text-lg font-bold">Route to Sales Rep</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>Immediate notification sent</div>
              </div>
              <div className="glass-card p-6 rounded-xl text-center" style={{ borderLeft: "4px solid var(--text-dim)" }}>
                <div className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>PATH: NO</div>
                <div className="text-lg font-bold">Add to Nurture Sequence</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>Follow-up automation activated</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Model Integration */}
      <section className="relative py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-20 reveal">
            <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>MODEL AGNOSTIC</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 text-gradient">Bring Your Own Intelligence.</h2>
            <p className="mt-4 max-w-2xl mx-auto" style={{ color: "var(--text-dim)" }}>Connect any AI model to your sales infrastructure. The platform adapts to your business logic.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
            {[
              { icon: <Cpu className="w-8 h-8" />, title: "ChatGPT", desc: "GPT-4 / 3.5" },
              { icon: <span className="text-xl font-bold">C</span>, title: "Anthropic", desc: "Claude 3.5" },
              { icon: <Brain className="w-8 h-8" style={{ color: "#A855F7" }} />, title: "Custom LLM", desc: "Open Source" },
              { icon: <Zap className="w-8 h-8" style={{ color: "#3B82F6" }} />, title: "API Integrations", desc: "Any Webhook" },
            ].map((m, i) => (
              <div key={i} className="glass-card p-6 rounded-xl text-center reveal">
                <div className="mb-2">{m.icon}</div>
                <div className="font-semibold text-sm">{m.title}</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>{m.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 items-center reveal">
            <div className="space-y-4">
              {[
                { icon: <Database className="w-5 h-5" style={{ color: "var(--accent)" }} />, text: "Business Knowledge" },
                { icon: <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />, text: "Sales Rules" },
                { icon: <Cpu className="w-5 h-5" style={{ color: "var(--accent)" }} />, text: "CRM Data" },
              ].map((item, i) => (
                <div key={i} className="glass-card p-4 rounded-xl flex items-center gap-3">
                  {item.icon}
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border animate-ping opacity-20" style={{ borderColor: "var(--accent)" }} />
                <div className="w-32 h-32 rounded-full ai-core flex items-center justify-center" style={{ background: "var(--bg)", border: "1px solid var(--accent)" }}>
                  <div className="text-center">
                    <Cpu className="w-8 h-8 mx-auto" style={{ color: "var(--accent)" }} />
                    <div className="text-xs mt-2 font-bold">AI SALES ENGINE</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { icon: <MessageCircle className="w-5 h-5" style={{ color: "var(--wa)" }} />, text: "WhatsApp" },
                { icon: <MessageCircle className="w-5 h-5" style={{ color: "var(--ig)" }} />, text: "Instagram" },
                { icon: <Users className="w-5 h-5" style={{ color: "#3B82F6" }} />, text: "Sales Team" },
              ].map((item, i) => (
                <div key={i} className="glass-card p-4 rounded-xl flex items-center gap-3 justify-end">
                  <span className="text-sm">{item.text}</span>
                  {item.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="usecases" className="relative py-32" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-20 reveal">
            <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>INDUSTRIES</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 text-gradient">Built for High-Intent Sales.</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Building2 className="w-6 h-6" />, label: "Real Estate", title: "From property enquiry to site visit.", stat: "3x Higher Conversion Rate" },
              { icon: <GraduationCap className="w-6 h-6" />, label: "Education", title: "Turn course enquiries into enrollments.", stat: "60% Faster Response" },
              { icon: <HeartPulse className="w-6 h-6" />, label: "Healthcare", title: "Turn enquiries into booked appointments.", stat: "Zero Missed Leads" },
              { icon: <Car className="w-6 h-6" />, label: "Automotive", title: "Turn vehicle interest into test drives.", stat: "45% Test Drive Rate" },
              { icon: <Presentation className="w-6 h-6" />, label: "Coaching", title: "Turn Instagram engagement into qualified calls.", stat: "5x ROI on Ad Spend" },
              { icon: <ShoppingBag className="w-6 h-6" />, label: "D2C", title: "Turn product questions into purchases.", stat: "30% Cart Recovery" },
            ].map((u, i) => (
              <div key={i} className="glass-card p-8 rounded-2xl reveal group cursor-pointer">
                <div className="flex items-center justify-between mb-6">
                  <span style={{ color: "var(--accent)" }}>{u.icon}</span>
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>{u.label}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{u.title}</h3>
                <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--wa)" }}>
                  <PulseDot className="w-1.5 h-1.5" /> {u.stat}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section id="analytics" className="relative py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-20 reveal">
            <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>PERFORMANCE</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 text-gradient">Intelligence You Can Measure.</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
            {[
              { target: 12482, label: "Leads Captured" },
              { target: 8921, label: "Conversations" },
              { target: 3214, label: "Qualified Leads" },
              { target: 842, label: "Hot Leads", wa: true },
              { target: 421, label: "Appointments" },
              { target: 126, label: "Conversions", wa: true },
            ].map((s, i) => (
              <div key={i} className="glass-card p-6 rounded-xl text-center reveal">
                <div className="stat-number text-3xl font-bold text-gradient" data-target={s.target}>0</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <StatsCounter />

          <div className="grid lg:grid-cols-2 gap-6 reveal">
            <div className="glass-card p-8 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold">Lead Velocity</h3>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>Last 30 days</p>
                </div>
                <div className="text-sm" style={{ color: "var(--wa)" }}>▲ 32.5%</div>
              </div>
              <div className="h-48 flex items-end gap-2">
                {[40, 60, 50, 80, 70, 90, 100].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `linear-gradient(to top, rgba(0,229,255,0.2), rgba(0,229,255,0.8))` }} />
                ))}
              </div>
            </div>

            <div className="glass-card p-8 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold">AI vs Human Handling</h3>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>Total conversations</p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>AI Handled</span>
                    <span style={{ color: "var(--accent)" }}>78%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: "78%", background: "var(--accent)" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>Human Handled</span>
                    <span style={{ color: "var(--wa)" }}>22%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: "22%", background: "var(--wa)" }} />
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5">
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>Average Response Time</div>
                <div className="text-2xl font-bold mt-1">0.4s <span className="text-sm font-normal" style={{ color: "var(--text-dim)" }}>vs 4.2h (Human)</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="relative py-32" style={{ background: "var(--bg-2)" }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-20 reveal">
            <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>THE TRANSFORMATION</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 text-gradient">The Old Way vs The X.Solum Way.</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="glass-card p-8 rounded-2xl reveal opacity-60">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <XCircle className="w-5 h-5" style={{ color: "#EF4444" }} />
                </div>
                <h3 className="text-xl font-bold">Before X.Solum</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Manual Instagram replies",
                  "Missed enquiries after hours",
                  "Messy Excel sheets",
                  "Slow follow-ups",
                  "Unqualified leads wasting time",
                  "Salesperson overload",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-dim)" }}>
                    <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(239,68,68,0.5)" }} /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card p-8 rounded-2xl reveal glow-wa" style={{ borderLeft: "4px solid var(--wa)" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(37,211,102,0.1)" }}>
                  <Check className="w-5 h-5" style={{ color: "var(--wa)" }} />
                </div>
                <h3 className="text-xl font-bold">With X.Solum AI</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Automatic social capture",
                  "24/7 Instant WhatsApp engagement",
                  "AI qualification in real-time",
                  "Smart automated follow-ups",
                  "Lead scoring prioritization",
                  "Sales-ready prospects only",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: "var(--wa)" }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="relative py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <span className="text-xs tracking-widest font-semibold" style={{ color: "var(--accent)" }}>CONTROL & GOVERNANCE</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 text-gradient">AI works for your business. You remain in control.</h2>
              <p className="mt-6 mb-8" style={{ color: "var(--text-dim)" }}>Configure guardrails, approve critical actions, and maintain complete visibility over every conversation.</p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />, title: "AI Guardrails", desc: "Strict boundary rules" },
                  { icon: <ShieldCheck className="w-5 h-5" style={{ color: "var(--accent)" }} />, title: "Human Approval", desc: "For high-value actions" },
                  { icon: <Key className="w-5 h-5" style={{ color: "var(--accent)" }} />, title: "Role-Based Access", desc: "Team hierarchy control" },
                  { icon: <History className="w-5 h-5" style={{ color: "var(--accent)" }} />, title: "Audit Logs", desc: "Full conversation history" },
                ].map((item, i) => (
                  <div key={i} className="glass-card p-4 rounded-xl">
                    <div className="mb-2">{item.icon}</div>
                    <div className="font-semibold text-sm">{item.title}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative h-[500px] flex items-center justify-center reveal">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent blur-3xl" />
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 rounded-full border animate-spin" style={{ borderColor: "rgba(0,229,255,0.2)", animationDuration: "20s" }} />
                <div className="absolute inset-4 rounded-full border animate-spin" style={{ borderColor: "rgba(0,229,255,0.4)", animationDuration: "15s", animationDirection: "reverse" }} />
                <div className="absolute inset-8 rounded-full flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full ai-core flex items-center justify-center" style={{ background: "var(--bg)", border: "1px solid rgba(0,229,255,0.4)" }}>
                    <Shield className="w-10 h-10" style={{ color: "var(--accent)" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] opacity-10 blur-[150px] rounded-full" style={{ background: "var(--accent)" }} />

        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center relative z-10 reveal">
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-gradient mb-6">
            Your Next Customer Could Be<br />One Message Away.
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "var(--text-dim)" }}>
            Turn social engagement into automated conversations, qualified leads and sales.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/login" className="btn-primary px-8 py-4 rounded-lg text-sm flex items-center gap-2">
              Start Building <ArrowRight className="w-3 h-3" />
            </Link>
            <Link href="/book-demo" className="btn-secondary px-8 py-4 rounded-lg text-sm inline-flex items-center gap-2">
              Book Demo <Calendar className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12" style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#7B2CBF] flex items-center justify-center">
                <Zap className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>X.Solum</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>The Operating System for AI-Powered WhatsApp Sales.</p>
          </div>
          <div>
            <div className="text-xs font-semibold mb-3 text-white">Product</div>
            <ul className="space-y-2 text-xs" style={{ color: "var(--text-dim)" }}>
              <li><a href="#" className="hover:text-white">AI Sales Agent</a></li>
              <li><a href="#" className="hover:text-white">Flow Builder</a></li>
              <li><a href="#" className="hover:text-white">WhatsApp CRM</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold mb-3 text-white">Use Cases</div>
            <ul className="space-y-2 text-xs" style={{ color: "var(--text-dim)" }}>
              <li><a href="#" className="hover:text-white">Real Estate</a></li>
              <li><a href="#" className="hover:text-white">Education</a></li>
              <li><a href="#" className="hover:text-white">D2C Brands</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold mb-3 text-white">Resources</div>
            <ul className="space-y-2 text-xs" style={{ color: "var(--text-dim)" }}>
              <li><a href="#" className="hover:text-white">Documentation</a></li>
              <li><a href="#" className="hover:text-white">API Reference</a></li>
              <li><a href="#" className="hover:text-white">Status</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 mt-12 pt-8 border-t flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs" style={{ color: "var(--text-dim)" }}>© 2025 X.Solum AI. All rights reserved.</div>
          <div className="flex gap-4" style={{ color: "var(--text-dim)" }}>
            <a href="#" className="hover:text-white">Twitter</a>
            <a href="#" className="hover:text-white">LinkedIn</a>
            <a href="https://github.com/ossolum-hv/Solum_wacrm" target="_blank" rel="noopener noreferrer" className="hover:text-white">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
