"use client";

import React from "react";
import { MessageSquare, PhoneCall, Mail, Smartphone, Lock, Award, Clock, ArrowRight } from "lucide-react";
import { Scenario } from "@/lib/types";

interface ScenarioCardProps {
  scenario: Scenario;
  selected: boolean;
  onSelect: (scenario: Scenario) => void;
}

export function ScenarioCard({ scenario, selected, onSelect }: ScenarioCardProps) {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "chat":
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case "call":
        return <PhoneCall className="w-4 h-4 text-rose-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-sky-500" />;
      default:
        return <Smartphone className="w-4 h-4 text-amber-500" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "chat":
        return "Chat App";
      case "call":
        return "Voice Call";
      case "email":
        return "Email";
      default:
        return "Phone / SMS";
    }
  };

  return (
    <div
      onClick={() => !scenario.locked && onSelect(scenario)}
      className={`group relative p-5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
        scenario.locked
          ? "opacity-60 bg-[var(--surface-muted)] border-[var(--border)] cursor-not-allowed"
          : selected
          ? "bg-[var(--surface)] border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-md cursor-pointer"
          : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/50 hover:shadow-sm cursor-pointer"
      }`}
    >
      <div>
        {/* Top badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">
            {getChannelIcon(scenario.channel)}
            <span>{getChannelLabel(scenario.channel)}</span>
          </div>

          <div className="flex items-center gap-2">
            {scenario.recommended && !scenario.locked && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--matcha)] text-white shadow-xs">
                Recommended
              </span>
            )}
            {scenario.custom && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--indigo)] text-white">
                Custom
              </span>
            )}
            {scenario.locked && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                <Lock className="w-3 h-3" />
                {scenario.lockedReason || "Locked"}
              </span>
            )}
          </div>
        </div>

        {/* Title & Blurb */}
        <h3 className="text-base font-bold text-[var(--text)] mb-1.5 group-hover:text-[var(--accent)] transition-colors">
          {scenario.title}
        </h3>
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-4">
          {scenario.blurb}
        </p>
      </div>

      {/* Footer metadata */}
      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>~{scenario.estMinutes}m</span>
          </div>

          {/* Difficulty dots (1 to 5) */}
          <div className="flex items-center gap-1" title={`Difficulty: ${scenario.difficultyRange[1]}/5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < scenario.difficultyRange[1] ? "bg-[var(--kihada)]" : "bg-[var(--border)]"
                }`}
              />
            ))}
          </div>
        </div>

        {scenario.bestScore !== undefined && scenario.bestScore !== null && (
          <div className="flex items-center gap-1 font-semibold text-[var(--matcha)]">
            <Award className="w-3.5 h-3.5" />
            <span>Best: {scenario.bestScore}</span>
          </div>
        )}

        {!scenario.locked && (
          <div className={`p-1.5 rounded-full transition-transform ${selected ? "translate-x-0.5 text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
