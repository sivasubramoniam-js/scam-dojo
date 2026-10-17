import React, { useState } from "react";
import { PhoneCall, Building2, ExternalLink, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useT } from "@/lib/i18n";

interface BankDetail {
  name: string;
  phone: string;
  tollFree?: string;
  smsBlockCode?: string;
  portalUrl: string;
  tag: string;
}

const TOP_BANKS: BankDetail[] = [
  {
    name: "State Bank of India (SBI)",
    phone: "1800 11 1109",
    tollFree: "1800 1234",
    smsBlockCode: "SMS 'BLOCK <last 4 digits>' to 567676",
    portalUrl: "https://www.onlinesbi.sbi",
    tag: "Public",
  },
  {
    name: "HDFC Bank",
    phone: "1800 2586 161",
    tollFree: "1800 266 4332",
    smsBlockCode: "Call hotline or via HDFC MobileBanking app immediately",
    portalUrl: "https://www.hdfcbank.com",
    tag: "Private",
  },
  {
    name: "ICICI Bank",
    phone: "1800 1080",
    tollFree: "1800 200 3344",
    smsBlockCode: "SMS 'BLOCK <last 4 digits>' to 9215676766",
    portalUrl: "https://www.icicibank.com",
    tag: "Private",
  },
  {
    name: "Axis Bank",
    phone: "1860 419 5555",
    tollFree: "1860 500 5555",
    smsBlockCode: "SMS 'BLOCKCARD' to 56161600",
    portalUrl: "https://www.axisbank.com",
    tag: "Private",
  },
  {
    name: "Punjab National Bank (PNB)",
    phone: "1800 180 2222",
    tollFree: "1800 103 2222",
    smsBlockCode: "SMS 'HOT <CardNo>' to 5607040",
    portalUrl: "https://www.pnbindia.in",
    tag: "Public",
  },
  {
    name: "Kotak Mahindra Bank",
    phone: "1860 266 2666",
    tollFree: "1800 209 0000",
    smsBlockCode: "Call 1860 266 2666 option 1 for instant freeze",
    portalUrl: "https://www.kotak.com",
    tag: "Private",
  },
  {
    name: "Bank of Baroda (BoB)",
    phone: "1800 5700",
    tollFree: "1800 258 4455",
    smsBlockCode: "SMS 'BLOCK <last 4 digits>' to 8422009988",
    portalUrl: "https://www.bankofbaroda.in",
    tag: "Public",
  },
  {
    name: "Canara Bank",
    phone: "1800 425 0018",
    tollFree: "1800 103 0018",
    smsBlockCode: "SMS 'CAN <last 4 digits>' to 9266623333",
    portalUrl: "https://www.canarabank.com",
    tag: "Public",
  },
];

export function BankFreezeDirectory() {
  const { t } = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredBanks = TOP_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/40 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>{t("freeze.title")}</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {t("freeze.hotlines")}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("freeze.desc")}
            </p>
          </div>
        </div>
        <div className="text-muted-foreground shrink-0 pl-2">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 pt-0 border-t border-border space-y-4">
          <div className="pt-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("freeze.search")}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredBanks.map((b) => (
              <div
                key={b.name}
                className="p-3.5 rounded-xl border border-border bg-muted/20 hover:border-primary/50 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span className="text-xs">{b.name}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                    {b.tag}
                  </span>
                </div>

                <div className="space-y-1 text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{t("freeze.fraud_desk")}</span>
                    <a
                      href={`tel:${b.phone.replace(/\s+/g, "")}`}
                      className="font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{b.phone}</span>
                    </a>
                  </div>

                  {b.tollFree && (
                    <div className="flex items-center justify-between">
                      <span>{t("freeze.toll_free")}</span>
                      <a
                        href={`tel:${b.tollFree.replace(/\s+/g, "")}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {b.tollFree}
                      </a>
                    </div>
                  )}

                  {b.smsBlockCode && (
                    <div className="text-[11px] pt-1 border-t border-border/50 text-muted-foreground">
                      <Lock className="w-3 h-3 inline mr-1 text-rose-500" />
                      <span>{b.smsBlockCode}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/60">
            {t("freeze.protip")}
          </div>
        </div>
      )}
    </div>
  );
}

export default BankFreezeDirectory;
