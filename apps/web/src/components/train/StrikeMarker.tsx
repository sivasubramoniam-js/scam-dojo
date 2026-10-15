import React from "react";

interface StrikeMarkerProps {
  result: "blocked" | "landed" | "neutral";
  className?: string;
}

export function StrikeMarker({ result, className = "" }: StrikeMarkerProps) {
  const configs = {
    blocked: {
      label: "Blocked",
      icon: "shield",
      color: "text-safe-matcha bg-safe-matcha/10 border-safe-matcha/30",
    },
    landed: {
      label: "Landed",
      icon: "close",
      color: "text-danger-beni bg-danger-beni/10 border-danger-beni/30",
    },
    neutral: {
      label: "Neutral",
      icon: "remove",
      color: "text-ink-sumi bg-surface-hanshi border-line-ito/50",
    },
  };

  const c = configs[result] || configs.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${c.color} ${className}`}
    >
      <span className="material-symbols-outlined text-[15px]">{c.icon}</span>
      <span>{c.label}</span>
    </span>
  );
}

export default StrikeMarker;
