"use client";

import React from "react";
import { Tactic } from "@/lib/types";

interface TacticBarsProps {
  tacticsFelt: Partial<Record<Tactic, number>>;
}

const TACTIC_LABELS: Record<Tactic, string> = {
  urgency: "Urgency",
  authority: "Authority",
  fear: "Fear & Threat",
  greed: "Greed & Rewards",
  trust: "False Trust",
  isolation: "Isolation",
};

export function TacticBars({ tacticsFelt }: TacticBarsProps) {
  const allTactics: Tactic[] = ["urgency", "authority", "fear", "greed", "trust", "isolation"];

  return (
    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
        Tactics Encountered
      </h4>

      <div className="space-y-2.5">
        {allTactics.map((tac) => {
          const value = tacticsFelt[tac] ?? 0;
          const pct = Math.min(100, (value / 5) * 100);

          return (
            <div key={tac} className="text-xs">
              <div className="flex justify-between items-center mb-1 text-[var(--text)]">
                <span className="font-medium">{TACTIC_LABELS[tac]}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {value}/5
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
