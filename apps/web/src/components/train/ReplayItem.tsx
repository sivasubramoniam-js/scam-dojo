"use client";

import React, { useState } from "react";
import { ReplayMoment } from "@/lib/types";
import { StrikeMarker } from "./StrikeMarker";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

interface ReplayItemProps {
  moment: ReplayMoment;
  defaultOpen?: boolean;
}

export function ReplayItem({ moment, defaultOpen = false }: ReplayItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-[var(--border)] rounded-xl bg-[var(--surface)] overflow-hidden transition-all shadow-xs">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-start justify-between gap-4 text-left hover:bg-[var(--surface-muted)]/50 cursor-pointer transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
              Move #{moment.turnIndex}
            </span>
            <StrikeMarker result={moment.result} />
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)] capitalize">
              {moment.tactic}
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted)] line-clamp-1 italic mb-1">
            &ldquo;{moment.scammerLine}&rdquo;
          </p>

          {moment.userLine && (
            <p className="text-xs font-medium text-[var(--text)] line-clamp-1">
              You: &ldquo;{moment.userLine}&rdquo;
            </p>
          )}
        </div>

        <div className="p-1 rounded-lg text-[var(--text-muted)]">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]/50 text-xs space-y-3 bg-[var(--canvas)]/40">
          <div>
            <span className="font-semibold text-[var(--text)] block mb-0.5">What happened:</span>
            <p className="text-[var(--text-muted)] leading-relaxed">{moment.whatHappened}</p>
          </div>

          {moment.betterReply && (
            <div className="p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20 text-[var(--text)]">
              <span className="font-semibold text-[var(--accent)] flex items-center gap-1.5 mb-1 text-[11px]">
                <Lightbulb className="w-3.5 h-3.5" />
                A stronger reply:
              </span>
              <p className="italic text-xs font-medium text-[var(--text)]">
                &ldquo;{moment.betterReply}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
