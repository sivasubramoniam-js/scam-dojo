"use client";

import React from "react";
import { ShieldCheck, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function PiiNotice() {
  const { language } = useI18n();

  return (
    <div className="flex items-start gap-3 p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)] leading-relaxed">
      <ShieldCheck className="w-5 h-5 text-[var(--matcha)] shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-[var(--text)] mb-0.5 flex items-center gap-1.5">
          <span>{language === "hi" ? "गोपनीयता कवच सक्रिय" : "Privacy Shield Active"}</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 bg-[var(--surface-muted)] rounded font-mono">Safe Sandbox</span>
        </p>
        <p>
          {language === "hi"
            ? "यह एक सुरक्षित अभ्यास सिमुलेशन है। कभी भी वास्तविक पासवर्ड या पिन न डालें। आपके द्वारा लिखे गए संवेदनशील डेटा को भेजने से पहले ही कोड द्वारा स्वतः मास्क कर दिया जाता है।"
            : "This is a safe practice simulation. Never enter your real banking credentials or OTPs. All sensitive data is automatically masked client-side before processing."}
        </p>
      </div>
    </div>
  );
}
