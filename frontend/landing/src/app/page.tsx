"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sendDemoRequest } from "@/lib/mailService";

// Was hardcoded to http://localhost:3001/login in every "Institute Login"
// link — dead on the deployed site since a visitor's browser has nothing
// listening on localhost:3001. Configurable per environment like the other
// frontends' NEXT_PUBLIC_API_BASE_URL; defaults to the real deployed
// institute portal so the button works even before Vercel's env var is set.
const INSTITUTE_APP_URL = process.env.NEXT_PUBLIC_INSTITUTE_APP_URL ?? "https://tuitionos-institute.vercel.app";

// Section ids that get their own clean URL (via the rewrites in
// next.config.ts) instead of a "/#id" hash — e.g. /pricing instead of
// /#pricing. Scrolling to the section is then done manually in the effect
// below, since there's no real hash for the browser to jump to.
const ROUTE_SECTIONS = ["features", "pricing"];

type PlanTier = "solo" | "institute" | "pro";

// Mirrors the feature bullets in the pricing section below exactly — a
// feature is only tagged with a plan here if that plan's list further down
// the page actually includes it, so the badges never overstate what a plan
// unlocks.
const PLAN_META: Record<PlanTier, { label: string; bg: string; fg: string }> = {
  solo: { label: "Solo", bg: "var(--cr-d)", fg: "var(--ink2)" },
  institute: { label: "Institute", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  pro: { label: "Institute Pro", bg: "var(--ac-l)", fg: "var(--ac)" },
};

type Hotspot = { x: number; y: number; label: string };

const ALL_FEATURES: {
  id: string; title: string; desc: string; icon: string; img: string;
  route: string; plans: PlanTier[]; hotspots: Hotspot[];
}[] = [
  {
    id: "dashboard", title: "Institute Dashboard & Analytics",
    desc: "Get a birds-eye view on total revenue, enrollment trends, and day-to-day operations at a glance.",
    icon: "📈", img: "/screens/dashboard.png", route: "app.tuitionos.lk/dashboard",
    plans: ["solo", "institute", "pro"],
    hotspots: [
      { x: 26, y: 29, label: "Live totals: students, batches, fees due, and today's absentees" },
      { x: 63, y: 62, label: "Per-batch attendance rate, updated the moment a class is marked" },
    ],
  },
  {
    id: "accounts", title: "Total Income & Accounting",
    desc: "Track every cent flowing through your institute. Real-time ledgers, P&L statements, and automated financial reporting.",
    icon: "💼", img: "/screens/accounts.png", route: "app.tuitionos.lk/accounts",
    plans: ["institute", "pro"],
    hotspots: [
      { x: 33, y: 22, label: "Income, expenses, and net position for the period you pick" },
      { x: 50, y: 48, label: "Every transaction, editable inline — no spreadsheet exports needed" },
    ],
  },
  {
    id: "teachers", title: "Teacher Fee Management",
    desc: "Easily handle teacher payouts. Configure flat rates or per-student cuts, and let the system calculate salaries automatically.",
    icon: "👨‍🏫", img: "/screens/teachers.png", route: "app.tuitionos.lk/teachers",
    plans: ["institute", "pro"],
    hotspots: [
      { x: 66, y: 24, label: "Monthly salary, calculated automatically per teacher" },
      { x: 83, y: 24, label: "One glance to see who's active this term" },
    ],
  },
  {
    id: "attendance", title: "Attendance & Roll Call",
    desc: "Mark attendance in seconds per subject. Parents receive instant WhatsApp/SMS alerts if their child is absent.",
    icon: "📊", img: "/screens/attendance.png", route: "app.tuitionos.lk/attendance",
    plans: ["solo", "institute", "pro"],
    hotspots: [
      { x: 87, y: 65, label: "Tap once — Present or Absent saves straight to the record, no save button" },
      { x: 87, y: 13, label: "Send a WhatsApp alert to parents of absentees in one click" },
    ],
  },
  {
    id: "exams", title: "Exam & Academic Results",
    desc: "Schedule exams, record student marks effortlessly, and generate beautiful PDF report cards for parents.",
    icon: "📝", img: "/screens/exams.png", route: "app.tuitionos.lk/exams",
    plans: ["institute", "pro"],
    hotspots: [
      { x: 25, y: 22, label: "Every exam per batch, with results status at a glance" },
      { x: 93, y: 11, label: "Create a new exam and schedule subjects in a few clicks" },
    ],
  },
  {
    id: "timetable", title: "Timetable Scheduling",
    desc: "Conflict-free scheduling for teachers, batches, and classrooms using an easy visual drag-and-drop interface.",
    icon: "📅", img: "/screens/timetable.png", route: "app.tuitionos.lk/timetable",
    plans: ["solo", "institute", "pro"],
    hotspots: [
      { x: 50, y: 25, label: "Reusable time blocks — set once, reuse across every batch" },
      { x: 40, y: 55, label: "The full week at a glance, filterable by batch or teacher" },
    ],
  },
  {
    id: "notifications", title: "Parent Communication",
    desc: "Send bulk announcements via SMS or WhatsApp directly from your dashboard. Keep everyone informed instantly.",
    icon: "📱", img: "/screens/notifications.png", route: "app.tuitionos.lk/notifications",
    plans: ["pro"],
    hotspots: [
      { x: 50, y: 32, label: "Every broadcast and its delivery status, all in one log" },
      { x: 93, y: 11, label: "Draft a new WhatsApp or SMS broadcast in seconds" },
    ],
  },
  {
    id: "promotion", title: "Automated Year-end Promotion",
    desc: "Promote thousands of students to their next grades automatically while archiving their historical data.",
    icon: "🎓", img: "/screens/promotion.png", route: "app.tuitionos.lk/promotion",
    plans: ["pro"],
    hotspots: [
      { x: 50, y: 28, label: "Auto-suggests the next grade for every batch, one tap to confirm" },
      { x: 50, y: 90, label: "Terminal grades are flagged as a graduating cohort automatically" },
    ],
  },
];

// Fades a section up into place the first time it scrolls into view —
// used to give the page depth/motion instead of everything being static.
function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    // Safety net: guarantee the content becomes visible even if the
    // observer never fires (e.g. a non-compositing embedded context) —
    // this is a progressive-enhancement animation, not gatekeeping.
    const fallback = setTimeout(() => setInView(true), 1800);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, []);

  return (
    <div ref={ref} className={`reveal ${inView ? "in-view" : ""} ${className}`}>
      {children}
    </div>
  );
}

