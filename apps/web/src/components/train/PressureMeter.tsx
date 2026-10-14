"use client";

import React from "react";

interface PressureMeterProps {
  tension: number; // 0 to 10
}

export function PressureMeter({ tension }: PressureMeterProps) {
  const clamped = Math.max(0, Math.min(10, tension));

  // Determine stage and color category
  let levelLabel = "Low";
  let statusColor = "text-[var(--matcha)]";
  if (clamped >= 7) {
    levelLabel = "Critical";
    statusColor = "text-[var(--beni)]";
  } else if (clamped >= 4) {
    levelLabel = "Medium";
    statusColor = "text-[var(--kihada)]";
  }

  return (
    <div
      role="meter"
      aria-label="Psychological pressure meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={10}
      className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xs"
    >
      <div className="flex items-center justify-between mb-1.5 text-xs font-medium">
        <span className="text-[var(--text-muted)] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse bg-current opacity-80" />
          Pressure Meter
        </span>
        <span className={`font-semibold ${statusColor}`}>
          {clamped}/10 — {levelLabel}
        </span>
      </div>

      {/* 10 discrete segments */}
      <div className="grid grid-cols-10 gap-1 h-2.5">
        {Array.from({ length: 10 }).map((_, idx) => {
          const active = idx < clamped;
          let segmentBg = "bg-[var(--border)] opacity-40";

          if (active) {
            if (idx < 4) {
              segmentBg = "bg-[var(--matcha)] shadow-[0_0_6px_var(--matcha)]";
            } else if (idx < 7) {
              segmentBg = "bg-[var(--kihada)] shadow-[0_0_6px_var(--kihada)]";
            } else {
              segmentBg = "bg-[var(--beni)] shadow-[0_0_6px_var(--beni)]";
            }
          }

          return (
            <div
              key={idx}
              className={`rounded-xs transition-all duration-300 ${segmentBg}`}
            />
          );
        })}
      </div>
    </div>
  );
}
