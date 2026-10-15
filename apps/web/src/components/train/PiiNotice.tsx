import React from "react";

export function PiiNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 p-3 bg-surface-container-low border border-line-ito/50 rounded-xl text-xs text-ink-sumi ${className}`}>
      <span className="material-symbols-outlined text-safe-matcha text-[18px] shrink-0">
        verified_user
      </span>
      <div>
        <span className="font-bold text-ink-aizome mr-1">Privacy Shield Active:</span>
        <span>Zero PII stored. Personal phone numbers and financial details are anonymized in-memory.</span>
      </div>
    </div>
  );
}

export default PiiNotice;
