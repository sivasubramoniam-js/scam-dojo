import React from "react";
import { Link } from "react-router-dom";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 group ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-surface-hanshi border border-line-ito/50 flex items-center justify-center shrink-0 text-ink-aizome transition-transform group-hover:scale-105">
        {/* Belt knot glyph */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-action-ai">
          <circle cx="12" cy="12" r="3" />
          <path d="M7 12H3a2 2 0 0 0-2 2v2" />
          <path d="M17 12h4a2 2 0 0 1 2 2v2" />
          <path d="M10 15l-3 6" />
          <path d="M14 15l3 6" />
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-headline-sm text-lg font-bold text-ink-aizome tracking-tight">
          Scam Dojo
        </span>
        <span className="text-[11px] font-semibold text-ink-sumi bg-surface-hanshi border border-line-ito/40 px-1.5 py-0.5 rounded-full">
          道場
        </span>
      </div>
    </Link>
  );
}

export default Logo;
