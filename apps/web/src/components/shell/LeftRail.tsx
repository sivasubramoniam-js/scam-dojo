"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords, ShieldAlert, LifeBuoy, Award } from "lucide-react";
import { useT } from "@/lib/i18n";

export function LeftRail() {
  const pathname = usePathname();
  const { t } = useT();

  const links = [
    { href: "/train", label: t("nav.train"), icon: Swords, active: pathname.startsWith("/train") },
    { href: "/check", label: t("nav.check"), icon: ShieldAlert, active: pathname.startsWith("/check") },
    { href: "/recover", label: t("nav.recover"), icon: LifeBuoy, active: pathname.startsWith("/recover") },
    { href: "/dashboard", label: t("nav.dashboard"), icon: Award, active: pathname.startsWith("/dashboard") },
  ];

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="hidden lg:flex flex-col w-56 shrink-0 border-r border-[var(--line)] py-6 pr-4 transition-colors"
    >
      <nav className="flex flex-col gap-1">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                item.active
                  ? "bg-[var(--surface-2)] text-[var(--action)] font-bold shadow-xs"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
              }`}
              aria-current={item.active ? "page" : undefined}
            >
              <Icon className={`w-5 h-5 ${item.active ? "stroke-[2.2]" : "stroke-[1.75]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
