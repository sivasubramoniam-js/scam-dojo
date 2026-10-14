"use client";

import React from "react";
import { HeroSms } from "@/components/home/HeroSms";
import { ModeTiles } from "@/components/home/ModeTiles";
import { useT } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useT();

  return (
    <div className="flex flex-col items-start gap-8 max-w-4xl">
      {/* Hero section */}
      <section className="flex flex-col gap-4 text-left">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--ink)] leading-[1.08] max-w-2xl">
          {t("home.hero")}
        </h1>
        <p className="text-base sm:text-lg text-[var(--ink-muted)] max-w-xl leading-relaxed">
          {t("home.hero.sub")}
        </p>
      </section>

      {/* Interactive SMS Hero */}
      <section aria-label="Interactive Scam Simulation Preview">
        <HeroSms />
      </section>

      {/* Mode tiles */}
      <ModeTiles />
    </div>
  );
}
