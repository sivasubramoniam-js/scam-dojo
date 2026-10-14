"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords, ShieldAlert, LifeBuoy, Award } from "lucide-react";
import { useT } from "@/lib/i18n";

export function BottomTabs() {
  const pathname = usePathname();
  const { t } = useT();

  const tabs = [
    { href: "/train", label: t("nav.train"), icon: Swords, active: pathname.startsWith("/train") },
    { href: "/check", label: t("nav.check"), icon: ShieldAlert, active: pathname.startsWith("/check") },
    { href: "/recover", label: t("nav.recover"), icon: LifeBuoy, active: pathname.startsWith("/recover") },
    { href: "/dashboard", label: t("nav.dashboard"), icon: Award, active: pathname.startsWith("/dashboard") },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] border-t border-[var(--line)] shadow-lg transition-colors pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors ${
                tab.active
                  ? "text-[var(--action)] font-bold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
              aria-current={tab.active ? "page" : undefined}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${tab.active ? "stroke-[2.2]" : "stroke-[1.75]"}`} />
                {tab.active && (
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--action)]"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
