"use client";

import React from "react";
import { useT } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useT();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className="inline-flex items-center rounded-[10px] border border-[var(--line)] p-0.5 bg-[var(--surface)] text-sm font-medium"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-[8px] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
          lang === "en"
            ? "bg-[var(--action)] text-[var(--action-ink)] font-semibold shadow-xs"
            : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
        }`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        className={`px-2.5 py-1 rounded-[8px] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
          lang === "hi"
            ? "bg-[var(--action)] text-[var(--action-ink)] font-semibold shadow-xs"
            : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
        }`}
        aria-pressed={lang === "hi"}
      >
        हिन्दी
      </button>
    </div>
  );
}
