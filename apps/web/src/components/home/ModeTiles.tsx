"use client";

import React from "react";
import Link from "next/link";
import { Swords, ShieldAlert, LifeBuoy, ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n";

export function ModeTiles() {
  const { t } = useT();

  const modes = [
    {
      href: "/train",
      title: t("mode.train"),
      desc: t("mode.train.desc"),
      icon: Swords,
      color: "text-[var(--action)]",
      badge: "Practice",
    },
    {
      href: "/check",
      title: t("mode.check"),
      desc: t("mode.check.desc"),
      icon: ShieldAlert,
      color: "text-[var(--caution)]",
      badge: "Real-time",
    },
    {
      href: "/recover",
      title: t("mode.recover"),
      desc: t("mode.recover.desc"),
      icon: LifeBuoy,
      color: "text-[var(--safe)]",
      badge: "Support",
    },
  ];

  return (
    <section aria-labelledby="modes-heading" className="w-full mt-10">
      <h2 id="modes-heading" className="sr-only">
        Product Modes
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <Link
              key={mode.href}
              href={mode.href}
              className="group flex flex-col justify-between p-5 rounded-[14px] bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--action)] hover:shadow-sm transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-[10px] bg-[var(--surface-2)] ${mode.color}`}>
                    <Icon className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-[var(--ink-muted)]">
                    {mode.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[var(--ink)] mb-1.5 group-hover:text-[var(--action)] transition-colors">
                  {mode.title}
                </h3>
                <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                  {mode.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-[var(--line)]/60 flex items-center justify-between text-xs font-semibold text-[var(--action)]">
                <span>Start</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
