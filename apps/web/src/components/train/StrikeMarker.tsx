"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, Minus } from "lucide-react";

interface StrikeMarkerProps {
  result: "landed" | "blocked" | "neutral";
}

export function StrikeMarker({ result }: StrikeMarkerProps) {
  if (result === "blocked") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Blocked</span>
      </span>
    );
  }

  if (result === "landed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Landed</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">
      <Minus className="w-3.5 h-3.5" />
      <span>Neutral</span>
    </span>
  );
}