function PlanBadges({ plans }: { plans: PlanTier[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {plans.map(p => {
        const meta = PLAN_META[p];
        return (
          <Link key={p} href="/pricing" className="plan-bdg" style={{ background: meta.bg, color: meta.fg }}>
            {p === "pro" && "★ "}{meta.label}
          </Link>
        );
      })}
    </div>
  );
}

function FeatureInteractive({ onZoom }: { onZoom: (img: string, title: string) => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeFeature = ALL_FEATURES[activeIdx];

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Left side: Feature List */}
      <div className="flex-1 w-full flex flex-col gap-1.5">
        {ALL_FEATURES.map((f, i) => {
          const isActive = i === activeIdx;
          return (
            <div
              key={f.id}
              onClick={() => setActiveIdx(i)}
              className={`p-3.5 rounded-xl cursor-pointer transition-all duration-300 border ${
                isActive
                  ? "bg-white border-[var(--tc)] shadow-lg shadow-[rgba(79,70,229,0.08)] transform translate-x-1"
                  : "bg-transparent border-transparent hover:bg-white/50 hover:border-[var(--ln)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  isActive ? "bg-[var(--tc-l)] text-[var(--tc-d)]" : "bg-[var(--cr)] border border-[var(--ln)] text-[var(--ink)]"
                }`}>
                  {f.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className={`text-[15.5px] font-bold ${isActive ? "text-[var(--tc-d)]" : "text-[var(--ink)]"}`}>
                      {f.title}
                    </h3>
                  </div>
                  {isActive && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                      <p className="text-[13.5px] text-[var(--ink3)] leading-relaxed mb-2.5">
                        {f.desc}
                      </p>
                      <PlanBadges plans={f.plans} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right side: Interactive Image, framed like a real browser window */}
      <div className="flex-[1.4] w-full sticky top-32">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--tc-l)] to-transparent rounded-[28px] blur-3xl opacity-50 -z-10 translate-y-3" />
          <div className="browser-frame">
            <div className="browser-frame-bar">
              <div className="browser-frame-dots">
                <span className="browser-frame-dot" style={{ background: "#f87171" }} />
                <span className="browser-frame-dot" style={{ background: "#fbbf24" }} />
                <span className="browser-frame-dot" style={{ background: "#4ade80" }} />
              </div>
              <div className="browser-frame-url">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="4.5" width="6" height="4.5" rx="0.8"/><path d="M3.3 4.5V3a1.7 1.7 0 013.4 0v1.5"/></svg>
                {activeFeature.route}
              </div>
            </div>
            <div
              className="browser-frame-body"
              onClick={() => onZoom(activeFeature.img, activeFeature.title)}
            >
              {ALL_FEATURES.map((f, i) => (
                <img
                  key={f.id}
                  src={f.img}
                  alt={f.title}
                  className={`transition-opacity duration-500 ${i === activeIdx ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                />
              ))}
              {activeFeature.hotspots.map((h, hi) => (
                <div key={hi} className="hotspot" style={{ left: `${h.x}%`, top: `${h.y}%` }}>
                  <span className="hotspot-ring" />
                  <span className="hotspot-core" />
                  <span className="hotspot-tip">{h.label}</span>
                </div>
              ))}
              <div className="browser-frame-zoom-hint">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5.2" cy="5.2" r="3.7"/><path d="M10 10l-2.2-2.2"/></svg>
                Click to explore full screen
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [form, setForm] = useState({ name: "", institute: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lightbox, setLightbox] = useState<{ img: string; title: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await sendDemoRequest(form);
      setSubmitted(true);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // /pricing and /features are rewritten (see next.config.ts) to serve this
  // same page, so there's no real browser hash to jump to — scroll to the
  // matching section ourselves whenever the route resolves to one.
  //
  // Deliberately reads window.location.pathname instead of trusting the
  // `pathname` value above directly: per Next's own docs, a page reached
  // through a rewrite reports the server-rendered *source* path (here "/")
  // on first hydration, not the browser's real URL — so on a hard reload of
  // /pricing, `pathname` reads "/" and this would silently never scroll.
  // `pathname` is still the effect's dependency so it re-fires correctly on
  // subsequent client-side <Link> navigations too.
  useEffect(() => {
    const id = window.location.pathname.replace(/^\//, "");
    if (!ROUTE_SECTIONS.includes(id)) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="glass-nav fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--tc)] text-white flex items-center justify-center font-bold text-sm">
              OS
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight text-[var(--ink)]">
              TuitionOS
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[14.5px] font-medium text-[var(--ink2)]">
            <Link href="/features" className="hover:text-[var(--tc)] transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-[var(--tc)] transition-colors">Pricing</Link>
            <a href="#demo" className="hover:text-[var(--tc)] transition-colors">Request Demo</a>
            <a href={`${INSTITUTE_APP_URL}/login`} className="btn btn-s px-5 py-2 !text-[13.5px]">Institute Login</a>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-16 lg:pt-24 lg:pb-20 px-6">
          <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_30%,transparent_75%)] pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--tc-l)] rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute top-40 -right-32 w-80 h-80 bg-[var(--ac-l)] rounded-full blur-3xl opacity-40 pointer-events-none" />

          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative">
            <div className="flex-1 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--tc-l)] text-[var(--tc-d)] font-semibold text-xs tracking-wide uppercase mb-6">
                <span className="w-2 h-2 rounded-full bg-[var(--tc)] animate-pulse" />
                Built for Tuition Institutes in Sri Lanka
              </div>
              <h1 className="font-serif text-5xl lg:text-6xl font-bold leading-[1.05] text-[var(--ink)] mb-6">
                The Operating System for <span className="text-[var(--tc)] italic">Modern Institutes</span>
              </h1>
              <p className="text-lg text-[var(--ink3)] leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
                Replace your spreadsheets and fragmented tools with one beautiful platform. Manage students, attendance, fee collection, and parent communication effortlessly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8">
                <Link href="/features" className="btn btn-p w-full sm:w-auto text-lg px-8 py-4">Explore the Portal</Link>
                <a href="#demo" className="btn btn-s w-full sm:w-auto text-lg px-8 py-4">Request a Live Demo</a>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[13px] text-[var(--ink3)] font-medium">
                {["Attendance", "Fees", "Timetable", "Exams", "Parent Alerts"].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--ok)" strokeWidth="2"><path d="M2 6.5l3 3 6-6"/></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero Image/Mockup Graphic */}
            <div className="flex-1 w-full max-w-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--tc-l)] to-transparent rounded-[40px] blur-3xl opacity-60" />
              <div className="relative bg-white border border-[var(--ln)] rounded-3xl p-2 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="rounded-2xl border border-[var(--ln)] overflow-hidden bg-[var(--cr)] flex flex-col relative aspect-[16/10]">
                  <img src="/screens/dashboard.png" alt="Institute Dashboard" className="w-full h-full object-cover object-left-top" />
                </div>
              </div>
              {/* Floating stat chips — pulled straight from the dashboard screenshot above */}
              <div className="hidden sm:flex absolute -bottom-5 -left-5 items-center gap-2.5 bg-white rounded-2xl shadow-xl border border-[var(--ln)] px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--ok-l)] text-[var(--ok-d)] flex items-center justify-center text-base">✓</div>
                <div>
                  <div className="text-[15px] font-bold text-[var(--ink)] leading-tight">100% Attendance</div>
                  <div className="text-[11px] text-[var(--ink3)]">Marked in seconds today</div>
                </div>
              </div>
              <div className="hidden sm:flex absolute -top-5 -right-5 items-center gap-2.5 bg-white rounded-2xl shadow-xl border border-[var(--ln)] px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--tc-l)] text-[var(--tc-d)] flex items-center justify-center text-base">🔔</div>
                <div>
                  <div className="text-[15px] font-bold text-[var(--ink)] leading-tight">Auto WhatsApp Alerts</div>
                  <div className="text-[11px] text-[var(--ink3)]">Sent to parents instantly</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Switch — benefit strip on a dark indigo band for visual contrast */}
        <section className="relative py-14 px-6 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--ink) 0%, #1e1b4b 55%, var(--tc-d) 100%)" }}>
          <div className="dot-grid absolute inset-0 opacity-[0.08] pointer-events-none" style={{ filter: "invert(1)" }} />
          <Reveal className="max-w-7xl mx-auto relative">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {[
                { icon: "⚡", title: "Mark attendance in one tap", desc: "Every tap saves instantly to the record — no save button, no waiting." },
                { icon: "💬", title: "Parents notified automatically", desc: "WhatsApp or SMS alerts go out to absentee parents with one click." },
                { icon: "📊", title: "One dashboard, zero spreadsheets", desc: "Fees, attendance, exams, and payroll — all in a single live view." },
                { icon: "🔒", title: "Your data, isolated & secure", desc: "Every institute's records are fully separated — nothing is ever shared across tenants." },
              ].map(b => (
                <div key={b.title} className="flex flex-col gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-xl">{b.icon}</div>
                  <div className="text-white font-bold text-[15px] leading-snug">{b.title}</div>
                  <div className="text-white/60 text-[13px] leading-relaxed">{b.desc}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Features Section */}
        <section id="features" className="scroll-mt-20 py-16 lg:py-20 bg-white px-6 border-y border-[var(--ln)]">
          <div className="max-w-7xl mx-auto">
            <Reveal className="text-center mb-4">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold text-[var(--ink)] mb-4">Everything you need to grow</h2>
              <p className="text-[var(--ink3)] text-lg max-w-2xl mx-auto">TuitionOS replaces 5 different tools with one seamless, beautifully designed platform built specifically for educational institutes.</p>
            </Reveal>
            <div className="text-center mb-10">
              <p className="text-[13px] text-[var(--ink3)] inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="5.5"/><path d="M6.5 4v3l2 1"/></svg>
                These are live screens from the real portal — click any image to explore it full-size, no demo booking needed.
              </p>
            </div>

            <FeatureInteractive onZoom={(img, title) => setLightbox({ img, title })} />
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="scroll-mt-20 py-16 lg:py-20 px-6 bg-[var(--cr)]">
          <Reveal className="max-w-7xl mx-auto text-center mb-12">
            <h2 className="font-serif text-4xl lg:text-5xl font-bold text-[var(--ink)] mb-4">Simple, transparent pricing</h2>
            <p className="text-[var(--ink3)] text-lg max-w-2xl mx-auto">Start with our risk-free 14-day trial. No credit card required. Upgrade when you're ready to scale.</p>
          </Reveal>
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Solo Plan */}
            <div className="bg-white border border-[var(--ln)] rounded-2xl p-8 shadow-sm flex flex-col hover:border-[var(--tc)] hover:-translate-y-1 transition-all">
              <div className="w-11 h-11 rounded-xl bg-[var(--cr-d)] flex items-center justify-center text-xl mb-4">🎓</div>
              <h3 className="text-2xl font-bold text-[var(--ink)] mb-2">Solo Plan</h3>
              <div className="text-[var(--ink3)] mb-6">For single teachers</div>
              <div className="flex items-end gap-2 mb-8 pb-8 border-b border-[var(--ln)]">
                <span className="text-4xl font-serif font-bold text-[var(--ink)]">LKR 1,500</span>
                <span className="text-[var(--ink3)] font-medium mb-1">/ month</span>
              </div>
              
              <div className="flex-1">
                <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Limits</div>
                <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Up to 200 Students / year</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> 1 Subject</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> <strong>Unlimited</strong> Batches</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> 1 GB Storage</li>
                </ul>

                <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Core Features</div>
                <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Student enrollment</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Batch scheduling</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Attendance tracking</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Fee collection</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Dashboard analytics</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Timetable scheduling</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> QR ID cards</li>
                </ul>

                <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Advanced</div>
                <ul className="flex flex-col gap-3 text-[var(--ink3)] font-medium text-[13.5px] opacity-60">
                  <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> WhatsApp notifications</li>
                  <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> Year-end promotion</li>
                </ul>
              </div>
            </div>

            {/* Institute Plan */}
            <div className="bg-white border border-[var(--ln)] rounded-2xl p-8 shadow-sm flex flex-col hover:border-[var(--tc)] hover:-translate-y-1 transition-all">
              <div className="w-11 h-11 rounded-xl bg-[var(--tc-l)] flex items-center justify-center text-xl mb-4">🏫</div>
              <h3 className="text-2xl font-bold text-[var(--ink)] mb-2">Institute Plan</h3>
              <div className="text-[var(--ink3)] mb-6">For growing institutes</div>
              <div className="flex items-end gap-2 mb-8 pb-8 border-b border-[var(--ln)]">
                <span className="text-4xl font-serif font-bold text-[var(--ink)]">LKR 3,000</span>
                <span className="text-[var(--ink3)] font-medium mb-1">/ month</span>
              </div>
              
              <div className="flex-1">
                <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Limits</div>
                <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Up to 200 Students / year</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> <strong>Unlimited</strong> Subjects</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> <strong>Unlimited</strong> Batches</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> 5 GB Storage</li>
                </ul>

                <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Core Features</div>
                <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Subject management</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Teacher salary tracking</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Attendance & fees</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Financial accounts</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> Timetable scheduling</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--ok)] mt-0.5">✓</span> QR ID cards</li>
                </ul>

                <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Advanced</div>
                <ul className="flex flex-col gap-3 text-[var(--ink3)] font-medium text-[13.5px] opacity-60">
                  <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> WhatsApp notifications</li>
                  <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> Year-end promotion</li>
                </ul>
              </div>
            </div>

            {/* Institute Pro Plan */}
            <div className="bg-white border-2 border-[var(--tc)] rounded-2xl p-8 shadow-lg relative flex flex-col">
              <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-[var(--tc)] text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase">Most Popular</div>
              <div className="w-11 h-11 rounded-xl bg-[var(--ac-l)] flex items-center justify-center text-xl mb-4">👑</div>
              <h3 className="text-2xl font-bold text-[var(--ink)] mb-2">Institute Pro</h3>
              <div className="text-[var(--ink3)] mb-6">Full-powered management</div>
              <div className="flex items-end gap-2 mb-8 pb-8 border-b border-[var(--ln)]">
                <span className="text-5xl font-serif font-bold text-[var(--ink)]">LKR 6,000</span>
                <span className="text-[var(--ink3)] font-medium mb-1">/ month</span>
              </div>
              
              <div className="flex-1">
                <div className="text-xs font-bold text-[var(--tc)] tracking-wider uppercase mb-3">Limits</div>
                <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                  <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> <strong>Unlimited</strong> Students</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> <strong>Unlimited</strong> Subjects</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> <strong>Unlimited</strong> Batches</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> 10 GB Storage</li>
                </ul>

                <div className="text-xs font-bold text-[var(--tc)] tracking-wider uppercase mb-3">Core Features</div>
                <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                  <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> All Institute features</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Advanced financial reporting</li>
                </ul>

                <div className="text-xs font-bold text-[var(--tc)] tracking-wider uppercase mb-3">Exclusive to Pro</div>
                <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                  <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> WhatsApp notifications</li>
                  <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Year-end promotion</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo" className="py-16 lg:py-20 px-6">
          <div className="max-w-3xl mx-auto bg-white border border-[var(--ln)] rounded-3xl p-8 lg:p-10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--tc-d)] to-[var(--tc-l)]" />
            <h3 className="font-serif text-3xl font-bold text-[var(--ink)] mb-3">Request your demo</h3>
            <p className="text-[var(--ink3)] mb-8">We'll set up a personalized walkthrough of the platform for your institute.</p>

            {submitted ? (
              <div className="bg-[var(--tc-l)] border border-[var(--tc)] rounded-2xl p-8 text-center text-[var(--tc-d)]">
                <div className="text-4xl mb-4">🎉</div>
                <h4 className="text-xl font-bold mb-2">Request Received!</h4>
                <p>Our team will contact you within 24 hours to schedule your demo.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-[13.5px] font-semibold text-[var(--ink2)] mb-2">Your Name</label>
                  <input required type="text" className="w-full bg-[var(--cr)] border border-[var(--ln)] rounded-xl px-4 py-3 outline-none focus:border-[var(--tc)] transition-colors" placeholder="e.g. John Doe" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                </div>
                <div>
                  <label className="block text-[13.5px] font-semibold text-[var(--ink2)] mb-2">Institute Name</label>
                  <input required type="text" className="w-full bg-[var(--cr)] border border-[var(--ln)] rounded-xl px-4 py-3 outline-none focus:border-[var(--tc)] transition-colors" placeholder="e.g. Excellence Academy" value={form.institute} onChange={e=>setForm({...form,institute:e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13.5px] font-semibold text-[var(--ink2)] mb-2">Email Address</label>
                    <input required type="email" className="w-full bg-[var(--cr)] border border-[var(--ln)] rounded-xl px-4 py-3 outline-none focus:border-[var(--tc)] transition-colors" placeholder="john@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[13.5px] font-semibold text-[var(--ink2)] mb-2">Phone Number</label>
                    <input required type="tel" className="w-full bg-[var(--cr)] border border-[var(--ln)] rounded-xl px-4 py-3 outline-none focus:border-[var(--tc)] transition-colors" placeholder="+94 77 000 0000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-[#fceaea] border border-[#f5c5c5] rounded-xl px-4 py-3 text-[13.5px] text-[#b83030] font-medium flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="7" cy="7" r="6"/><path d="M7 4.5v3M7 9.5h.01"/>
                    </svg>
                    {errorMsg}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className={`btn btn-p w-full py-4 text-lg mt-2 shadow-lg shadow-[rgba(79,70,229,0.2)] ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}>
                  {isSubmitting ? "Sending..." : "Book Demo Call"}
                </button>
                <p className="text-center text-xs text-[var(--ink3)] mt-2">By submitting this form, you agree to our Terms of Service and Privacy Policy.</p>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Closing CTA band */}
      <section className="relative py-16 px-6 overflow-hidden text-center" style={{ background: "linear-gradient(135deg, var(--tc) 0%, var(--tc-d) 100%)" }}>
        <div className="dot-grid absolute inset-0 opacity-[0.12] pointer-events-none" style={{ filter: "invert(1)" }} />
        <Reveal className="max-w-2xl mx-auto relative">
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-4">Ready to modernize your institute?</h2>
          <p className="text-white/75 text-lg mb-8">Explore every screen above, then pick the plan that fits — or talk to us first, whichever you prefer.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/pricing" className="btn text-lg px-8 py-4 bg-white text-[var(--tc-d)] hover:bg-white/90 transition-colors">View Pricing</Link>
            <a href="#demo" className="btn text-lg px-8 py-4 bg-white/10 text-white border border-white/25 hover:bg-white/20 transition-colors">Request a Demo</a>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--ink)] text-[var(--ln)] pt-14 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--tc)] text-white flex items-center justify-center font-bold text-xs">OS</div>
              <span className="font-serif text-lg font-bold tracking-tight text-white">TuitionOS</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">The operating system for tuition institutes — students, attendance, fees, and parent communication in one place.</p>
          </div>
          <div>
            <div className="text-xs font-bold text-white/40 tracking-wider uppercase mb-3">Product</div>
            <div className="flex flex-col gap-2.5 text-sm text-white/70">
              <Link href="/features" className="hover:text-white transition-colors">Features</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <a href={`${INSTITUTE_APP_URL}/login`} className="hover:text-white transition-colors">Institute Login</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-white/40 tracking-wider uppercase mb-3">Company</div>
            <div className="flex flex-col gap-2.5 text-sm text-white/70">
              <a href="#demo" className="hover:text-white transition-colors">Request a Demo</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-white/40 tracking-wider uppercase mb-3">Get in touch</div>
            <div className="flex flex-col gap-2.5 text-sm text-white/70">
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 3.5l5.5 4 5.5-4"/><rect x="1.5" y="2.5" width="11" height="9" rx="1"/></svg>
                hello@tuitionos.lk
              </span>
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 1.5h2l1 3-1.5 1a8 8 0 004 4l1-1.5 3 1v2a1 1 0 01-1 1A9.5 9.5 0 011.5 2.5a1 1 0 011-1z"/></svg>
                +94 77 000 0000
              </span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 pt-6 text-sm">
          <div className="opacity-50">© 2026 TuitionOS Inc. All rights reserved.</div>
          <div className="opacity-50">Made for tuition institutes across Sri Lanka</div>
        </div>
      </footer>

      {/* Lightbox — full-size screenshot explorer */}
      {lightbox && (
        <div className="lightbox-backdrop" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">×</button>
          <div className="max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center text-white/80 text-sm font-medium mb-3">{lightbox.title}</div>
            <img
              src={lightbox.img}
              alt={lightbox.title}
              className="w-full rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
