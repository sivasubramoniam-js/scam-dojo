import React, { useState } from "react";
import { useT } from "@/lib/i18n";

interface NewsItem {
  id: string;
  source: string;
  sourceBadgeColor: string;
  date: string;
  headline: string;
  lossTag: string;
  location: string;
  country: string;
  countryFlag: string;
  quote: string;
  victimProfile: string;
  vector: string;
  legalAction: string;
  helpline: string;
}

const HEADLINES: NewsItem[] = [
  {
    id: "hindu-digital-arrest",
    country: "India",
    countryFlag: "🇮🇳",
    source: "The Hindu",
    sourceBadgeColor: "bg-red-950 text-red-200 border-red-800",
    date: "February 2025",
    location: "New Delhi, India",
    headline: "Retired Doctor Extorted of ₹7.8 Crore in 14-Day Fake CBI Digital Arrest",
    lossTag: "₹7.8 Crore Lost",
    vector: "Digital Arrest & Authority Coercion",
    victimProfile: "Senior Citizen / Retired Chief Medical Officer",
    quote:
      "Fraudsters wore authentic police uniforms against an official CBI insignia backdrop on Skype, threatening an immediate non-bailable warrant over an alleged drug courier.",
    legalAction: "FIR Filed (Section 420 IPC)",
    helpline: "National Cyber Helpline 1930",
  },
  {
    id: "toi-telegram-job",
    country: "India",
    countryFlag: "🇮🇳",
    source: "Times of India / I4C",
    sourceBadgeColor: "bg-slate-900 text-amber-200 border-amber-800",
    date: "January 2025",
    location: "Bengaluru, India",
    headline: "Senior Software Architect Duped of ₹1.4 Crore in Part-Time Telegram Task Trap",
    lossTag: "₹1.4 Crore Lost",
    vector: "Part-Time Task & VIP Crypto Freeze",
    victimProfile: "IT Professional (34 Yrs)",
    quote:
      "Started with ₹150 payout for liking three YouTube videos. Soon lured into 'VIP Merchant Trading Tasks' where funds were frozen in simulated crypto wallets.",
    legalAction: "CFRMS Rapid Intercept",
    helpline: "Cybercrime Portal cybercrime.gov.in",
  },
  {
    id: "spf-singapore-protection",
    country: "Singapore",
    countryFlag: "🇸🇬",
    source: "The Straits Times / SPF",
    sourceBadgeColor: "bg-sky-950 text-sky-200 border-sky-800",
    date: "February 2026 Annual Brief",
    location: "Singapore",
    headline: "SPF Issues Emergency Bank Restriction Orders as 2025 Scam Losses Reach S$913.1M",
    lossTag: "S$913.1M Lost · S$140.5M Saved",
    vector: "Govt. Impersonation & Phishing",
    victimProfile: "Anti-Scam Command Interventions",
    quote:
      "Under the Protection from Scams Act in force July 2025, police issue emergency Restriction Orders to banks to halt transfers by victims under coercive psychological influence from overseas syndicates posing as officials.",
    legalAction: "Protection from Scams Act 2025",
    helpline: "Anti-Scam Command (ScamShield)",
  },
  {
    id: "et-mha-crackdown",
    country: "India",
    countryFlag: "🇮🇳",
    source: "The Economic Times / I4C",
    sourceBadgeColor: "bg-blue-950 text-blue-200 border-blue-800",
    date: "2025 Annual Registry",
    location: "National Bureau, India",
    headline: "₹19,813 Cr Stolen in 2025: I4C & MHA Freeze ₹8,189 Cr Across 23 Lakh Complaints",
    lossTag: "₹8,189 Cr Saved by 1930",
    vector: "Mule Account & Cyber Coordination",
    victimProfile: "Citizen Financial Fraud System",
    quote:
      "Compiling National Cybercrime Reporting Portal data, over 2.17 million complaints were logged in 2025. The Citizen Financial Cyber Fraud Reporting System saved over ₹8,189 crore through rapid 1930 helpline intervention.",
    legalAction: "Citizen Financial Cyber Fraud System",
    helpline: "Toll-Free Helpline 1930",
  },
  {
    id: "japan-npa-special-fraud",
    country: "Japan",
    countryFlag: "🇯🇵",
    source: "The Japan Times / NPA",
    sourceBadgeColor: "bg-rose-950 text-rose-200 border-rose-800",
    date: "March 2026 Registry",
    location: "Tokyo, Japan",
    headline: "Record ¥324 Billion Lost to Special Fraud: 70% of Losses Stem from Criminals Posing as Police",
    lossTag: "¥324 Billion Lost (Record)",
    vector: "Special Fraud (Police Impersonation)",
    victimProfile: "National Police Agency SOS47 Bureau",
    quote:
      "The National Police Agency reported 27,758 special fraud cases in 2025. Roughly 70% of losses stemmed from organized phone and video schemes where criminals posed as police officers alleging criminal bank complicity.",
    legalAction: "Police Emergency #9110 Alert",
    helpline: "Police #9110 · Consumer 188",
  },
  {
    id: "australia-nasc-framework",
    country: "Australia",
    countryFlag: "🇦🇺",
    source: "The Australian / NASC",
    sourceBadgeColor: "bg-amber-950 text-amber-200 border-amber-800",
    date: "March 2026 Targeting Scams",
    location: "Canberra, Australia",
    headline: "Australians Lost A$2.18 Billion as Scams Prevention Framework Act 2025 Enforces Bank Duties",
    lossTag: "A$2.18 Billion Lost",
    vector: "Payment Redirection & Remote Access",
    victimProfile: "National Anti-Scam Centre (NASC)",
    quote:
      "With 481,523 reports logged across agencies in 2025, the federal Scams Prevention Framework Act 2025 introduces mandatory fraud detection codes, compulsory bank reimbursement conditions, and real-time intelligence feeds.",
    legalAction: "Scams Prevention Framework Act 2025",
    helpline: "Scamwatch · cyber.gov.au",
  },
];

