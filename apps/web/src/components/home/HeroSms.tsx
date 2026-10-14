"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MessageSquare, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";

type Choice = "tap" | "ignore" | "check" | null;

export function HeroSms() {
  const { t } = useT();
  const [selected, setSelected] = useState<Choice>(null);

  return (
    <div className="w-full max-w-[540px] flex flex-col gap-4">
      {/* Phone/SMS Bubble Container */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[20px] p-4 sm:p-5 shadow-sm transition-all">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line)] text-xs text-[var(--ink-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--action)]" aria-hidden="true" />
            <span className="font-semibold text-[var(--ink)] tracking-wide">
              {t("hero.sms.sender")}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[var(--surface-2)]">
              SMS
            </span>
          </div>
          <time dateTime="12:45">12:45 PM</time>
        </div>

        {/* Message Bubble */}
        <div className="bg-[var(--surface-2)] rounded-[14px] p-3.5 text-sm sm:text-base leading-relaxed text-[var(--ink)]">
          <p className="mb-2">
            Your KYC expires today. Update now to avoid suspension:
          </p>
          <button
            type="button"
            onClick={() => setSelected("tap")}
            className="inline-flex items-center gap-1.5 text-[var(--action)] font-semibold underline underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer"
            aria-label="Simulated malicious link: orion-kyc.example/u"
          >
            <span>orion-kyc.example/u</span>
            <ExternalLink className="w-3.5 h-3.5 inline" />
          </button>
        </div>

        {/* Action Choice Buttons */}
        <div className="mt-4 pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelected("tap")}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-[10px] border transition-all cursor-pointer ${
              selected === "tap"
                ? "bg-[var(--danger)] text-white border-[var(--danger)] shadow-xs"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {t("hero.choice.tap")}
          </button>
          <button
            type="button"
            onClick={() => setSelected("ignore")}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-[10px] border transition-all cursor-pointer ${
              selected === "ignore"
                ? "bg-[var(--safe)] text-white border-[var(--safe)] shadow-xs"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {t("hero.choice.ignore")}
          </button>
          <button
            type="button"
            onClick={() => setSelected("check")}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-[10px] border transition-all cursor-pointer ${
              selected === "check"
                ? "bg-[var(--action)] text-white border-[var(--action)] shadow-xs"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {t("hero.choice.check")}
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Card based on visitor choice */}
      {selected && (
        <div
          role="status"
          className={`p-4 rounded-[14px] border animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            selected === "tap"
              ? "bg-[var(--surface)] border-[var(--danger)]/40 text-[var(--ink)]"
              : selected === "ignore"
              ? "bg-[var(--surface)] border-[var(--safe)]/40 text-[var(--ink)]"
              : "bg-[var(--surface)] border-[var(--action)]/40 text-[var(--ink)]"
          }`}
        >
          <p className="text-sm sm:text-base font-medium mb-3">
            {selected === "tap" && t("hero.result.tap")}
            {selected === "ignore" && t("hero.result.ignore")}
            {selected === "check" && t("hero.result.check")}
          </p>
          <Link
            href={selected === "check" ? "/check" : "/train"}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold px-4 py-2 rounded-[10px] bg-[var(--action)] text-[var(--action-ink)] hover:opacity-90 transition-opacity"
          >
            <span>{selected === "check" ? t("mode.check") : t("mode.train")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
