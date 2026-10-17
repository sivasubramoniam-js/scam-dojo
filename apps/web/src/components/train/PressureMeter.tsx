import React from "react";
import { useT } from "@/lib/i18n";

interface PressureMeterProps {
  tension: number; // 0 to 10
  className?: string;
}

export function PressureMeter({ tension, className = "" }: PressureMeterProps) {
  const { t } = useT();

  const getLevel = () => {
    if (tension <= 3) return { text: t("pressure_meter.low"), color: "text-safe-matcha", bg: "bg-safe-matcha" };
    if (tension <= 6) return { text: t("pressure_meter.medium"), color: "text-caution-kihada", bg: "bg-caution-kihada" };
    return { text: t("pressure_meter.critical"), color: "text-danger-beni", bg: "bg-danger-beni" };
  };

  const level = getLevel();

  return (
    <div
      role="meter"
      aria-label={t("pressure_meter.aria_label")}
      aria-valuenow={tension}
      aria-valuemin={0}
      aria-valuemax={10}
      className={`flex flex-col gap-1 ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-label-sm">
        <span className="text-ink-sumi">{t("pressure_meter.attacker_urgency")}</span>
        <span className={`font-bold ${level.color}`}>{level.text} ({tension}/10)</span>
      </div>
      <div className="h-2 w-full bg-surface-hanshi rounded-full overflow-hidden border border-line-ito/40">
        <div
          className={`h-full ${level.bg} transition-all duration-300 rounded-full`}
          style={{ width: `${Math.min(100, Math.max(0, tension * 10))}%` }}
        ></div>
      </div>
    </div>
  );
}

export default PressureMeter;
