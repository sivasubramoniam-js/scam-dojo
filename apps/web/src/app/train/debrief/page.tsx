"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { EndSessionResponse } from "@/lib/types";
import { Belt } from "@/components/train/Belt";
import { ScoreNumeral } from "@/components/train/ScoreNumeral";
import { ReplayList } from "@/components/train/ReplayList";
import { TacticBars } from "@/components/train/TacticBars";
import {
  Trophy,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  List,
  Sparkles,
  BookOpen,
  Loader2,
} from "lucide-react";

const SENSEI_THOUGHTS = [
  "Replaying the conversation...",
  "Marking where psychological pressure landed...",
  "Evaluating independent verification attempts...",
  "Choosing your next defense drill...",
];

function DebriefContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");

  const [endData, setEndData] = useState<EndSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Rotating loading message
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % SENSEI_THOUGHTS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!sid) {
      setError("No session ID specified");
      setLoading(false);
      return;
    }

    let active = true;
    async function fetchDebrief() {
      try {
        const res = await api<EndSessionResponse>(`/v1/train/sessions/${sid}/end`, {
          method: "POST",
          json: {},
        });
        if (active) {
          setEndData(res);
        }
      } catch (err: any) {
        if (active) setError(err.message || "Failed to finalize debrief");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDebrief();
    return () => {
      active = false;
    };
  }, [sid]);

  if (loading) {
    return (
      <div className="py-24 max-w-md mx-auto flex flex-col items-center justify-center text-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
        <h3 className="text-base font-bold text-[var(--text)]">Sensei is Reviewing...</h3>
        <p className="text-xs text-[var(--text-muted)] animate-pulse font-medium min-h-[1.5rem]">
          {SENSEI_THOUGHTS[thoughtIndex]}
        </p>
      </div>
    );
  }

  if (error || !endData) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-4">
        <div className="text-rose-500 font-bold text-sm">Debrief Error</div>
        <p className="text-xs text-[var(--text-muted)]">{error || "Could not load debrief."}</p>
        <button
          onClick={() => router.push("/train")}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold cursor-pointer"
        >
          Return to Drills
        </button>
      </div>
    );
  }

  const { debrief, score, belt, outcome, nextDrill } = endData;

  const isWon = outcome === "user_won";
  const isWalked = outcome === "walked_away";

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Top Replay Headline */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
          {isWon ? (
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> Victory: Boundaries Held
            </span>
          ) : isWalked ? (
            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Disengaged Safely
            </span>
          ) : (
            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Defense Breached
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)]">
          {debrief.headline}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
          {debrief.summary}
        </p>
      </div>

      {/* Score & Belt Card */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {/* Score count-up */}
        <div className="flex flex-col items-center justify-center p-4 border-b sm:border-b-0 sm:border-r border-[var(--border)]">
          <ScoreNumeral value={score.final} label="Resilience Score" />

          {/* Breakdown pills */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-4 text-[10px] text-[var(--text-muted)] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">Outcome: +{score.outcomePoints}</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">Flags: +{score.flagPoints}</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">Verify: +{score.verifyPoints}</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">Data: +{score.dataPoints}</span>
            {score.coachAdj !== 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--accent)]">
                Sensei: {score.coachAdj > 0 ? `+${score.coachAdj}` : score.coachAdj}
              </span>
            )}
          </div>
        </div>

        {/* Belt progression */}
        <div className="flex flex-col items-center justify-center p-2">
          <Belt belt={belt.after} progress={belt.progress} animate={belt.changed} size="lg" />
          {belt.changed && (
            <span className="mt-2 text-xs font-bold text-[var(--matcha)] animate-bounce">
              Belt Promotion Achieved!
            </span>
          )}
        </div>
      </div>

      {/* Replay Moves List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
            <List className="w-4 h-4 text-[var(--accent)]" />
            <span>Turn-by-Turn Replay</span>
          </h3>
          <span className="text-xs text-[var(--text-muted)]">Tap to inspect moves</span>
        </div>
        <ReplayList moments={debrief.moments} />
      </div>

      {/* Tactics Breakdown */}
      <TacticBars tacticsFelt={debrief.tacticsFelt} />

      {/* Sensei 3 Lessons */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-[var(--matcha)]" />
          <span>Sensei Lessons to Remember</span>
        </h3>
        <ul className="space-y-2">
          {debrief.lessons.map((lesson, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs text-[var(--text)] leading-relaxed p-2.5 rounded-lg bg-[var(--surface-muted)]/60 border border-[var(--border)]/40"
            >
              <span className="w-5 h-5 rounded-full bg-[var(--matcha)]/15 text-[var(--matcha)] font-bold text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span>{lesson}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <button
          onClick={() => router.push("/train")}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer transition-colors"
        >
          Back to All Drills
        </button>

        <button
          onClick={() => router.push(`/train?drill=${nextDrill.slug}`)}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-xs cursor-pointer transition-opacity"
        >
          <span>Next Recommended Drill</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function DebriefPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <DebriefContent />
    </Suspense>
  );
}
