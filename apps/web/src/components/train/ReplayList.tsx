"use client";

import React from "react";
import { ReplayMoment } from "@/lib/types";
import { ReplayItem } from "./ReplayItem";

interface ReplayListProps {
  moments: ReplayMoment[];
}

export function ReplayList({ moments }: ReplayListProps) {
  if (!moments || moments.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
        No critical moves recorded in this drill.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {moments.map((moment, idx) => (
        <ReplayItem
          key={idx}
          moment={moment}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}
