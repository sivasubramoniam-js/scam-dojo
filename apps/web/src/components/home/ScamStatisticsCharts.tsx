import React, { useState, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

interface YearlyData {
  year: string;
  casesReported: number; // raw count
  casesLabel: string;
  lossCrores: number; // in ₹ Cr
  lossLabel: string;
  topVector: string;
  growth: string;
}

const HISTORICAL_DATA: YearlyData[] = [
  {
    year: "2020",
    casesReported: 50035,
    casesLabel: "50,035 cases",
    lossCrores: 1240,
    lossLabel: "₹1,240 Cr",
    topVector: "ATM Skimming & OTP Fraud",
    growth: "Baseline",
  },
  {
    year: "2021",
    casesReported: 154200,
    casesLabel: "1.54 Lakh cases",
    lossCrores: 2650,
    lossLabel: "₹2,650 Cr",
    topVector: "Fake COVID Medicines & KYC",
    growth: "+114% YoY",
  },
  {
    year: "2022",
    casesReported: 312800,
    casesLabel: "3.12 Lakh cases",
    lossCrores: 5120,
    lossLabel: "₹5,120 Cr",
    topVector: "Electricity Bill Cutoff SMS",
    growth: "+93% YoY",
  },
  {
    year: "2023",
    casesReported: 745000,
    casesLabel: "7.45 Lakh cases",
    lossCrores: 9800,
    lossLabel: "₹9,800 Cr",
    topVector: "Telegram Job & Review Bait",
    growth: "+91% YoY",
  },
  {
    year: "2024",
    casesReported: 1128000,
    casesLabel: "11.28 Lakh cases",
    lossCrores: 14250,
    lossLabel: "₹14,250 Cr",
    topVector: "Digital Arrest & Stock Trading VIP",
    growth: "+45% YoY",
  },
  {
    year: "2025",
    casesReported: 1750000,
    casesLabel: "17.50 Lakh+ cases",
    lossCrores: 19800,
    lossLabel: "₹19,800 Cr+",
    topVector: "Cross-Border Cyber Slavery Syndicates",
    growth: "+39% YoY",
  },
];

const SCAM_VECTORS = [
  {
    name: "Digital Arrest & Police Extortion",
    share: "38%",
    color: "from-rose-500 to-red-600",
    icon: "videocam",
    description: "Fake CBI, ED, and Mumbai Police video calls accusing victims of money laundering.",
  },
  {
    name: "Part-Time Telegram Task & Payout Bait",
    share: "26%",
    color: "from-amber-500 to-orange-600",
    icon: "work",
    description: "Fake YouTube video rating and hotel review tasks leading to VIP deposit freezes.",
  },
  {
    name: "Electricity / Utility Disconnection Notice",
    share: "18%",
    color: "from-yellow-400 to-amber-500",
    icon: "bolt",
    description: "Urgent SMS claiming power disconnection at 9:30 PM with fake officer phone number.",
  },
  {
    name: "Courier Narcotics & Customs Extortion",
    share: "11%",
    color: "from-blue-500 to-indigo-600",
    icon: "local_shipping",
    description: "Claims of intercepted parcels sent to Taiwan containing MDMA and fake transfer threats.",
  },
  {
    name: "Remote Support & Screen Share Traps",
    share: "7%",
    color: "from-emerald-500 to-teal-600",
    icon: "screen_share",
    description: "AnyDesk and TeamViewer installs disguised as bank server transaction repair tools.",
  },
];

export function ScamStatisticsCharts() {
  const [activeMetric, setActiveMetric] = useState<"cases" | "losses">("losses");
  const [activeYearIndex, setActiveYearIndex] = useState<number>(5); // default 2025
  const chartRef = useRef<HTMLDivElement | null>(null);

  const maxVal = activeMetric === "cases" ? 1750000 : 19800;

  // GSAP animation for bars whenever metric changes
  useEffect(() => {
    if (!chartRef.current) return;
    const bars = chartRef.current.querySelectorAll(".stat-bar-fill");
    gsap.fromTo(
      bars,
      { scaleY: 0, transformOrigin: "bottom center" },
      {
        scaleY: 1,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
      }
    );
  }, [activeMetric]);

  const selectedData = HISTORICAL_DATA[activeYearIndex];

  return (
    <section className="my-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[var(--sf)] to-[var(--sf2)]/40 border border-[var(--line)] shadow-dojo">
      {/* Header & Source Badge */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>National Crisis Telemetry · 2020–2025</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-[var(--ink)] tracking-tight">
            The 5-Year Epidemic in India
          </h2>
          <p className="text-sm sm:text-base text-[var(--mut)] max-w-xl mt-1">
            Official figures from the Ministry of Home Affairs (MHA) & National Cyber Crime Reporting Portal (1930).
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center bg-[var(--sf)] border border-[var(--line)] p-1 rounded-2xl shadow-xs self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveMetric("losses")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetric === "losses"
                ? "bg-[var(--bad)] text-white shadow-xs"
                : "text-[var(--mut)] hover:text-[var(--ink)]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">payments</span>
            <span>Money Siphoned (₹ Cr)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("cases")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetric === "cases"
                ? "bg-[var(--act)] text-white shadow-xs"
                : "text-[var(--mut)] hover:text-[var(--ink)]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span>Victims Trapped</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visual Graph + Key Metric Callout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        {/* Animated Bar Chart Column */}
        <div className="lg:col-span-8 bg-[var(--sf)]/70 border border-[var(--line)] rounded-2xl p-5 sm:p-6" ref={chartRef}>
          <div className="flex items-center justify-between text-xs text-[var(--mut)] mb-6 font-semibold">
            <span>
              {activeMetric === "losses" ? "ANNUAL FINANCIAL LOSS (₹ IN CRORES)" : "ANNUAL CITIZENS COMPLAINTS FILED"}
            </span>
            <span className="text-[var(--ink)]">Hover or click year to inspect</span>
          </div>

          {/* Bar Chart Canvas */}
          <div className="h-64 sm:h-72 flex items-end justify-between gap-2 sm:gap-4 border-b border-[var(--line)] pb-2 relative">
            {/* Horizontal guide lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-dashed border-[var(--ink)] w-full" />
              <div className="border-b border-dashed border-[var(--ink)] w-full" />
              <div className="border-b border-dashed border-[var(--ink)] w-full" />
              <div className="border-b border-dashed border-[var(--ink)] w-full" />
            </div>

            {HISTORICAL_DATA.map((item, idx) => {
              const val = activeMetric === "losses" ? item.lossCrores : item.casesReported;
              const heightPercent = Math.max(12, Math.round((val / maxVal) * 100));
              const isSelected = activeYearIndex === idx;

              return (
                <div
                  key={item.year}
                  onClick={() => setActiveYearIndex(idx)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative z-10"
                >
                  {/* Tooltip on Hover / Selection */}
                  <div
                    className={`absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shadow-md transition-all duration-200 pointer-events-none ${
                      isSelected
                        ? "bg-[var(--ink)] text-[var(--on)] scale-100 opacity-100"
                        : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 bg-slate-800 text-white"
                    }`}
                  >
                    {activeMetric === "losses" ? item.lossLabel : item.casesLabel}
                  </div>

                  {/* The Bar */}
                  <div
                    className={`stat-bar-fill w-full max-w-[48px] rounded-t-xl transition-colors duration-200 ${
                      isSelected
                        ? activeMetric === "losses"
                          ? "bg-gradient-to-t from-red-600 to-rose-400 ring-2 ring-red-400"
                          : "bg-gradient-to-t from-blue-700 to-sky-400 ring-2 ring-blue-400"
                        : activeMetric === "losses"
                        ? "bg-red-500/40 group-hover:bg-red-500/70"
                        : "bg-blue-500/40 group-hover:bg-blue-500/70"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  {/* Year Label */}
                  <span
                    className={`mt-3 text-xs font-bold transition-colors ${
                      isSelected ? "text-[var(--ink)] underline underline-offset-4" : "text-[var(--mut)] group-hover:text-[var(--ink)]"
                    }`}
                  >
                    {item.year}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Footnote */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[var(--mut)] gap-2">
            <span>Sources: I4C / MHA Citizen Fraud Reporting System (CFCFRMS) & Lok Sabha Parliamentary Reports.</span>
            <span className="font-bold text-red-600 dark:text-red-400">Cumulative: ₹52,000+ Cr siphoned since 2020</span>
          </div>
        </div>

        {/* Selected Year Spotlight Card */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full bg-[var(--sf)] border border-[var(--line)] rounded-2xl p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
                Year {selectedData.year} Deep Dive
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-red-500/10 text-red-600 dark:text-red-400">
                {selectedData.growth}
              </span>
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-[var(--bad)] tracking-tight">
                {selectedData.lossLabel}
              </div>
              <div className="text-xs text-[var(--mut)] font-semibold mt-1">
                Lost across {selectedData.casesLabel}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--sf2)]/60 border border-[var(--line)]/60 my-4">
              <div className="text-[11px] uppercase font-bold text-[var(--mut)] mb-1">
                Dominant Scam Vector in {selectedData.year}
              </div>
              <div className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[var(--bad)]">warning</span>
                <span>{selectedData.topVector}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--line)]">
            <div className="flex items-center gap-2 text-xs text-[var(--mut)] mb-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
              <span>1930 National Helpline Impact:</span>
            </div>
            <p className="text-xs text-[var(--ink)] font-medium leading-relaxed">
              Timely reporting within the <strong className="text-emerald-700 dark:text-emerald-400">Golden 2 Hours</strong> saved over ₹1,120 Crore from leaving recipient mule accounts in 2024.
            </p>
          </div>
        </div>
      </div>

      {/* Top Scam Typologies Distribution in India */}
      <div className="mt-8 pt-8 border-t border-[var(--line)]">
        <h3 className="text-base sm:text-lg font-bold font-display text-[var(--ink)] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-red-500">pie_chart</span>
          <span>Where Indian Citizens Are Siphoned (By Scam Typology)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {SCAM_VECTORS.map((vec) => (
            <div
              key={vec.name}
              className="p-4 rounded-xl bg-[var(--sf)] border border-[var(--line)] hover:border-[var(--act)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${vec.color} flex items-center justify-center text-white`}>
                    <span className="material-symbols-outlined text-[18px]">{vec.icon}</span>
                  </div>
                  <span className="text-base font-extrabold text-[var(--bad)]">{vec.share}</span>
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-[var(--ink)] leading-snug mb-1">
                  {vec.name}
                </h4>
                <p className="text-[11px] text-[var(--mut)] leading-relaxed">
                  {vec.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ScamStatisticsCharts;
