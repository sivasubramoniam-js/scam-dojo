"use client";

import React from "react";
import { Belt as BeltType } from "@/lib/types";

interface BeltProps {
  belt: BeltType;
  progress?: number; // 0..1 towards next
  animate?: boolean;
  size?: "sm" | "md" | "lg";
}

const BELT_COLORS: Record<BeltType, { bg: string; border: string; text: string }> = {
  white: { bg: "#E5E7EB", border: "#9CA3AF", text: "#374151" },
  yellow: { bg: "#FBBF24", border: "#D97706", text: "#78350F" },
  orange: { bg: "#FB923C", border: "#EA580C", text: "#7C2D12" },
  green: { bg: "#34D399", border: "#059669", text: "#064E3B" },
  blue: { bg: "#60A5FA", border: "#2563EB", text: "#1E3A8A" },
  brown: { bg: "#A16207", border: "#713F12", text: "#FEF3C7" },
  black: { bg: "#18181B", border: "#27272A", text: "#F4F4F5" },
};

export function Belt({ belt, progress, animate = false, size = "md" }: BeltProps) {
  const colors = BELT_COLORS[belt] || BELT_COLORS.white;

  const heightClasses = {
    sm: "h-5 text-[10px]",
    md: "h-8 text-xs",
    lg: "h-11 text-sm font-bold",
  }[size];

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative flex items-center justify-center w-full max-w-[280px] rounded-md shadow-xs border transition-transform ${heightClasses} ${
          animate ? "animate-pulse" : ""
        }`}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        {/* Belt Stitching Line */}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[1px] border-t border-dashed opacity-40 border-current" />

        {/* Center Knot Graphic */}
        <div
          className="relative z-10 px-3 py-0.5 rounded shadow-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          style={{ backgroundColor: colors.border, color: colors.text }}
        >
          <span>{belt} Belt</span>
        </div>
      </div>

      {progress !== undefined && progress >= 0 && belt !== "black" && (
        <div className="w-full max-w-[280px] mt-2">
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1 font-medium">
            <span>Next Belt Progress</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border)]">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
