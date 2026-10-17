import React from "react";
import { useT } from "@/lib/i18n";

interface ScoreNumeralProps {
  value: number;
  label?: string;
  className?: string;
}

export function ScoreNumeral({ value, label, className = "" }: ScoreNumeralProps) {
  const { t } = useT();
  const displayLabel = label ?? t("hud.score");

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <span className="font-score text-4xl sm:text-5xl font-extrabold text-ink-aizome tracking-tight">
        {value}
      </span>
      {displayLabel && (
        <span className="font-label-sm text-xs font-semibold text-ink-sumi uppercase tracking-wider mt-1">
          {displayLabel}
        </span>
      )}
    </div>
  );
}

export default ScoreNumeral;
