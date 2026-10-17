import React from "react";
import { CheckResult, ScamScoreBreakdown } from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  Flame,
  CreditCard,
  Globe,
  MonitorSmartphone,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Zap,
  Video,
  FileText,
  Sparkles,
} from "lucide-react";
import { MarkdownView } from "@/components/common/MarkdownView";

interface ScamScoreCardProps {
  checkResult: CheckResult;
}

export function ScamScoreCard({ checkResult }: ScamScoreCardProps) {
  const { t } = useT();
  const text = (checkResult.text || "").toLowerCase();

  // Heuristic breakdown fallback if backend didn't compute
  const breakdown: ScamScoreBreakdown = checkResult.scoreBreakdown || {
    coercion:
      /(?:arrest|police|fir|court|cbi|disconnect|power|meter|tonight|suspend|blocked|immediately|urgent|within \d+)/i.test(text)
        ? Math.min(100, Math.max(75, checkResult.score + 5))
        : checkResult.riskLevel === "safe"
        ? 5
        : 35,
    financialRisk:
      /(?:upi|pin|otp|cvv|debit|card|fee|deposit|earn|invest|profit|refund|bonus|crypto|lakh|rs\.)/i.test(text)
        ? Math.min(100, Math.max(80, checkResult.score))
        : checkResult.riskLevel === "safe"
        ? 0
        : 25,
    senderSpoof:
      /(?:http|bit\.ly|tinyurl|t\.me|\.apk|\.xyz|\.top|\+92|\+1)/i.test(text)
        ? 90
        : checkResult.riskLevel === "safe"
        ? 10
        : 50,
    remoteAccess:
      /(?:anydesk|teamviewer|rustdesk|quicksupport|screen\s*share|install\s*app|\.apk)/i.test(text)
        ? 95
        : 5,
  };

  // Derive recognized Indian Scam Vector badges
  const derivedBadges: string[] = checkResult.vectorBadges && checkResult.vectorBadges.length > 0
    ? checkResult.vectorBadges
    : (() => {
        const badges: string[] = [];
        if (/(?:digital arrest|cbi|customs|narcotics|police|fir|warrant|skype)/i.test(text)) {
          badges.push("🚨 Digital Arrest Impersonation");
        }
        if (/(?:electricity|power|bill unpaid|meter|light bill)/i.test(text)) {
          badges.push("⚡ Electricity / Utility Cutoff");
        }
        if (/(?:telegram|task|part[\s-]*time|earn daily|youtube like|review hotel)/i.test(text)) {
          badges.push("💼 Fake Part-Time Job / Telegram Task");
        }
        if (/(?:anydesk|teamviewer|rustdesk|quicksupport|remote desktop)/i.test(text)) {
          badges.push("🖥️ Remote Desktop Support Trap");
        }
        if (/(?:kyc|sbi|hdfc|icici|axis|pan card|aadhaar|netbanking)/i.test(text)) {
          badges.push("🏦 Banking KYC Expiry Phishing");
        }
        if (/(?:upi|collect|qr code|scan|refund|paytm|phonepe|gpay)/i.test(text)) {
          badges.push("💸 UPI Collect / Refund Fraud");
        }
        if (/(?:courier|fedex|dhl|parcel|customs|drugs|illegal)/i.test(text)) {
          badges.push("📦 Courier Customs Drug Trap");
        }
        return badges;
      })();

  const pillars = [
    {
      label: t("scorecard.coercion.label"),
      score: breakdown.coercion,
      icon: Flame,
      desc: t("scorecard.coercion.desc"),
      color:
        breakdown.coercion > 70
          ? "text-rose-600 dark:text-rose-400"
          : breakdown.coercion > 40
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
      barBg:
        breakdown.coercion > 70
          ? "bg-rose-500"
          : breakdown.coercion > 40
          ? "bg-amber-500"
          : "bg-emerald-500",
    },
    {
      label: t("scorecard.financial.label"),
      score: breakdown.financialRisk,
      icon: CreditCard,
      desc: t("scorecard.financial.desc"),
      color:
        breakdown.financialRisk > 70
          ? "text-rose-600 dark:text-rose-400"
          : breakdown.financialRisk > 40
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
      barBg:
        breakdown.financialRisk > 70
          ? "bg-rose-500"
          : breakdown.financialRisk > 40
          ? "bg-amber-500"
          : "bg-emerald-500",
    },
    {
      label: t("scorecard.spoof.label"),
      score: breakdown.senderSpoof,
      icon: Globe,
      desc: t("scorecard.spoof.desc"),
      color:
        breakdown.senderSpoof > 70
          ? "text-rose-600 dark:text-rose-400"
          : breakdown.senderSpoof > 40
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
      barBg:
        breakdown.senderSpoof > 70
          ? "bg-rose-500"
          : breakdown.senderSpoof > 40
          ? "bg-amber-500"
          : "bg-emerald-500",
    },
    {
      label: t("scorecard.malware.label"),
      score: breakdown.remoteAccess,
      icon: MonitorSmartphone,
      desc: t("scorecard.malware.desc"),
      color:
        breakdown.remoteAccess > 70
          ? "text-rose-600 dark:text-rose-400"
          : breakdown.remoteAccess > 40
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
      barBg:
        breakdown.remoteAccess > 70
          ? "bg-rose-500"
          : breakdown.remoteAccess > 40
          ? "bg-amber-500"
          : "bg-emerald-500",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header & Badges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span>{t("scorecard.title")}</span>
          </h3>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {t("scorecard.standards")}
          </span>
        </div>

        {/* Indian Scam Taxonomy Badges */}
        {derivedBadges.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {derivedBadges.map((badge, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold"
              >
                <Tag className="w-3 h-3 text-rose-500" />
                <span>{badge}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Deceptive UPI Intent / QR Debit Alert */}
      {checkResult.upiPayload && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
            <Zap className="w-4 h-4 fill-rose-500 text-rose-500" />
            <span>Deceptive UPI Debit Request (Collect / QR Trap)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-background/60 p-2.5 rounded-lg border border-border/50 text-[11px] font-mono">
            <div>
              <span className="text-muted-foreground block text-[10px]">Recipient VPA:</span>
              <span className="font-bold text-foreground truncate block">{checkResult.upiPayload.payeeVpa || "Unknown"}</span>
            </div>
            {checkResult.upiPayload.payeeName && (
              <div>
                <span className="text-muted-foreground block text-[10px]">Payee Name:</span>
                <span className="font-bold text-foreground truncate block">{checkResult.upiPayload.payeeName}</span>
              </div>
            )}
            {checkResult.upiPayload.amount && (
              <div>
                <span className="text-muted-foreground block text-[10px]">Debit Amount:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">₹{checkResult.upiPayload.amount}</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
            ⚠️ <strong>NPCI / RBI Zero-Trust Rule:</strong> Entering your MPIN will transfer money OUT of your bank account. In India's UPI system, you never enter an MPIN or scan a QR code to receive a refund or cashback.
          </p>
        </div>
      )}

      {/* Google Web Risk Threat Intelligence Badge */}
      {checkResult.webRisk?.checked && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
          checkResult.webRisk.isThreat
            ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        }`}>
          <div className="flex items-center gap-2">
            {checkResult.webRisk.isThreat ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div>
              <span className="font-bold block text-[11px]">
                {checkResult.webRisk.isThreat ? "Google Web Risk Threat Alert" : "Google Web Risk Reputation"}
              </span>
              <span className="text-[10px] opacity-90 block">
                {checkResult.webRisk.summary}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
            checkResult.webRisk.isThreat ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
          }`}>
            {checkResult.webRisk.isThreat ? "Flagged Threat" : "Clean"}
          </span>
        </div>
      )}

      {/* Google Gemini Multimodal Media Analysis Card (Video & Document Forensics) */}
      {checkResult.mediaAnalysis && (
        <div className={`p-4 rounded-xl border text-xs space-y-3 ${
          checkResult.mediaAnalysis.deepfakeDetected || (checkResult.mediaAnalysis.forgeryFlags && checkResult.mediaAnalysis.forgeryFlags.length > 0)
            ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20"
            : "border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-950/20"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              {checkResult.mediaAnalysis.mediaType === "video" ? (
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Video className="w-4 h-4" />
                </div>
              ) : checkResult.mediaAnalysis.mediaType === "document" ? (
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div>
                <span className="font-bold text-foreground block text-xs">
                  {checkResult.mediaAnalysis.mediaType === "video"
                    ? "Google Cloud Gemini Video Forensics & Deepfake Scan"
                    : checkResult.mediaAnalysis.mediaType === "document"
                    ? "Google Cloud Document Authenticity & Legal Seal Analysis"
                    : "Google Cloud Multimodal Visual Inspection"}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {checkResult.mediaAnalysis.googleApiUsed || "Gemini 2.5 Flash Multimodal & Google Cloud Security"}
                  {checkResult.mediaAnalysis.fileName ? ` · ${checkResult.mediaAnalysis.fileName}` : ""}
                </span>
              </div>
            </div>

            {/* Deepfake / Authenticity Status Pill */}
            {checkResult.mediaAnalysis.deepfakeDetected ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-600 text-white animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                Synthetic Deepfake ({checkResult.mediaAnalysis.syntheticConfidence}%)
              </span>
            ) : checkResult.mediaAnalysis.mediaType === "video" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Authentic Video Markers
              </span>
            ) : checkResult.mediaAnalysis.forgeryFlags && checkResult.mediaAnalysis.forgeryFlags.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-600/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Document Forgery Suspected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                Document Structure Verified
              </span>
            )}
          </div>

          {/* Anomaly Badges */}
          {checkResult.mediaAnalysis.forgeryFlags && checkResult.mediaAnalysis.forgeryFlags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Detected Forensic Anomalies:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {checkResult.mediaAnalysis.forgeryFlags.map((flag, fIdx) => (
                  <span
                    key={fIdx}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                  >
                    • {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {checkResult.mediaAnalysis.summary && (
            <div className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
              <MarkdownView content={checkResult.mediaAnalysis.summary} />
            </div>
          )}
        </div>
      )}

      {/* 4 Pillar Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map((p, idx) => {
          const Icon = p.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span>{p.label}</span>
                </span>
                <span className={`font-black text-sm ${p.color}`}>
                  {p.score}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${p.barBg}`}
                  style={{ width: `${Math.min(100, Math.max(3, p.score))}%` }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {p.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScamScoreCard;
