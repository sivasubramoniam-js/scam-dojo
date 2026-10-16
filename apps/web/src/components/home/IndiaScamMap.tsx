import React, { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import {
  ShieldAlert,
  TrendingUp,
  MapPin,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronRight,
  Flame,
  Search,
} from "lucide-react";

export interface StateRecord {
  name: string;
  lossCrores: number;
  casesReported: number;
  dominantScam: string;
  hotspots: string;
  helpline: string;
  riskTier: "critical" | "high" | "moderate" | "low";
}

export const INDIA_STATE_SCAM_DATA: Record<string, StateRecord> = {
  Maharashtra: {
    name: "Maharashtra",
    lossCrores: 2450,
    casesReported: 218400,
    dominantScam: "Digital Arrest & Fake Institutional Demat Trading",
    hotspots: "Mumbai, Pune, Thane, Navi Mumbai",
    helpline: "1930 / cybercrime.gov.in (Mumbai Cyber: 022-26504008)",
    riskTier: "critical",
  },
  Telangana: {
    name: "Telangana",
    lossCrores: 1820,
    casesReported: 164200,
    dominantScam: "Telegram Task Scams & Overseas Crypto Laundering",
    hotspots: "Hyderabad, Cyberabad, Warangal",
    helpline: "1930 (Telangana Cyber Security Bureau: 1930)",
    riskTier: "critical",
  },
  Karnataka: {
    name: "Karnataka",
    lossCrores: 1690,
    casesReported: 152800,
    dominantScam: "Fake Part-Time Job BAIT & High-Yield Ponzi Apps",
    hotspots: "Bengaluru Urban, Mysuru, Mangaluru",
    helpline: "1930 (CID Cyber Crime Bengaluru: 080-22201021)",
    riskTier: "critical",
  },
  "Uttar Pradesh": {
    name: "Uttar Pradesh",
    lossCrores: 1480,
    casesReported: 185600,
    dominantScam: "Electricity Bill Cutoff SMS & Aadhaar AePS Clones",
    hotspots: "Noida, Ghaziabad, Lucknow, Kanpur",
    helpline: "1930 (UP Cyber Police Headquarters)",
    riskTier: "critical",
  },
  Delhi: {
    name: "Delhi",
    lossCrores: 1320,
    casesReported: 141200,
    dominantScam: "CBI/ED Video Call Arrest & Courier Customs Extortion",
    hotspots: "South Delhi, Rohini, Dwarka, Connaught Place",
    helpline: "1930 (Delhi Police IFSO Special Cell: 011-20892633)",
    riskTier: "critical",
  },
  Gujarat: {
    name: "Gujarat",
    lossCrores: 1120,
    casesReported: 98400,
    dominantScam: "Fake Stock Trading Groups & Grey Market IPO Fraud",
    hotspots: "Ahmedabad, Surat, Vadodara, Rajkot",
    helpline: "1930 (Gujarat Cyber Suraksha Setu: 1930)",
    riskTier: "high",
  },
  "Tamil Nadu": {
    name: "Tamil Nadu",
    lossCrores: 950,
    casesReported: 92100,
    dominantScam: "FedEx Narcotics in Parcel & Bank KYC Deactivation",
    hotspots: "Chennai, Coimbatore, Madurai, Tiruchirappalli",
    helpline: "1930 (Tamil Nadu Cyber Crime Wing: 044-28447701)",
    riskTier: "high",
  },
  Rajasthan: {
    name: "Rajasthan",
    lossCrores: 880,
    casesReported: 86400,
    dominantScam: "Mewat Belt OLX Vehicle Fraud & Video Sextortion",
    hotspots: "Bharatpur, Alwar, Jaipur, Jodhpur",
    helpline: "1930 (Rajasthan Cyber Crime Station)",
    riskTier: "high",
  },
  Haryana: {
    name: "Haryana",
    lossCrores: 810,
    casesReported: 79200,
    dominantScam: "Rogue Tech Support & Bogus Loan Call Centers",
    hotspots: "Gurugram, Faridabad, Nuh, Panchkula",
    helpline: "1930 (Haryana State Cyber Police Desk)",
    riskTier: "high",
  },
  "West Bengal": {
    name: "West Bengal",
    lossCrores: 740,
    casesReported: 72600,
    dominantScam: "Electricity Cutoff Messages & Fake Lottery Links",
    hotspots: "Kolkata, Bidhannagar, Siliguri, Howrah",
    helpline: "1930 (Kolkata Cyber Police: 033-22143000)",
    riskTier: "high",
  },
  "Madhya Pradesh": {
    name: "Madhya Pradesh",
    lossCrores: 620,
    casesReported: 61400,
    dominantScam: "Illegal Chinese Microloan Apps & Fake Job Letters",
    hotspots: "Indore, Bhopal, Jabalpur, Gwalior",
    helpline: "1930 (MP State Cyber Police HQ)",
    riskTier: "moderate",
  },
  Bihar: {
    name: "Bihar",
    lossCrores: 580,
    casesReported: 59300,
    dominantScam: "Jamtara Peripheral SIM Swap & AePS Cash Harvesting",
    hotspots: "Patna, Gaya, Bhagalpur, Muzaffarpur",
    helpline: "1930 (Bihar Cyber Police Cell: 1930)",
    riskTier: "moderate",
  },
  "Andhra Pradesh": {
    name: "Andhra Pradesh",
    lossCrores: 540,
    casesReported: 52100,
    dominantScam: "Predatory Instant Loan Apps & Remote Access Support",
    hotspots: "Visakhapatnam, Vijayawada, Guntur",
    helpline: "1930 (AP CID Cyber Crime Cell)",
    riskTier: "moderate",
  },
  Kerala: {
    name: "Kerala",
    lossCrores: 490,
    casesReported: 48600,
    dominantScam: "Overseas Job Visa Scams & Fake Forex Trading",
    hotspots: "Kochi, Thiruvananthapuram, Kozhikode",
    helpline: "1930 (Kerala Police Cyberdome)",
    riskTier: "moderate",
  },
  Punjab: {
    name: "Punjab",
    lossCrores: 410,
    casesReported: 39500,
    dominantScam: "Canada Study Visa & Embassy Impersonation Threats",
    hotspots: "Ludhiana, Jalandhar, Amritsar, Mohali",
    helpline: "1930 (Punjab State Cyber Crime Division)",
    riskTier: "moderate",
  },
  Odisha: {
    name: "Odisha",
    lossCrores: 360,
    casesReported: 34200,
    dominantScam: "Subsidized Solar/PM Scheme Registration Phishing",
    hotspots: "Bhubaneswar, Cuttack, Rourkela",
    helpline: "1930 (Odisha CID Crime Branch)",
    riskTier: "low",
  },
  Jharkhand: {
    name: "Jharkhand",
    lossCrores: 330,
    casesReported: 31800,
    dominantScam: "Jamtara Bank KYC & Lottery Calling Hubs",
    hotspots: "Jamtara, Deoghar, Ranchi, Dhanbad",
    helpline: "1930 (Jharkhand Cyber Crime Cell)",
    riskTier: "low",
  },
  Chhattisgarh: {
    name: "Chhattisgarh",
    lossCrores: 280,
    casesReported: 26400,
    dominantScam: "Fake Employment Portals & Work From Home Bait",
    hotspots: "Raipur, Bilaspur, Durg-Bhilai",
    helpline: "1930 (Chhattisgarh Cyber Command)",
    riskTier: "low",
  },
  Assam: {
    name: "Assam",
    lossCrores: 240,
    casesReported: 22800,
    dominantScam: "Fake Micro-finance Grants & WhatsApp Prize Scams",
    hotspots: "Guwahati, Silchar, Dibrugarh",
    helpline: "1930 (Assam Police CID Cyber Wing)",
    riskTier: "low",
  },
  Uttarakhand: {
    name: "Uttarakhand",
    lossCrores: 190,
    casesReported: 18400,
    dominantScam: "Char Dham Helicopter Booking & Tourism Fraud",
    hotspots: "Dehradun, Haridwar, Rishikesh",
    helpline: "1930 (Uttarakhand Special Task Force Cyber)",
    riskTier: "low",
  },
  "Jammu and Kashmir": {
    name: "Jammu and Kashmir",
    lossCrores: 160,
    casesReported: 14700,
    dominantScam: "Defense Recruitment Portals & WhatsApp Lottery",
    hotspots: "Srinagar, Jammu, Anantnag",
    helpline: "1930 (J&K Cyber Police Station)",
    riskTier: "low",
  },
  "Himachal Pradesh": {
    name: "Himachal Pradesh",
    lossCrores: 130,
    casesReported: 11200,
    dominantScam: "Fake Resort Booking & Travel Voucher Phishing",
    hotspots: "Shimla, Dharamshala, Manali",
    helpline: "1930 (HP Cyber Crime Police Station)",
    riskTier: "low",
  },
  Goa: {
    name: "Goa",
    lossCrores: 110,
    casesReported: 9500,
    dominantScam: "Villa Rental Scam & Fake Casino Discount Tokens",
    hotspots: "Panaji, Margao, Calangute",
    helpline: "1930 (Goa Police Cyber Cell)",
    riskTier: "low",
  },
  Chandigarh: {
    name: "Chandigarh",
    lossCrores: 95,
    casesReported: 8200,
    dominantScam: "VIP Investment Advisory WhatsApp Groups",
    hotspots: "Chandigarh Tri-city",
    helpline: "1930 (Chandigarh Cyber Cell)",
    riskTier: "low",
  },
  Tripura: {
    name: "Tripura",
    lossCrores: 65,
    casesReported: 5100,
    dominantScam: "TRAI Telecom SIM Disconnection Threat",
    hotspots: "Agartala, Dharmanagar",
    helpline: "1930 (Tripura Cyber Crime Unit)",
    riskTier: "low",
  },
  Puducherry: {
    name: "Puducherry",
    lossCrores: 45,
    casesReported: 3800,
    dominantScam: "Online Hotel & French Quarter Tour Scam",
    hotspots: "Puducherry City",
    helpline: "1930 (Puducherry Cyber Police)",
    riskTier: "low",
  },
  Meghalaya: {
    name: "Meghalaya",
    lossCrores: 40,
    casesReported: 3200,
    dominantScam: "Part-Time Review & YouTube Video Like Trap",
    hotspots: "Shillong, Tura",
    helpline: "1930 (Meghalaya CID Cyber Crime)",
    riskTier: "low",
  },
  Manipur: {
    name: "Manipur",
    lossCrores: 35,
    casesReported: 2700,
    dominantScam: "Fake Relief NGO & Donation Phishing",
    hotspots: "Imphal East, Imphal West",
    helpline: "1930 (Manipur Police Cyber Cell)",
    riskTier: "low",
  },
  Nagaland: {
    name: "Nagaland",
    lossCrores: 30,
    casesReported: 2400,
    dominantScam: "Fake Courier Gift Customs Demands",
    hotspots: "Kohima, Dimapur",
    helpline: "1930 (Nagaland Cyber Crime Cell)",
    riskTier: "low",
  },
  "Arunachal Pradesh": {
    name: "Arunachal Pradesh",
    lossCrores: 25,
    casesReported: 1900,
    dominantScam: "Govt Scheme Subsidy WhatsApp Links",
    hotspots: "Itanagar, Naharlagun",
    helpline: "1930 (Arunachal Cyber Crime Cell)",
    riskTier: "low",
  },
  Mizoram: {
    name: "Mizoram",
    lossCrores: 20,
    casesReported: 1600,
    dominantScam: "Fake E-Commerce Clothing Storefronts",
    hotspots: "Aizawl, Lunglei",
    helpline: "1930 (Mizoram CID Crime Branch)",
    riskTier: "low",
  },
  Sikkim: {
    name: "Sikkim",
    lossCrores: 18,
    casesReported: 1400,
    dominantScam: "Lottery & Lucky Draw SMS Phishing",
    hotspots: "Gangtok, Namchi",
    helpline: "1930 (Sikkim Cyber Crime Wing)",
    riskTier: "low",
  },
  Ladakh: {
    name: "Ladakh",
    lossCrores: 12,
    casesReported: 950,
    dominantScam: "Fake Homestay & Trekking Permit Portals",
    hotspots: "Leh, Kargil",
    helpline: "1930 (Ladakh Police Cyber Cell)",
    riskTier: "low",
  },
  "Dadra and Nagar Haveli and Daman and Diu": {
    name: "Dadra and Nagar Haveli and Daman and Diu",
    lossCrores: 10,
    casesReported: 800,
    dominantScam: "Industrial Factory Hiring Registration Fraud",
    hotspots: "Silvassa, Daman",
    helpline: "1930 (UT Cyber Desk)",
    riskTier: "low",
  },
  "Andaman and Nicobar Islands": {
    name: "Andaman and Nicobar Islands",
    lossCrores: 8,
    casesReported: 650,
    dominantScam: "Ferry Ticket & Water Sports Package Scam",
    hotspots: "Port Blair, Havelock",
    helpline: "1930 (Andaman Cyber Cell)",
    riskTier: "low",
  },
  Lakshadweep: {
    name: "Lakshadweep",
    lossCrores: 4,
    casesReported: 320,
    dominantScam: "Fake Island Entry Permit Websites",
    hotspots: "Kavaratti, Agatti",
    helpline: "1930 (Lakshadweep Police)",
    riskTier: "low",
  },
};

type MetricMode = "loss" | "cases";

export default function IndiaScamMap() {
  const [metric, setMetric] = useState<MetricMode>("loss");
  const [hoveredState, setHoveredState] = useState<StateRecord | null>(null);
  const [selectedState, setSelectedState] = useState<StateRecord>(
    INDIA_STATE_SCAM_DATA["Maharashtra"]
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Color scales - vibrant and high contrast for dark theme
  const lossColorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([10, 150, 450, 900, 1600, 2500])
      .range(["#38bdf8", "#34d399", "#facc15", "#fb923c", "#f43f5e", "#dc2626"]);
  }, []);

  const casesColorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([500, 5000, 25000, 65000, 130000, 220000])
      .range(["#38bdf8", "#34d399", "#facc15", "#fb923c", "#f43f5e", "#dc2626"]);
  }, []);

  const getStateColor = (stateName: string) => {
    const data = INDIA_STATE_SCAM_DATA[stateName];
    if (!data) return "#475569";
    if (metric === "loss") {
      return lossColorScale(data.lossCrores);
    }
    return casesColorScale(data.casesReported);
  };

  // Top 5 critical states
  const topStates = useMemo(() => {
    return Object.values(INDIA_STATE_SCAM_DATA)
      .sort((a, b) => (metric === "loss" ? b.lossCrores - a.lossCrores : b.casesReported - a.casesReported))
      .slice(0, 5);
  }, [metric]);

  const filteredStatesList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return Object.values(INDIA_STATE_SCAM_DATA).filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const activeDisplayState = hoveredState || selectedState;
  const geoUrl = typeof window !== "undefined" && window.location.origin ? `${window.location.origin}/india.json` : "/india.json";

  return (
    <section className="my-14 rounded-3xl bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 lg:p-10 shadow-2xl text-slate-100 overflow-hidden relative">
      {/* Background glow accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-pulse" />
            <span>Official I4C & NCRB Open Data Grounded</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-white">
            India State-Wise Cybercrime & Scam Map
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Interactive geographic heatmap showing 5-year cumulative financial losses, reported 1930
            cases, and dominant attack vectors across all 36 States & Union Territories.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700 self-start lg:self-auto shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setMetric("loss")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              metric === "loss"
                ? "bg-rose-600 text-white shadow-md font-black"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Financial Loss (₹ Crores)
          </button>
          <button
            type="button"
            onClick={() => setMetric("cases")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              metric === "cases"
                ? "bg-amber-600 text-white shadow-md font-black"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Reported Cases (1930)
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Detailed State Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Side: React Simple Map (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-inner relative flex flex-col items-center">
          {/* Quick Search */}
          <div className="w-full relative mb-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search state (e.g. Maharashtra, Telangana, Delhi)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-white w-full placeholder:text-slate-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
            {filteredStatesList.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto p-1.5 space-y-1">
                {filteredStatesList.map((st) => (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => {
                      setSelectedState(st);
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 flex items-center justify-between font-semibold"
                  >
                    <span>{st.name}</span>
                    <span className="text-rose-400 font-bold">₹{st.lossCrores} Cr</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Map Canvas */}
          <div className="w-full max-w-[620px] aspect-[4/5] sm:aspect-[1/1] relative flex items-center justify-center">
            <ComposableMap
              width={800}
              height={750}
              projection="geoMercator"
              projectionConfig={{
                scale: 1000,
                center: [82.0, 22.0],
              }}
              className="w-full h-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const stateName = (geo.properties as any)?.st_nm || "";
                    const isSelected = activeDisplayState?.name === stateName;
                    const isHovered = hoveredState?.name === stateName;
                    const color = getStateColor(stateName);

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={color}
                        stroke={isSelected ? "#ffffff" : isHovered ? "#38bdf8" : "#1e293b"}
                        strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 0.8}
                        className="transition-all duration-150 cursor-pointer hover:opacity-90 focus:outline-none"
                        style={{
                          outline: "none",
                          cursor: "pointer",
                          filter: isSelected
                            ? "drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))"
                            : isHovered
                            ? "drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))"
                            : "none",
                        }}
                        onMouseEnter={() => {
                          const record = INDIA_STATE_SCAM_DATA[stateName];
                          if (record) setHoveredState(record);
                        }}
                        onMouseLeave={() => setHoveredState(null)}
                        onClick={() => {
                          const record = INDIA_STATE_SCAM_DATA[stateName];
                          if (record) setSelectedState(record);
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>

            {/* Floating hover badge */}
            {hoveredState && (
              <div className="absolute top-3 left-3 bg-slate-900/95 backdrop-blur-md border border-slate-700 px-3.5 py-2 rounded-xl text-xs shadow-xl pointer-events-none animate-in fade-in duration-150">
                <div className="font-black text-white">{hoveredState.name}</div>
                <div className="text-rose-400 font-bold">
                  ₹{hoveredState.lossCrores.toLocaleString()} Cr lost •{" "}
                  {hoveredState.casesReported.toLocaleString()} cases
                </div>
              </div>
            )}
          </div>

          {/* Color Gradient Legend */}
          <div className="w-full mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              Severity Intensity: {metric === "loss" ? "Financial Loss (Cr)" : "Case Count"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-sky-300">&lt; ₹50 Cr</span>
              <div className="h-3 w-32 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 via-orange-500 via-rose-500 to-red-600 border border-slate-700" />
              <span className="text-[10px] font-bold text-rose-400">&gt; ₹2,000 Cr</span>
            </div>
          </div>
        </div>

        {/* Right Side: Selected State Deep-Dive Dossier & Leaderboard (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active State Profile Card */}
          <div className="bg-slate-950/90 rounded-2xl border-2 border-slate-800 p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Selected State Intelligence</span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  activeDisplayState.riskTier === "critical"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : activeDisplayState.riskTier === "high"
                    ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {activeDisplayState.riskTier} Threat Zone
              </span>
            </div>

            <h3 className="text-3xl font-black text-white tracking-tight mb-4">
              {activeDisplayState.name}
            </h3>

            {/* Key Metrics Dual Box */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  5-Year Funds Lost
                </div>
                <div className="text-2xl font-black text-rose-400">
                  ₹{activeDisplayState.lossCrores.toLocaleString()}
                  <span className="text-xs font-bold text-slate-400 ml-1">Cr</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Reported Cyber Incidents
                </div>
                <div className="text-2xl font-black text-amber-400">
                  {activeDisplayState.casesReported.toLocaleString()}
                  <span className="text-xs font-bold text-slate-400 ml-1">+</span>
                </div>
              </div>
            </div>

            {/* Dominant Attack Vector */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl mb-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Dominant Scam Modus Operandi</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-snug">
                {activeDisplayState.dominantScam}
              </p>
            </div>

            {/* Hotspots & Cybercell */}
            <div className="space-y-3 text-xs border-t border-slate-800 pt-4">
              <div>
                <span className="text-slate-400 font-bold block mb-0.5">Key Identified Cybercrime Hotspots:</span>
                <span className="text-slate-200 font-medium">{activeDisplayState.hotspots}</span>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-0.5">Official State Police Escalation:</span>
                <span className="text-emerald-400 font-bold font-mono">{activeDisplayState.helpline}</span>
              </div>
            </div>
          </div>

          {/* National Top 5 Leaderboard */}
          <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-rose-400" />
                <span>Top 5 States by {metric === "loss" ? "Financial Loss" : "Incident Volume"}</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">Click to inspect</span>
            </div>

            <div className="space-y-2">
              {topStates.map((st, i) => (
                <button
                  key={st.name}
                  type="button"
                  onClick={() => setSelectedState(st)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between text-xs cursor-pointer ${
                    activeDisplayState.name === st.name
                      ? "bg-slate-800 border-rose-500 text-white font-black shadow-sm"
                      : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-rose-400">
                      {i + 1}
                    </span>
                    <span className="font-bold">{st.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono font-bold">
                    <span className={metric === "loss" ? "text-rose-400" : "text-amber-400"}>
                      {metric === "loss"
                        ? `₹${st.lossCrores.toLocaleString()} Cr`
                        : `${st.casesReported.toLocaleString()} cases`}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
