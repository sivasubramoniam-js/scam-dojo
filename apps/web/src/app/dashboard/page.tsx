import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchDashboard, DashboardResponse } from "@/lib/api";
import BeltGraphic from "@/components/common/BeltGraphic";
import {
  Flame,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Award,
  History,
  FileCheck2,
  Calendar,
} from "lucide-react";

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then((data) => {
        setDashboard(data);
      })
      .catch(() => {
        // Fallback default
        setDashboard({
          me: {
            uid: "guest",
            belt: "orange",
            resilience: 42,
            streak: { current: 5, best: 7 },
            displayName: "Dojo Student",
          },
          trend: [
            { date: "2026-10-10", score: 65, resilience: 25, sessionId: "ts_1" },
            { date: "2026-10-12", score: 80, resilience: 34, sessionId: "ts_2" },
            { date: "2026-10-14", score: 92, resilience: 42, sessionId: "ts_3" },
          ],
          tactics: [
            { tactic: "urgency", label: "Urgency & Deadlines", weakness: 0.65 },
            { tactic: "authority", label: "Authority & Badges", weakness: 0.40 },
            { tactic: "fear", label: "Account Freeze Fears", weakness: 0.35 },
            { tactic: "greed", label: "Too-Good Offers", weakness: 0.20 },
          ],
          recommendedDrill: {
            slug: "fake_kyc",
            title: "Fake Bank KYC Phishing Trap",
            reason: "Strengthens resistance against urgency and fake authority pretexts.",
          },
          history: [
            { type: "train", id: "ts_1", ts: "2026-10-14", title: "Fake KYC Phishing", badge: "Won" },
            { type: "check", id: "chk_1", ts: "2026-10-14", title: "Electricity Disconnection SMS", badge: "Scam" },
            { type: "recover", id: "rec_1", ts: "2026-10-14", title: "Bank Dispute Action Plan", badge: "4/5 Steps" },
          ],
          checks: { total: 4, likelyScam: 3 },
          recoveries: { total: 1, openSteps: 1 },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const me = dashboard?.me || {};
  const currentBelt = (me.belt || "white").toLowerCase();
  const resilienceScore = typeof me.resilience === "number" ? me.resilience : 42;
  const streakDays = me.streak?.current ?? 3;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          <Award className="w-3.5 h-3.5" />
          Martial Defense Progress
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Your Belt & Resilience Ladder
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Track your progress as you train your instincts, verify suspicious communications, and build permanent behavioral immunity against social engineering.
        </p>
      </div>

      {/* Main Belt Card */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-4">
        {/* Belt Graphic Knot */}
        <div className="w-full max-w-[280px] my-2">
          <BeltGraphic belt={currentBelt} className="w-full h-auto" />
        </div>

        {/* Large Resilience Score Numeral */}
        <div>
          <div className="text-5xl sm:text-6xl font-black text-foreground tracking-tight font-mono">
            {resilienceScore}
          </div>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Resilience Score
          </span>
        </div>

        {/* Belt & Streak Status */}
        <p className="text-sm sm:text-base text-foreground font-semibold">
          <span className="capitalize">{currentBelt}</span> Belt · {streakDays}-Day Practice Streak
        </p>
        <p className="text-xs text-muted-foreground max-w-md">
          Higher belts require consistent victory across diverse attack vectors: refusing OTP requests, verifying independently, and walking away from pressure.
        </p>

        {/* Quick Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/train"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-95 transition shadow"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Enter Training Arena</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/check"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted text-foreground font-bold text-xs hover:bg-muted/80 transition border border-border"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
            <span>Inspect a Message</span>
          </Link>
        </div>
      </div>

      {/* Recommended Next Drill */}
      {dashboard?.recommendedDrill && (
        <div className="p-5 rounded-2xl border border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Recommended Next Drill</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              {dashboard.recommendedDrill.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {dashboard.recommendedDrill.reason}
            </div>
          </div>
          <Link
            to={`/train?slug=${dashboard.recommendedDrill.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition shadow whitespace-nowrap self-start sm:self-auto"
          >
            <span>Start Practice Drill</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Grid: Tactics Sensitivity & Resilience Trend */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tactics Sensitivity Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Tactics Sensitivity Profile</h3>
            <p className="text-xs text-muted-foreground">
              Your susceptibility score to different psychological triggers across recent drills.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {dashboard?.tactics.map((t, idx) => {
              const pct = Math.round(t.weakness * 100);
              return (
                <div key={idx} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-foreground">{t.label}</span>
                    <span className="text-muted-foreground">{pct}% sensitivity</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct > 60 ? "bg-rose-500" : pct > 35 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Stats & Milestones */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Activity Summary</h3>
            <p className="text-xs text-muted-foreground">
              Your defensive history across all three Scam Dojo modules.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Threats Checked</div>
              <div className="text-2xl font-black text-foreground font-mono">
                {dashboard?.checks.total ?? 0}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {dashboard?.checks.likelyScam ?? 0} confirmed scams
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Recovery Plans</div>
              <div className="text-2xl font-black text-foreground font-mono">
                {dashboard?.recoveries.total ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {dashboard?.recoveries.openSteps ?? 0} pending actions
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-2">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Dojo Defense Rules to Internalize:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>No genuine bank asks for your OTP or UPI PIN to credit funds.</li>
              <li>Always disconnect high-pressure calls and dial the number on your card.</li>
              <li>Real government officials never demand payments over video calls.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Unified Activity History */}
      {dashboard?.history && dashboard.history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span>Unified Activity History</span>
          </h3>

          <div className="divide-y divide-border">
            {dashboard.history.slice(0, 10).map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs gap-3">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">{item.title}</div>
                  <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                    <span className="uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-muted">
                      {item.type}
                    </span>
                    <span>{item.ts ? item.ts.slice(0, 10) : "Recent"}</span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    item.badge === "Won" || item.badge === "Safe"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : item.badge === "Fell" || item.badge === "Scam"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
