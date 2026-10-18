import React, { useState } from "react";
import { useT } from "@/lib/i18n";

export function NewsletterPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const bulletins = [
    {
      id: "ZD-2026-14",
      date: "Oct 12, 2026",
      tag: "Critical Threat",
      tagColor: "bg-danger-beni text-action-ink",
      title: "Digital Arrest 2.0: Deepfake CBI Supreme Court Orders",
      desc: "Syndicates are now presenting forged Supreme Court digital stamps with live deepfake judges on WhatsApp video calls demanding 'investigation deposits' into safe escrow accounts.",
      defense: "Never accept court summons via WhatsApp. Supreme Court and High Courts do not issue digital arrest bails.",
    },
    {
      id: "ZD-2026-11",
      date: "Oct 05, 2026",
      tag: "High Alert",
      tagColor: "bg-caution-kihada text-action-ink",
      title: "Customs APK Parcel Scam with Malicious Accessibility Droppers",
      desc: "SMS alerts claiming FedEx / India Post held a parcel containing contraband narcotics. Victims are told to download a tracking APK that silently intercepts OTP SMS messages.",
      defense: "India Post and FedEx will never send .apk install links over SMS. Check tracking numbers on official domain only.",
    },
    {
      id: "ZD-2026-08",
      date: "Sep 28, 2026",
      tag: "Financial Fraud",
      tagColor: "bg-action-ai text-action-ink",
      title: "IPO Allotment & High-Yield Institutional Trading Groups",
      desc: "Victims are added to WhatsApp groups offering 'Special Institutional Quota' for oversubscribed IPOs with fake trading apps showing artificial profits.",
      defense: "Institutional IPO allocations can only be made through SEBI-registered ASBA bank accounts. Never transfer funds to personal current accounts.",
    },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <div className="max-w-[1240px] mx-auto w-full px-2 sm:px-4 lg:px-gutter-desktop py-6 lg:py-space-xl">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container border border-line-ito/40 rounded-full w-fit">
          <span className="material-symbols-outlined text-action-ai text-[16px]">
            mark_email_unread
          </span>
          <span className="font-label-sm text-xs font-bold text-ink-aizome">
            {t("news.tag")}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink-aizome font-extrabold tracking-tight">
          {t("news.title")}
        </h1>
        <p className="font-body-lg text-xs sm:text-base text-ink-sumi max-w-2xl leading-relaxed">
          {t("news.desc")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-space-xl items-start">
        {/* LEFT COLUMN: Intelligence Bulletins (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {bulletins.map((b) => (
            <div
              key={b.id}
              className="bg-surface-shoji rounded-xl p-4 sm:p-6 border border-line-ito shadow-dojo"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line-ito/40 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${b.tagColor}`}>
                    {b.tag}
                  </span>
                  <span className="font-mono text-xs text-ink-sumi">{b.id}</span>
                </div>
                <span className="text-xs text-ink-sumi">{b.date}</span>
              </div>

              <h3 className="font-headline-sm text-base sm:text-lg font-bold text-ink-aizome">
                {b.title}
              </h3>
              <p className="text-xs sm:text-sm text-ink-sumi mt-2 leading-relaxed">
                {b.desc}
              </p>

              <div className="mt-4 p-3 bg-surface-container-low rounded-lg border border-line-ito/50 text-xs text-ink-aizome">
                <span className="font-bold text-action-ai block mb-0.5">
                  {t("news.stance")}
                </span>
                {b.defense}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: Subscription Form & Dispatch Frequency (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface-shoji rounded-xl p-4 sm:p-6 border border-line-ito shadow-dojo">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-action-ai text-[22px]">
                mail
              </span>
              <h3 className="font-headline-sm text-base font-bold text-ink-aizome">
                {t("news.join.title")}
              </h3>
            </div>
            <p className="text-xs text-ink-sumi leading-relaxed mb-4">
              {t("news.join.desc")}
            </p>

            {subscribed ? (
              <div className="p-4 bg-safe-matcha/10 border border-safe-matcha/30 rounded-xl text-xs text-ink-aizome">
                <span className="font-bold block text-safe-matcha mb-1">
                  {t("news.join.confirmed")}
                </span>
                {t("news.join.enrolled")}
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("news.join.placeholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-line-ito text-xs text-ink-aizome focus:outline-none focus:border-action-ai focus:ring-2 focus:ring-action-ai/20 transition-all min-h-[44px]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-action-ai text-action-ink text-xs font-bold hover:opacity-95 shadow-xs transition-opacity min-h-[44px] cursor-pointer"
                >
                  {t("news.join.submit")}
                </button>
              </form>
            )}

            <div className="mt-4 pt-3 border-t border-line-ito/40 flex items-center gap-2 text-[11px] text-ink-sumi">
              <span className="material-symbols-outlined text-[15px] text-safe-matcha">
                verified
              </span>
              <span>{t("news.join.nospam")}</span>
            </div>
          </div>

          <div className="bg-surface-container-high rounded-xl p-4 border border-line-ito/40 text-xs text-ink-aizome">
            <span className="font-bold block mb-1">{t("news.sources.title")}</span>
            {t("news.sources.desc")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewsletterPage;
