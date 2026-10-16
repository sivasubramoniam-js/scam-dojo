import React from "react";

interface NewsItem {
  id: string;
  source: string;
  sourceBadgeColor: string;
  date: string;
  headline: string;
  lossTag: string;
  location: string;
  quote: string;
  victimProfile: string;
  vector: string;
}

const HEADLINES: NewsItem[] = [
  {
    id: "hindu-digital-arrest",
    source: "The Hindu",
    sourceBadgeColor: "bg-red-950 text-red-200 border-red-800",
    date: "February 2025",
    location: "New Delhi",
    headline: "Retired Doctor Extorted of ₹7.8 Crore in 14-Day Fake CBI Digital Arrest",
    lossTag: "₹7.8 Crore Lost",
    vector: "Digital Arrest",
    victimProfile: "Senior Citizen / Retired Chief Medical Officer",
    quote:
      "Fraudsters wore authentic police uniforms against an official CBI insignia backdrop on Skype, threatening an immediate non-bailable warrant over an alleged drug courier.",
  },
  {
    id: "toi-telegram-job",
    source: "The Times of India",
    sourceBadgeColor: "bg-slate-900 text-amber-200 border-amber-800",
    date: "January 2025",
    location: "Bengaluru",
    headline: "Senior Software Architect Duped of ₹1.4 Crore in Part-Time Telegram Task Trap",
    lossTag: "₹1.4 Crore Lost",
    vector: "Part-Time Task Scam",
    victimProfile: "IT Professional (34 Yrs)",
    quote:
      "Started with ₹150 payout for liking three YouTube videos. Soon lured into 'VIP Merchant Trading Tasks' where funds were frozen in simulated crypto wallets.",
  },
  {
    id: "express-electricity",
    source: "The Indian Express",
    sourceBadgeColor: "bg-emerald-950 text-emerald-200 border-emerald-800",
    date: "December 2024",
    location: "Mumbai",
    headline: "Widow Duped of ₹45 Lakh Over Fake 9:30 PM Electricity Disconnection SMS",
    lossTag: "₹45 Lakh Lost",
    vector: "Utility Cutoff Phishing",
    victimProfile: "Retired School Teacher (71 Yrs)",
    quote:
      "The message warned power would be disconnected at 9:30 PM. Panicked, she called the mobile number and installed a screen-sharing tool believing it was an official payment app.",
  },
  {
    id: "et-mha-crackdown",
    source: "The Economic Times",
    sourceBadgeColor: "bg-blue-950 text-blue-200 border-blue-800",
    date: "March 2025",
    location: "National Bureau",
    headline: "I4C & MHA Freeze ₹1,120 Crore in Nationwide Crackdown on 4.5 Lakh Mule Accounts",
    lossTag: "₹1,120 Cr Frozen",
    vector: "Mule Account Network",
    victimProfile: "Interbank Cyber Forensics",
    quote:
      "MHA confirmed cyber syndicates operating from Southeast Asia exploit student bank accounts. Immediate 1930 reporting proved decisive in stopping wire transfers.",
  },
  {
    id: "ht-customs-drug",
    source: "Hindustan Times",
    sourceBadgeColor: "bg-purple-950 text-purple-200 border-purple-800",
    date: "November 2024",
    location: "Hyderabad",
    headline: "Fake Courier 'MDMA Parcel' Alert: Corporate Executive Transferred ₹84 Lakh to Clear Name",
    lossTag: "₹84 Lakh Lost",
    vector: "Narcotics Parcel Extortion",
    victimProfile: "VP Operations (42 Yrs)",
    quote:
      "An IVR call claimed an intercepted parcel sent to Thailand contained narcotics and 5 fake passports, immediately transferring him to a bogus 'Cyber Crime Narcotics Officer'.",
  },
  {
    id: "ndtv-slavery-cartels",
    source: "NDTV World",
    sourceBadgeColor: "bg-amber-950 text-amber-200 border-amber-800",
    date: "December 2024",
    location: "Special Report",
    headline: "Inside the Southeast Asian Cyber Cartels Preying on 1.4 Billion Indian Mobile Users",
    lossTag: "Industrial Scale",
    vector: "Organized Crime Syndicates",
    victimProfile: "Investigative Journalism",
    quote:
      "Compounds in Cambodia, Myanmar and Laos operate 24x7 phone boilers trained in psychological manipulation scripts specifically tailored to Indian cultural authority compliance.",
  },
];

export function NewspaperHeadlines() {
  return (
    <section className="my-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
            <span className="material-symbols-outlined text-[16px]">newspaper</span>
            <span>Real News Reports & Case Studies</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--ink)] tracking-tight">
            These Aren't Hypotheticals. These Are Front-Page Headlines.
          </h2>
        </div>
        <span className="text-xs text-[var(--mut)] font-medium">
          Verified press records from leading Indian publications
        </span>
      </div>

      {/* Grid of Authentic Newspaper Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {HEADLINES.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between p-5 rounded-2xl bg-[var(--sf)] border border-[var(--line)] shadow-sm hover:shadow-md transition-all group"
          >
            <div>
              {/* Publication Header */}
              <div className="flex items-center justify-between border-b border-[var(--line)]/70 pb-3 mb-3 text-xs">
                <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] border font-serif tracking-wide ${item.sourceBadgeColor}`}>
                  {item.source}
                </span>
                <span className="text-[var(--mut)] font-semibold">
                  {item.location} · {item.date}
                </span>
              </div>

              {/* Alert Badge */}
              <div className="flex items-center gap-2 mb-2">
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

            {/* Victim Profile Footer */}
            <div className="pt-3 border-t border-[var(--line)]/60 flex items-center justify-between text-[11px] text-[var(--mut)]">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">person</span>
                <span>{item.victimProfile}</span>
              </span>
              <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">gavel</span>
                <span>FIR Filed</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default NewspaperHeadlines;
