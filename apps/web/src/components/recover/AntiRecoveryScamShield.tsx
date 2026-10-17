import React from "react";
import { ShieldCheck, AlertOctagon, CheckCircle2 } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AntiRecoveryScamShield() {
  const { t } = useT();

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {t("shield.tag")}
          </span>
          <h3 className="text-sm font-black text-foreground">
            {t("shield.title")}
          </h3>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("shield.desc")}
      </p>

      <div className="grid gap-2 sm:grid-cols-3 pt-1 text-xs">
        <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2">
          <span className="text-rose-500 font-black text-sm">✕</span>
          <div className="space-y-0.5">
            <div className="font-bold text-foreground">{t("shield.r1.title")}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("shield.r1.desc")}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2">
          <span className="text-rose-500 font-black text-sm">✕</span>
          <div className="space-y-0.5">
            <div className="font-bold text-foreground">{t("shield.r2.title")}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("shield.r2.desc")}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-foreground">{t("shield.r3.title")}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("shield.r3.desc")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AntiRecoveryScamShield;
