import React from "react";
import { useT } from "@/lib/i18n";

interface BeltProps {
  belt: "white" | "yellow" | "orange" | "green" | "blue" | "brown" | "black" | string;
  progress?: number; // 0 to 1
  className?: string;
}

export function Belt({ belt, progress = 0.5, className = "" }: BeltProps) {
  const { t } = useT();
  const beltColors: Record<string, string> = {
    white: "bg-belt-white text-ink-aizome border-line-ito",
    yellow: "bg-belt-yellow text-action-ink border-transparent",
    orange: "bg-belt-orange text-action-ink border-transparent",
    green: "bg-belt-green text-action-ink border-transparent",
    blue: "bg-belt-blue text-action-ink border-transparent",
    brown: "bg-belt-brown text-action-ink border-transparent",
    black: "bg-belt-black text-action-ink border-transparent",
  };

  const colorClass = beltColors[belt.toLowerCase()] || beltColors.green;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${colorClass}`}>
          {belt} {t("nav.belt")}
        </span>
        <span className="font-mono text-xs font-bold text-ink-aizome">
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="h-2 w-full bg-surface-hanshi rounded-full overflow-hidden border border-line-ito/40">
        <div
          className="h-full bg-action-ai rounded-full transition-all duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

export default Belt;
