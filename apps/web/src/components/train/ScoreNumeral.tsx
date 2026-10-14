"use client";

import React, { useEffect, useState } from "react";

interface ScoreNumeralProps {
  value: number;
  from?: number;
  label?: string;
}

export function ScoreNumeral({ value, from = 0, label }: ScoreNumeralProps) {
  const [current, setCurrent] = useState(from);

  useEffect(() => {
    // Check reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setCurrent(value);
      return;
    }

    const duration = 1200; // ms
    const steps = 30;
    const stepTime = duration / steps;
    const increment = (value - from) / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      if (stepCount >= steps) {
        setCurrent(value);
        clearInterval(timer);
      } else {
        setCurrent(Math.round(from + increment * stepCount));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, from]);

  return (
    <div className="flex flex-col items-center justify-center">
      <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-[var(--accent)] tabular-nums">
        {current}
      </span>
      {label && (
        <span className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mt-1">
          {label}
        </span>
      )}
    </div>
  );
}
