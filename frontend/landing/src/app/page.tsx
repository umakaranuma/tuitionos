"use client";

import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [form, setForm] = useState({ name: "", institute: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here we would normally submit to our backend API
    setSubmitted(true);
  };

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
            <a href="#features" className="hover:text-[var(--tc)] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[var(--tc)] transition-colors">Pricing</a>
            <a href="#demo" className="hover:text-[var(--tc)] transition-colors">Request Demo</a>
            <button className="btn btn-s px-5 py-2 !text-[13.5px]">Institute Login</button>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32 px-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--tc-l)] text-[var(--tc-d)] font-semibold text-xs tracking-wide uppercase mb-6">
                <span className="w-2 h-2 rounded-full bg-[var(--tc)] animate-pulse" />
                Version 2.0 Now Live
              </div>
              <h1 className="font-serif text-6xl lg:text-7xl font-bold leading-[1.05] text-[var(--ink)] mb-6">
                The Operating System for <span className="text-[var(--tc)] italic">Modern Institutes</span>
              </h1>
              <p className="text-lg lg:text-xl text-[var(--ink3)] leading-relaxed mb-10 max-w-2xl mx-auto lg:mx-0">
                Replace your spreadsheets and fragmented tools with one beautiful platform. Manage students, attendance, fee collection, and parent communication effortlessly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <a href="#demo" className="btn btn-p w-full sm:w-auto text-lg px-8 py-4">Request a Live Demo</a>
                <a href="#features" className="btn btn-s w-full sm:w-auto text-lg px-8 py-4">Explore Features</a>
              </div>
            </div>
            
            {/* Hero Image/Mockup Graphic */}
            <div className="flex-1 w-full max-w-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--tc-l)] to-transparent rounded-[40px] blur-3xl opacity-60" />
              <div className="relative bg-white border border-[var(--ln)] rounded-3xl p-2 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="rounded-2xl border border-[var(--ln)] overflow-hidden bg-[var(--cr)] flex flex-col relative aspect-[16/10]">
                  <img src="/dashboard-screenshot.png" alt="Institute Dashboard" className="w-full h-full object-cover object-left-top" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white px-6 border-y border-[var(--ln)]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold text-[var(--ink)] mb-4">Everything you need to grow</h2>
              <p className="text-[var(--ink3)] text-lg max-w-2xl mx-auto">TuitionOS replaces 5 different tools with one seamless, beautifully designed platform built specifically for educational institutes.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Smart Fee Tracking", desc: "Automate invoicing, track partial payments, and send instant WhatsApp reminders for overdue fees.", icon: "💰" },
                { title: "Attendance & Reports", desc: "Mark attendance in seconds. Parents get instant SMS alerts if their child is absent.", icon: "📊" },
                { title: "Exam Management", desc: "Schedule exams, record marks, and generate beautiful PDF report cards automatically.", icon: "📝" },
                { title: "Timetable Scheduling", desc: "Conflict-free scheduling for teachers and batches. Easy visual drag-and-drop interface.", icon: "📅" },
                { title: "Parent Communication", desc: "Send bulk announcements via SMS or WhatsApp directly from your dashboard.", icon: "📱" },
                { title: "Institute Analytics", desc: "Get birds-eye view on revenue, enrollment trends, and teacher performance.", icon: "📈" }
              ].map((f, i) => (
                <div key={i} className="feature-card">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--cr)] border border-[var(--ln)] flex items-center justify-center text-2xl mb-6 shadow-sm">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--ink)] mb-3">{f.title}</h3>
                  <p className="text-[var(--ink3)] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing & Form Section */}
        <section className="py-24 px-6 bg-[var(--cr)]">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
            
            {/* Pricing Info */}
            <div id="pricing">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold text-[var(--ink)] mb-6">Simple, transparent pricing</h2>
              <p className="text-[var(--ink3)] text-lg mb-10">Start with our risk-free 14-day trial. No credit card required. Upgrade when you're ready to scale.</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Basic Plan */}
                <div className="bg-white border border-[var(--ln)] rounded-2xl p-8 shadow-sm flex flex-col">
                  <h3 className="text-2xl font-bold text-[var(--ink)] mb-2">Basic Plan</h3>
                  <div className="text-[var(--ink3)] mb-6">For getting started</div>
                  <div className="flex items-end gap-2 mb-8 pb-8 border-b border-[var(--ln)]">
                    <span className="text-4xl font-serif font-bold text-[var(--ink)]">LKR 3,000</span>
                    <span className="text-[var(--ink3)] font-medium mb-1">/ month</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '450px' }}>
                    <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Limits</div>
                    <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Up to 200 Students</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Up to 10 Batches</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> 5 GB Storage</li>
                    </ul>

                    <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Core Features</div>
                    <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Student enrollment & management</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Subject & teacher management</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Batch creation & scheduling</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Attendance tracking (per-subject)</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Fee collection, receipts & ledger</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Teacher salary management</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Financial accounts dashboard</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--sp)] mt-0.5">✓</span> Dashboard with KPIs & analytics</li>
                    </ul>

                    <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Notifications</div>
                    <ul className="flex flex-col gap-3 text-[var(--ink3)] font-medium text-[13.5px] mb-6 opacity-60">
                      <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> WhatsApp notifications (automated)</li>
                      <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> Fee due reminders (1st of month)</li>
                      <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> Daily absent digest (6:00 PM)</li>
                      <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> Fee paid confirmation alerts</li>
                    </ul>

                    <div className="text-xs font-bold text-[var(--ink3)] tracking-wider uppercase mb-3">Scheduling & Advanced</div>
                    <ul className="flex flex-col gap-3 text-[var(--ink3)] font-medium text-[13.5px] opacity-60">
                      <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> Timetable management & PDF</li>
                      <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> Automated Year-end promotion</li>
                      <li className="flex items-start gap-3"><span className="mt-0.5">✕</span> Priority WhatsApp support</li>
                    </ul>
                  </div>
                </div>

                {/* Premium Plan */}
                <div className="bg-white border-2 border-[var(--tc)] rounded-2xl p-8 shadow-lg relative flex flex-col">
                  <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-[var(--tc)] text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase">Most Popular</div>
                  <h3 className="text-2xl font-bold text-[var(--ink)] mb-2">Premium Plan</h3>
                  <div className="text-[var(--ink3)] mb-6">Full-powered management</div>
                  <div className="flex items-end gap-2 mb-8 pb-8 border-b border-[var(--ln)]">
                    <span className="text-5xl font-serif font-bold text-[var(--ink)]">LKR 6,000</span>
                    <span className="text-[var(--ink3)] font-medium mb-1">/ month</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '450px' }}>
                    <div className="text-xs font-bold text-[var(--tc)] tracking-wider uppercase mb-3">Limits</div>
                    <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> <strong>Unlimited</strong> Students</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> <strong>Unlimited</strong> Batches</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> 10 GB Storage</li>
                    </ul>

                    <div className="text-xs font-bold text-[var(--tc)] tracking-wider uppercase mb-3">Core Features</div>
                    <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Student enrollment & management</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Subject & teacher management</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Batch creation & scheduling</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Attendance tracking (per-subject)</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Fee collection, receipts & ledger</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Teacher salary management</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Financial accounts dashboard</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Dashboard with KPIs & analytics</li>
                    </ul>

                    <div className="text-xs font-bold text-[var(--tc)] tracking-wider uppercase mb-3">Automated Notifications</div>
                    <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px] mb-6">
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> WhatsApp notifications (automated)</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Fee due reminders (1st of month)</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Daily absent digest (6:00 PM)</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Fee paid confirmation alerts</li>
                    </ul>

                    <div className="text-xs font-bold text-[var(--tc)] tracking-wider uppercase mb-3">Scheduling & Advanced</div>
                    <ul className="flex flex-col gap-3 text-[var(--ink2)] font-medium text-[13.5px]">
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Timetable management & PDF</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Annual timetable PDF blast</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Year-end promotion (automated)</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Promotion notifications to parents</li>
                      <li className="flex items-start gap-3"><span className="text-[var(--tc)] mt-0.5">✓</span> Priority WhatsApp support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div id="demo" className="bg-white border border-[var(--ln)] rounded-3xl p-8 lg:p-10 shadow-xl relative overflow-hidden">
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
                  <button type="submit" className="btn btn-p w-full py-4 text-lg mt-4 shadow-lg shadow-[rgba(45,122,90,0.2)]">Book Demo Call</button>
                  <p className="text-center text-xs text-[var(--ink3)] mt-2">By submitting this form, you agree to our Terms of Service and Privacy Policy.</p>
                </form>
              )}
            </div>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--ink)] text-[var(--ln)] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--tc)] text-white flex items-center justify-center font-bold text-[10px]">OS</div>
            <span className="font-serif text-xl font-bold tracking-tight text-white">TuitionOS</span>
          </div>
          <div className="text-sm opacity-60">© 2026 TuitionOS Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
