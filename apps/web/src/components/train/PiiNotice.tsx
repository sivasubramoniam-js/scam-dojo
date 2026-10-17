import React from "react";
import { useT } from "@/lib/i18n";

export function PiiNotice({ className = "" }: { className?: string }) {
  const { t } = useT();

  return (
    <div className={`flex items-center gap-2 p-3 bg-surface-container-low border border-line-ito/50 rounded-xl text-xs text-ink-sumi ${className}`}>
      <span className="material-symbols-outlined text-safe-matcha text-[18px] shrink-0">
        verified_user
      </span>
      <div>
        <span className="font-bold text-ink-aizome mr-1">{t("pii_notice.title")}</span>
        <span>{t("pii_notice.desc")}</span>
      </div>
    </div>
  );
}

export default PiiNotice;
