import React from "react";
import { CheckResult, ScamScoreBreakdown } from "@/lib/api";
import {
  Flame,
  CreditCard,
  Globe,
  MonitorSmartphone,
  AlertTriangle,
  ShieldAlert,
  Tag,
} from "lucide-react";

interface ScamScoreCardProps {
  checkResult: CheckResult;
}

export function ScamScoreCard({ checkResult }: ScamScoreCardProps) {
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
      label: "Psychological Coercion",
      score: breakdown.coercion,
      icon: Flame,
      desc: "Urgency, legal intimidation, artificial deadlines",
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
      label: "Financial Vector Risk",
      score: breakdown.financialRisk,
      icon: CreditCard,
      desc: "Demands for UPI PIN, OTP, upfront fee, or gift cards",
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
      label: "Sender & Channel Spoofing",
      score: breakdown.senderSpoof,
      icon: Globe,
      desc: "Unverified domains, URL shorteners, unknown caller",
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
      label: "Remote Access / Malware",
      score: breakdown.remoteAccess,
      icon: MonitorSmartphone,
      desc: "Requests to install AnyDesk, TeamViewer, or APKs",
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
            <span>Multi-Pillar ScamScore™ Risk Breakdown</span>
          </h3>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            GASA & ScamAdviser Standards
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
