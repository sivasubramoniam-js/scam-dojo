"use client";

import React from "react";
import { Sparkles, PhoneOff, Building2, HelpCircle } from "lucide-react";

interface QuickRepliesProps {
  onSelect: (reply: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ onSelect, disabled = false }: QuickRepliesProps) {
  const suggestions = [
    { text: "I will call my bank helpline directly to verify.", icon: Building2 },
    { text: "No real bank asks for OTP. I am hanging up.", icon: PhoneOff },
    { text: "Who is your supervisor? What is your employee ID?", icon: HelpCircle },
    { text: "I did not request any refund or KYC update.", icon: Sparkles },
  ];

  if (disabled) return null;

  return (
    <div className="px-4 py-2 bg-[var(--surface-muted)]/50 border-t border-[var(--border)] overflow-x-auto no-scrollbar flex items-center gap-2">
      <span className="text-[11px] font-semibold text-[var(--text-muted)] shrink-0 flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-[var(--accent)]" />
        Quick Moves:
      </span>
      {suggestions.map((s, idx) => {
        const Icon = s.icon;
        return (
          <button
            key={idx}
            onClick={() => onSelect(s.text)}
            className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text)] border border-[var(--border)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Icon className="w-3 h-3 text-[var(--text-muted)]" />
            <span>{s.text}</span>
          </button>
        );
      })}
    </div>
  );
}
