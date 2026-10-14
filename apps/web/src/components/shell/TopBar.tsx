"use client";

import React from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useT } from "@/lib/i18n";

export function TopBar() {
  const { t } = useT();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md transition-colors">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo />

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/recover"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[999px] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-[var(--caution)]" />
            <span>{t("nav.recover")}</span>
          </Link>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