export function NewspaperHeadlines() {
  const { t } = useT();
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  const filterOptions = ["All", "India", "Singapore", "Japan", "Australia"];

  const filteredHeadlines =
    selectedFilter === "All"
      ? HEADLINES
      : HEADLINES.filter((h) => h.country.toLowerCase() === selectedFilter.toLowerCase());

  return (
    <section className="my-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
            <span className="material-symbols-outlined text-[16px]">newspaper</span>
            <span>{t("news_hd.tag")}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--ink)] tracking-tight">
            {t("news_hd.title")}
          </h2>
        </div>
        <span className="text-xs text-[var(--mut)] font-medium">
          {t("news_hd.desc")}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {filterOptions.map((opt) => {
          const count = opt === "All" ? HEADLINES.length : HEADLINES.filter((h) => h.country === opt).length;
          const isActive = selectedFilter === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setSelectedFilter(opt)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-[var(--act)] text-white shadow-xs"
                  : "bg-[var(--sf)] text-[var(--mut)] border border-[var(--line)] hover:text-[var(--ink)] hover:border-[var(--mut)]"
              }`}
            >
              <span>{opt === "All" ? t("news_hd.filter_all") : opt}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-[var(--mut)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of Authentic Newspaper Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredHeadlines.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between p-5 rounded-2xl bg-[var(--sf)] border border-[var(--line)] shadow-sm hover:shadow-md transition-all group"
          >
            <div>
              {/* Publication Header */}
              <div className="flex items-center justify-between border-b border-[var(--line)]/70 pb-3 mb-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{item.countryFlag}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] border font-serif tracking-wide ${item.sourceBadgeColor}`}
                  >
                    {item.source}
                  </span>
                </div>
                <span className="text-[var(--mut)] font-semibold text-[11px]">
                  {item.location} · {item.date}
                </span>
              </div>

              {/* Alert Badge */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-600 text-white shadow-xs">
                  {item.lossTag}
                </span>
                <span className="text-[11px] font-bold text-[var(--act)] capitalize">
                  {item.vector}
                </span>
              </div>

              {/* Headline */}
              <h3 className="text-base sm:text-lg font-bold font-serif text-[var(--ink)] leading-snug mb-2 group-hover:text-[var(--act)] transition-colors">
                "{item.headline}"
              </h3>

              {/* Quote from Report */}
              <blockquote className="text-xs sm:text-sm text-[var(--mut)] italic leading-relaxed pl-3 border-l-2 border-red-500/50 my-3">
                "{item.quote}"
              </blockquote>
            </div>

            {/* Victim Profile & Legal Action Footer */}
            <div className="pt-3 border-t border-[var(--line)]/60 flex flex-col gap-1.5 text-[11px] text-[var(--mut)]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  <span>{item.victimProfile}</span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">gavel</span>
                  <span>{item.legalAction}</span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-[12px] text-amber-500">support_agent</span>
                <span>{item.helpline}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default NewspaperHeadlines;
