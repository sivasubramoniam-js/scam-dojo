import React from "react";
import { ShieldCheck, AlertOctagon, CheckCircle2 } from "lucide-react";

export function AntiRecoveryScamShield() {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Critical Victim Protection Guarantee
          </span>
          <h3 className="text-sm font-black text-foreground">
            Beware of Secondary "Recovery Scams"
          </h3>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Fraudsters scan social media and review forums for victims and pose as "ethical hackers," "recovery advocates," or "cyber attorneys" promising to retrieve stolen funds for an upfront fee.
      </p>

      <div className="grid gap-2 sm:grid-cols-3 pt-1 text-xs">
        <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2">
          <span className="text-rose-500 font-black text-sm">✕</span>
          <div className="space-y-0.5">
            <div className="font-bold text-foreground">No Upfront Fees</div>
            <div className="text-[11px] text-muted-foreground">
              Official agencies never demand money, crypto, or gift cards to unlock funds.
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2">
          <span className="text-rose-500 font-black text-sm">✕</span>
          <div className="space-y-0.5">
            <div className="font-bold text-foreground">No Remote Access</div>
            <div className="text-[11px] text-muted-foreground">
              Never install AnyDesk or TeamViewer to "trace" or "refund" money.
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-foreground">Only Official Channels</div>
            <div className="text-[11px] text-muted-foreground">
              Only your bank and 1930 / cybercrime.gov.in can place interbank holds.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AntiRecoveryScamShield;
