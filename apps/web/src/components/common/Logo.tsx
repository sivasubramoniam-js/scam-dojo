import React from "react";
import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-[var(--ink)] hover:opacity-90 transition-opacity ${className}`}
    >
      {/* Belt Knot SVG mark */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[var(--action)] shrink-0"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="7"
          width="18"
          height="6"
          rx="3"
          transform="rotate(15 3 7)"
          fill="currentColor"
        />
        <rect
          x="7"
          y="19"
          width="18"
          height="6"
          rx="3"
          transform="rotate(-25 7 19)"
          fill="currentColor"
          fillOpacity="0.8"
        />
        <circle cx="14" cy="14" r="3.5" fill="var(--bg)" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight">Scam Dojo</span>
    </Link>
  );
}
