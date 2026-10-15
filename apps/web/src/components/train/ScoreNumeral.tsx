import React from "react";

interface ScoreNumeralProps {
  value: number;
  label?: string;
  className?: string;
}

export function ScoreNumeral({ value, label = "Dojo Score", className = "" }: ScoreNumeralProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <span className="font-score text-4xl sm:text-5xl font-extrabold text-ink-aizome tracking-tight">
        {value}
      </span>
      {label && (
        <span className="font-label-sm text-xs font-semibold text-ink-sumi uppercase tracking-wider mt-1">
          {label}
        </span>
      )}
    </div>
  );
}

export default ScoreNumeral;
