"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Scenario, CreateSessionResponse } from "@/lib/types";
import { ScenarioCard } from "@/components/train/ScenarioCard";
import { PiiNotice } from "@/components/train/PiiNotice";
import { Swords, Sparkles, Loader2, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function TrainPickerPage() {
  const router = useRouter();
  const { language } = useI18n();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [difficulty, setDifficulty] = useState<string>("auto");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchScenarios() {
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ items: Scenario[] }>(`/v1/scenarios?lang=${language}`);
        if (mounted) {
          setScenarios(res.items);
          const defaultScen = res.items.find((s) => s.recommended && !s.locked) || res.items.find((s) => !s.locked);
          setSelectedScenario(defaultScen || null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Failed to load practice scenarios");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchScenarios();
    return () => {
      mounted = false;
    };
  }, [language]);

  const handleStart = async () => {
    if (!selectedScenario || starting) return;
    setStarting(true);
    setError(null);
    try {
      const diffPayload = difficulty === "auto" ? "auto" : parseInt(difficulty, 10);
      const res = await api<CreateSessionResponse>("/v1/train/sessions", {
        method: "POST",
        json: {
          scenarioSlug: selectedScenario.slug,
          difficulty: diffPayload,
          lang: language,
        },
      });
      router.push(`/train/play?sid=${res.sessionId}`);
    } catch (err: any) {
      setError(err.message || "Failed to start drill session");
      setStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold tracking-wider uppercase text-[var(--accent)]">
          <Swords className="w-4 h-4" />
          <span>Train Mode • Tatami Drills</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)] mb-2">
          {language === "hi" ? "स्कैम ट्रेनिंग सिमुलेशन" : "Scam Resistance Drills"}
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
          {language === "hi"
            ? "वास्तविक भारतीय फ्रॉड परिदृश्यों के विरुद्ध अपनी सजगता का परीक्षण करें। हमारे AI स्कैमर के दबाव का सामना करें और समझें कि जालसाज आपकी भावनाओं का लाभ कैसे उठाते हैं।"
            : "Face adaptive scam tactics in a realistic, zero-risk simulation. Our AI adversary will test your boundaries using psychological pressure, urgency, and authority."}
        </p>
      </div>

      {/* PII Shield Notice */}
      <PiiNotice />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs">Loading dojo scenarios...</p>
        </div>
      ) : (
        <>
          {/* Scenario Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scenarios.map((scen) => (
              <ScenarioCard
                key={scen.slug}
                scenario={scen}
                selected={selectedScenario?.slug === scen.slug}
                onSelect={setSelectedScenario}
              />
            ))}
          </div>

          {/* Configuration & Action Bar */}
          {selectedScenario && !selectedScenario.locked && (
            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-bold text-[var(--text)] shrink-0 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Difficulty:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { val: "auto", label: "Auto (Recommended)" },
                    { val: "1", label: "1 — Novice" },
                    { val: "2", label: "2 — Easy" },
                    { val: "3", label: "3 — Standard" },
                    { val: "4", label: "4 — Skilled" },
                    { val: "5", label: "5 — Master" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setDifficulty(opt.val)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                        difficulty === opt.val
                          ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs"
                          : "bg-[var(--canvas)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={starting}
                className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 disabled:opacity-50 transition-all cursor-pointer shadow-md shrink-0"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing Tatami...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Enter Tatami Drill</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
