import React, { useState, useEffect, useRef } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { fetchMe, UserProfile } from "@/lib/api";
import { gsap } from "@/lib/gsap";
import ScamStatisticsCharts from "@/components/home/ScamStatisticsCharts";
import IndiaScamMap from "@/components/home/IndiaScamMap";
import NewspaperHeadlines from "@/components/home/NewspaperHeadlines";
import InteractiveScammerShowcase from "@/components/home/InteractiveScammerShowcase";

export function HomePage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [choice, setChoice] = useState<"tap" | "ign" | "chk" | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    uid: "guest",
    belt: "orange",
    resilienceScore: 39,
    streakDays: 5,
    displayName: "Dojo Student",
    language: "en",
  });

  useEffect(() => {
    fetchMe()
      .then((data) => {
        if (data) setUserProfile(data);
      })
      .catch(() => {});

    // GSAP entrance animation for hero elements
    if (heroRef.current) {
      const elements = heroRef.current.querySelectorAll(".hero-anim");
      gsap.fromTo(
        elements,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
        }
      );
    }
  }, []);

  const outcomes = {
    tap: {
      text: "That link downloads a malicious APK or prompts for your UPI PIN. Test your defensive instincts in a realistic 3-minute drill:",
      btnText: "Start Practice Drill",
      action: () => router.push("/train"),
    },
    ign: {
      text: "Smart instinct! But scammers frequently follow up with high-pressure phone calls within minutes. See how to shut them down:",
      btnText: "Practice Follow-Up Call Drill",
      action: () => router.push("/train"),
    },
    chk: {
      text: "Excellent move! Paste any message or screenshot into our forensic scanner to detect hidden threat vectors and sender spoofing:",
      btnText: "Scan This Message Now",
      action: () => router.push("/check"),
    },
  };

  const selectedOutcome = choice ? outcomes[choice] : null;

  return (
    <div className="pt-4 pb-16 space-y-8">
      {/* 1. PROFESSIONAL HERO SECTION */}
      <section ref={heroRef} className="relative pt-6 pb-10">
        {/* Top National Alert Ribbon */}
        <div className="hero-anim inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 bg-[var(--sf)] border border-[var(--line)] rounded-full text-xs font-semibold text-[var(--ink)] mb-4 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-red-600 dark:text-red-400">National Fraud Watch:</span>
          <span className="text-[var(--mut)]">₹19,800+ Cr siphoned in 2025 across 17.5 Lakh+ complaints</span>
          <span className="hidden sm:inline text-[var(--line)]">|</span>
          <span className="text-[var(--act)] font-bold">1930 Helpline Grounded</span>
        </div>

        {/* Hero Title & Subtitle */}
        <h1 className="hero-anim text-3xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-[var(--ink)] leading-[1.08] mb-4">
          India’s Defensive Cyber Arena.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--act)] to-indigo-500">
            Neutralize Scams Before They Strike.
          </span>
        </h1>

        <p className="hero-anim text-base sm:text-lg text-[var(--mut)] max-w-4xl leading-relaxed mb-6">
          From <strong>₹7.8 Crore Digital Arrests</strong> to <strong>Midnight Electricity Blackouts</strong> and <strong>Telegram VIP Task Traps</strong> — Scam Dojo builds instinctive psychological reflexes against stateful AI adversaries, forensic-inspects suspicious messages, and executes golden-hour recovery protocols.
        </p>

        {/* Main CTA Action Buttons */}
        <div className="hero-anim flex flex-wrap items-center gap-3 mb-8">
          <Link
            to="/train"
            className="dojo-btn flex items-center gap-2 px-6 py-3.5 text-sm sm:text-base font-bold shadow-md hover:scale-[1.02] transition-transform"
          >
            <span>🥋 Enter Dojo Arena (Train)</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <Link
            to="/check"
            className="dojo-btn q flex items-center gap-2 px-6 py-3.5 text-sm sm:text-base font-bold shadow-xs hover:border-[var(--act)] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">search_check</span>
            <span>Scan Suspicious Threat (Check)</span>
          </Link>
          <Link
            to="/recover"
            className="px-4 py-3 rounded-xl border border-red-500/30 text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">emergency</span>
            <span>1930 Emergency Triage</span>
          </Link>
        </div>

        {/* Instant Reflex Stance Card */}
        <div className="hero-anim bg-gradient-to-br from-[var(--sf)] to-[var(--sf2)]/50 border border-[var(--line)] rounded-3xl p-5 sm:p-6 shadow-dojo max-w-4xl">
          <div className="flex items-center justify-between text-xs text-[var(--mut)] font-semibold mb-3">
            <span className="bg-[var(--sf2)] px-2.5 py-1 rounded-md font-mono text-[var(--ink)]">
              ORN-BNK
            </span>
            <span>Received 2 mins ago</span>
          </div>

          <p className="text-sm sm:text-base text-[var(--ink)] font-medium leading-relaxed mb-4">
            &ldquo;Your KYC verification has expired today. Your bank account will be blocked within 2 hours. Update immediately at <span className="text-[var(--act)] underline underline-offset-2 font-mono">http://sbi-netbanking-verify.in/kyc</span> or contact Verification Officer at +91 98712 43901 (sbi.verification@gmall.com).&rdquo;
          </p>

          <div className="text-xs font-bold text-[var(--mut)] mb-2 uppercase tracking-wide">
            Choose Your Immediate Defensive Stance:
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setChoice("tap")}
              className={`dojo-btn text-xs sm:text-sm py-2 px-4 cursor-pointer ${
                choice === "tap" ? "ring-2 ring-[var(--act)] ring-offset-2" : choice ? "opacity-70" : ""
              }`}
            >
              Tap the link
            </button>
            <button
              type="button"
              onClick={() => setChoice("ign")}
              className={`dojo-btn q text-xs sm:text-sm py-2 px-4 cursor-pointer ${
                choice === "ign" ? "ring-2 ring-[var(--act)] ring-offset-2 font-bold" : choice ? "opacity-70" : ""
              }`}
            >
              Ignore it
            </button>
            <button
              type="button"
              onClick={() => setChoice("chk")}
              className={`dojo-btn q text-xs sm:text-sm py-2 px-4 cursor-pointer ${
                choice === "chk" ? "ring-2 ring-[var(--act)] ring-offset-2 font-bold" : choice ? "opacity-70" : ""
              }`}
            >
              Inspect for fraud
            </button>
          </div>

          {selectedOutcome && (
            <div className="mt-4 p-4 rounded-2xl bg-[var(--sf)] border border-[var(--line)] animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs sm:text-sm text-[var(--ink)] font-medium leading-relaxed">
                {selectedOutcome.text}
              </p>
              <button
                type="button"
                onClick={selectedOutcome.action}
                className="dojo-btn mt-3 w-full sm:w-auto text-xs sm:text-sm py-2 px-4"
              >
                {selectedOutcome.btnText} →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. FIVE-YEAR CRIME TELEMETRY CHARTS (2020-2025) */}
      <ScamStatisticsCharts />

      {/* 3. INTERACTIVE REACT SIMPLE MAP FOR INDIA (STATE-WISE SCAM HEATMAP) */}
      <IndiaScamMap />

      {/* 4. MULTI-SCENARIO 3-MODAL SLIDESHOW (CHAT, VOICE, VIDEO) + ROUGH NOTATION */}
      <InteractiveScammerShowcase />

      {/* 4. REAL JOURNALISTIC NEWSPAPER HEADLINES & CASE STUDIES */}
      <NewspaperHeadlines />

      {/* 5. THE 3 CORE MODES BREAKDOWN */}
      <section className="my-14">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--act)]">
            A Complete Defensive Loop
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--ink)] tracking-tight mt-1">
            How Scam Dojo Protects You at Every Stage
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Train Tile */}
          <Link
            to="/train"
            className="dojo-tile group hover:no-underline flex flex-col justify-between p-6 rounded-3xl bg-[var(--sf)] border border-[var(--line)] shadow-dojo hover:border-[var(--act)] transition-all"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[var(--act)]/10 text-[var(--act)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">sports_martial_arts</span>
              </div>
              <span className="text-[11px] font-bold text-[var(--act)] uppercase tracking-wider">
                Stage 1: Before The Threat
              </span>
              <h3 className="text-xl font-bold font-display text-[var(--ink)] mt-1 mb-2">
                Train
              </h3>
              <p className="text-xs sm:text-sm text-[var(--mut)] leading-relaxed">
                Practice against 7 specialized Google ADK agents in 3 immersion modes (Chat, Audio Phone Call, and Video Call). Progress from White Belt to 5th Dan Black Belt.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--line)]/60 text-xs font-bold text-[var(--act)] flex items-center gap-1">
              <span>Launch Dojo Arena</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </Link>

          {/* Check Tile */}
          <Link
            to="/check"
            className="dojo-tile group hover:no-underline flex flex-col justify-between p-6 rounded-3xl bg-[var(--sf)] border border-[var(--line)] shadow-dojo hover:border-[var(--act)] transition-all"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">document_scanner</span>
              </div>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Stage 2: During The Threat
              </span>
              <h3 className="text-xl font-bold font-display text-[var(--ink)] mt-1 mb-2">
                Check
              </h3>
              <p className="text-xs sm:text-sm text-[var(--mut)] leading-relaxed">
                Upload screenshots or suspicious texts. Get an instant 0–100 ScamScore™, forensic red flags, 1080x1080 WhatsApp warning posters, and convert threats into drills with Scenario Forge.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--line)]/60 text-xs font-bold text-[var(--act)] flex items-center gap-1">
              <span>Scan Message or Screenshot</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </Link>

          {/* Recover Tile */}
          <Link
            to="/recover"
            className="dojo-tile group hover:no-underline flex flex-col justify-between p-6 rounded-3xl bg-[var(--sf)] border border-[var(--line)] shadow-dojo hover:border-[var(--bad)] transition-all"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">emergency_home</span>
              </div>
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Stage 3: After An Incident
              </span>
              <h3 className="text-xl font-bold font-display text-[var(--ink)] mt-1 mb-2">
                Recover
              </h3>
              <p className="text-xs sm:text-sm text-[var(--mut)] leading-relaxed">
                Golden-Hour emergency triage under 2 hours: 1-click 1930 Cyber Helpline dialer, RBI-compliant bank dispute notices, evidence dossier generators, and 24x7 bank freeze directories.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--line)]/60 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
              <span>Emergency 1930 Triage</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Guarantee & Helpline Footer Bar */}
      <div className="p-4 bg-[var(--sf2)] border border-[var(--line)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--mut)]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-emerald-600 dark:text-emerald-400">verified_user</span>
          <span className="font-medium">
            Zero PII retention policy. Only fictional data used during drills.
          </span>
        </div>
        <div className="flex items-center gap-4 font-bold">
          <a href="tel:1930" className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">call</span>
            <span>National Helpline: 1930</span>
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--act)] hover:underline"
          >
            cybercrime.gov.in ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
