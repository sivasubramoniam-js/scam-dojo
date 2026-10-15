import React, { useState, useEffect } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { fetchMe, UserProfile } from "@/lib/api";

export function HomePage() {
  const router = useRouter();
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
  }, []);

  const outcomes = {
    tap: {
      text: "That link would ask for your OTP or download an APK. Want to see how it plays out in a realistic drill?",
      btnText: "Start practice drill",
      action: () => router.push("/train"),
    },
    ign: {
      text: "Good instinct. Scammers often follow up with an urgent phone call when SMS is ignored. See how they react:",
      btnText: "Practice follow-up call",
      action: () => router.push("/train"),
    },
    chk: {
      text: "Smart move! Paste any message you doubt into our inspector to reveal hidden red flags and risk scores.",
      btnText: "Analyze this message",
      action: () => router.push("/check"),
    },
  };

  const selectedOutcome = choice ? outcomes[choice] : null;

  return (
    <div className="pt-6 pb-8">
      {/* Hero Section */}
      <div className="relative py-4">
        {/* Live Backend Connection Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--sf)] border border-[var(--line)] rounded-full text-xs font-semibold text-[var(--ink)] mb-3 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[var(--safe)] animate-pulse"></span>
          <span>Live Backend:</span>
          <span className="capitalize font-bold text-[var(--act)]">{userProfile.belt} belt</span>
          <span className="text-[var(--mut)]">({userProfile.resilienceScore} pts · {userProfile.streakDays}d streak)</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-[var(--ink)] leading-[1.05] mb-2">
          Practice getting scammed.
          <br />
          <span className="text-[var(--act)]">Safely.</span>
        </h1>
        <p className="text-[var(--mut)] text-base sm:text-lg max-w-xl">
          Build instinct and calm against real cyber fraud. Test your reflexes in under 3 minutes before your money is on the line.
        </p>

        {/* SMS Card Simulation */}
        <div className="mt-6 mb-4 bg-[var(--sf)] border border-[var(--line)] rounded-2xl rounded-bl-sm p-4 sm:p-5 shadow-dojo max-w-lg">
          <div className="flex items-center justify-between text-xs text-[var(--mut)] font-semibold mb-2">
            <span className="bg-[var(--sf2)] px-2 py-0.5 rounded font-mono text-[var(--ink)]">ORN-BNK</span>
            <span>Just now</span>
          </div>
          <p className="text-base text-[var(--ink)] font-medium leading-relaxed">
            Your KYC expires today. Your account will be blocked. Update now: <span className="text-[var(--act)] underline underline-offset-2">orion-kyc.example/u</span> and share the OTP you receive.
          </p>
        </div>

        {/* Quick Reaction Stances */}
        <div className="flex flex-wrap gap-2.5 max-w-lg">
          <button
            type="button"
            onClick={() => setChoice("tap")}
            className={`dojo-btn ${choice === "tap" ? "ring-2 ring-[var(--act)] ring-offset-2" : choice ? "opacity-70" : ""}`}
          >
            Tap the link
          </button>
          <button
            type="button"
            onClick={() => setChoice("ign")}
            className={`dojo-btn q ${choice === "ign" ? "ring-2 ring-[var(--act)] ring-offset-2 font-bold" : choice ? "opacity-70" : ""}`}
          >
            Ignore it
          </button>
          <button
            type="button"
            onClick={() => setChoice("chk")}
            className={`dojo-btn q ${choice === "chk" ? "ring-2 ring-[var(--act)] ring-offset-2 font-bold" : choice ? "opacity-70" : ""}`}
          >
            Check if it's real
          </button>
        </div>

        {/* Dynamic Outcome Slide-Up */}
        {selectedOutcome && (
          <div className="mt-4 bg-[var(--sf)] border border-[var(--line)] rounded-xl p-4 max-w-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-sm sm:text-base text-[var(--ink)] font-medium leading-normal">
              {selectedOutcome.text}
            </p>
            <button
              type="button"
              onClick={selectedOutcome.action}
              className="dojo-btn mt-3 w-full sm:w-auto"
            >
              {selectedOutcome.btnText} →
            </button>
          </div>
        )}
      </div>

      {/* Mode Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8">
        {/* Train Tile */}
        <Link
          to="/train"
          className="dojo-tile group hover:no-underline"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--sf2)] flex items-center justify-center text-[var(--act)] mb-3 group-hover:scale-105 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 20 20 4M9 4l11 11M4 9l11 11" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-1">Train</h3>
            <p className="text-xs sm:text-sm text-[var(--mut)] leading-snug">
              Practice against a realistic scammer in real-time.
            </p>
          </div>
        </Link>

        {/* Check Tile */}
        <Link
          to="/check"
          className="dojo-tile group hover:no-underline"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--sf2)] flex items-center justify-center text-[var(--act)] mb-3 group-hover:scale-105 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-1">Check</h3>
            <p className="text-xs sm:text-sm text-[var(--mut)] leading-snug">
              Not sure about a message? We'll inspect it for fraud patterns.
            </p>
          </div>
        </Link>

        {/* Recover Tile */}
        <Link
          to="/recover"
          className="dojo-tile group hover:no-underline"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--sf2)] flex items-center justify-center text-[var(--bad)] mb-3 group-hover:scale-105 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-1">Recover</h3>
            <p className="text-xs sm:text-sm text-[var(--mut)] leading-snug">
              Already paid or clicked? Follow emergency action steps.
            </p>
          </div>
        </Link>
      </div>

      {/* Zero PII Notice & Guarantee */}
      <div className="mt-8 p-3.5 bg-[var(--sf2)] border border-[var(--line)] rounded-xl flex items-center justify-between text-xs text-[var(--mut)]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--safe)]">verified_user</span>
          <span>Zero PII retention guaranteed. Never type real OTPs or PINs.</span>
        </div>
        <a href="tel:1930" className="text-[var(--bad)] font-bold hover:underline">
          1930 Helpline
        </a>
      </div>
    </div>
  );
}

export default HomePage;
