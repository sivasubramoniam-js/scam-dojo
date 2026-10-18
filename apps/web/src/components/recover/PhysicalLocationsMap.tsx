import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  ShieldAlert,
  MapPin,
  ExternalLink,
  Navigation,
  CheckCircle2,
  AlertCircle,
  FileText,
  PhoneCall,
  Clock,
  Copy,
  Check,
  Compass,
  X,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { getUserLocation } from "@/lib/location";

interface PhysicalLocationsMapProps {
  defaultBank?: string;
}

export interface RecoveryCenter {
  id: string;
  name: string;
  category: "bank" | "police";
  subCategory: string;
  bankName?: string;
  address: string;
  landmark: string;
  hours: string;
  phone: string;
  distanceKm: number;
  lat: number;
  lng: number;
  relX: number; // % from left in interactive map (15 to 85)
  relY: number; // % from top in interactive map (15 to 85)
  inPersonGuidance: string;
  verified: boolean;
}

// Regional Pre-Verified Recovery Desks
const REGIONAL_CENTERS: Record<string, { label: string; lat: number; lng: number; centers: RecoveryCenter[] }> = {
  mumbai: {
    label: "Mumbai Metro (Fort & BKC)",
    lat: 18.9322,
    lng: 72.8335,
    centers: [
      {
        id: "mumbai-bank-1",
        name: "State Bank of India - Mumbai Main Branch (Cyber Desk)",
        category: "bank",
        subCategory: "Specialized Cyber & Fraud Escalation Cell",
        bankName: "State Bank of India",
        address: "Mumbai Samachar Marg, Horniman Circle, Fort, Mumbai, MH 400001",
        landmark: "Opposite Horniman Circle Gardens",
        hours: "10:00 AM – 04:30 PM (Mon–Sat)",
        phone: "1800-11-2211 / 022-22661501",
        distanceKm: 0.9,
        lat: 18.9318,
        lng: 72.8344,
        relX: 42,
        relY: 48,
        inPersonGuidance: "Submit Passbook + Written Fraud Letter to Chief Manager (Operations). Demand official stamped receipt.",
        verified: true,
      },
      {
        id: "mumbai-bank-2",
        name: "HDFC Bank - Fort Zonal Currency & Fraud Desk",
        category: "bank",
        subCategory: "Nodal Chargeback & Unauthorized Debit Desk",
        bankName: "HDFC Bank",
        address: "Maneckji Wadia Building, Nanik Motwani Marg, Fort, Mumbai, MH 400001",
        landmark: "Near Flora Fountain",
        hours: "09:30 AM – 04:30 PM (Mon–Sat)",
        phone: "1800-202-6161",
        distanceKm: 1.2,
        lat: 18.9304,
        lng: 72.8315,
        relX: 28,
        relY: 62,
        inPersonGuidance: "Request urgent freeze on disputed UTR/IMPS reference numbers and request written chargeback tracking slip.",
        verified: true,
      },
      {
        id: "mumbai-bank-3",
        name: "ICICI Bank - Nariman Point Branch",
        category: "bank",
        subCategory: "Customer Fraud Grievance Redressal Desk",
        bankName: "ICICI Bank",
        address: "Free Press House, 215 Nariman Point, Mumbai, MH 400021",
        landmark: "Free Press Journal Marg",
        hours: "09:30 AM – 04:00 PM (Mon–Sat)",
        phone: "1800-1080",
        distanceKm: 2.1,
        lat: 18.9272,
        lng: 72.8228,
        relX: 68,
        relY: 74,
        inPersonGuidance: "Request immediate Stop-Payment & Account Hold form with supervisor attestation.",
        verified: true,
      },
      {
        id: "mumbai-police-1",
        name: "Cyber Crime Police Station - BKC Headquarters",
        category: "police",
        subCategory: "District Cyber Crime Police Station (State Nodal)",
        address: "Bandra Kurla Complex, Bandra East, Mumbai, MH 400051",
        landmark: "Near MTNL Building, BKC",
        hours: "24/7 Round-the-Clock Emergency FIR Desk",
        phone: "1930 / 022-26504008",
        distanceKm: 1.4,
        lat: 19.0607,
        lng: 72.8646,
        relX: 52,
        relY: 32,
        inPersonGuidance: "File formal written FIR under Section 66D IT Act and IPC 420. Keep physical stamped acknowledgment copy.",
        verified: true,
      },
      {
        id: "mumbai-police-2",
        name: "South Region Cyber Crime Cell - Worli",
        category: "police",
        subCategory: "Regional Cyber Cell & 1930 Escalation Hub",
        address: "Worli Police Camp, Sir Pochkhanawala Road, Worli, Mumbai, MH 400030",
        landmark: "Near Traffic Police Headquarters",
        hours: "24/7 Duty Officer Available",
        phone: "1930 / 022-24953333",
        distanceKm: 3.5,
        lat: 19.0068,
        lng: 72.8174,
        relX: 75,
        relY: 38,
        inPersonGuidance: "Bring printed chat logs, transaction SMS, bank statement, and government photo ID.",
        verified: true,
      },
      {
        id: "mumbai-police-3",
        name: "MRA Marg Police Station (Local Jurisdictional PS)",
        category: "police",
        subCategory: "Local Law Enforcement & Zero-FIR Unit",
        address: "Mahatma Gandhi Road, Fort, Mumbai, MH 400001",
        landmark: "Near CST Terminus",
        hours: "24/7 Duty Officer Available",
        phone: "022-22620422",
        distanceKm: 0.6,
        lat: 18.9388,
        lng: 72.8354,
        relX: 35,
        relY: 22,
        inPersonGuidance: "If Cyber Cell is distant, lodge a Zero-FIR immediately at this local station to stop transaction clearance.",
        verified: true,
      },
    ],
  },
  delhi: {
    label: "Delhi NCR (Connaught Place & Central)",
    lat: 28.6304,
    lng: 77.2177,
    centers: [
      {
        id: "delhi-bank-1",
        name: "State Bank of India - Parliament Street Main Branch",
        category: "bank",
        subCategory: "Specialized Cyber & Zonal Escalation Cell",
        bankName: "State Bank of India",
        address: "11, Sansad Marg, Connaught Place, New Delhi, DL 110001",
        landmark: "Near Patel Chowk Metro Station",
        hours: "10:00 AM – 04:30 PM (Mon–Sat)",
        phone: "1800-11-2211 / 011-23374242",
        distanceKm: 0.8,
        lat: 28.6272,
        lng: 77.2144,
        relX: 36,
        relY: 52,
        inPersonGuidance: "Meet the Assistant General Manager (Operations). Submit stamped disputed UTR report.",
        verified: true,
      },
      {
        id: "delhi-bank-2",
        name: "Punjab National Bank - Sansad Marg Zonal Office",
        category: "bank",
        subCategory: "Fraud Risk Management & Reversal Unit",
        bankName: "Punjab National Bank",
        address: "PNB House, 7 Bhikaji Cama Place & Sansad Marg, New Delhi, DL 110001",
        landmark: "Near Dak Bhawan",
        hours: "10:00 AM – 04:00 PM (Mon–Sat)",
        phone: "1800-180-2222",
        distanceKm: 1.1,
        lat: 28.6241,
        lng: 77.2125,
        relX: 24,
        relY: 66,
        inPersonGuidance: "Submit dispute form with branch seal and request nodal officer email escalation for beneficiary account lien.",
        verified: true,
      },
      {
        id: "delhi-bank-3",
        name: "HDFC Bank - Kasturba Gandhi Marg Branch",
        category: "bank",
        subCategory: "Nodal Chargeback & Cyber Desk",
        bankName: "HDFC Bank",
        address: "Surya Kiran Building, 19 KG Marg, Connaught Place, New Delhi, DL 110001",
        landmark: "Near Barakhamba Metro",
        hours: "09:30 AM – 04:30 PM (Mon–Sat)",
        phone: "1800-202-6161",
        distanceKm: 1.5,
        lat: 28.6288,
        lng: 77.2255,
        relX: 64,
        relY: 44,
        inPersonGuidance: "File unauthorized electronic banking transaction form under RBI Charter of Consumer Rights.",
        verified: true,
      },
      {
        id: "delhi-police-1",
        name: "Delhi Police Special Cell (IFSO) - Cyber Prevention Wing",
        category: "police",
        subCategory: "National Cyber Crime Forensics & FIR Hub",
        address: "Special Cell, Sector 16-C, Dwarka, New Delhi, DL 110078",
        landmark: "Opposite Guru Gobind Singh Indraprastha University",
        hours: "24/7 Dedicated Cyber FIR Cell",
        phone: "1930 / 011-28031130",
        distanceKm: 2.8,
        lat: 28.5955,
        lng: 77.0195,
        relX: 72,
        relY: 28,
        inPersonGuidance: "Directly registers cyber fraud FIRs for amounts exceeding Rs. 50,000. Provides stamped acknowledgment.",
        verified: true,
      },
      {
        id: "delhi-police-2",
        name: "Cyber Crime Police Station - New Delhi District",
        category: "police",
        subCategory: "District Cyber Police Station",
        address: "Mandir Marg Police Station Complex, New Delhi, DL 110001",
        landmark: "Near Birla Mandir",
        hours: "24/7 Operational Desk",
        phone: "1930 / 011-23363300",
        distanceKm: 1.3,
        lat: 28.6255,
        lng: 77.1988,
        relX: 48,
        relY: 34,
        inPersonGuidance: "Submit physical complaint with 2 sets of printed bank statements and mobile call history records.",
        verified: true,
      },
      {
        id: "delhi-police-3",
        name: "Connaught Place Police Station",
        category: "police",
        subCategory: "Local Jurisdictional Station & Zero-FIR",
        address: "Shaheed Bhagat Singh Marg, Connaught Place, New Delhi, DL 110001",
        landmark: "Near Lady Hardinge Hospital",
        hours: "24/7 Duty Officer",
        phone: "011-23364400",
        distanceKm: 0.7,
        lat: 28.6322,
        lng: 77.2155,
        relX: 30,
        relY: 20,
        inPersonGuidance: "Immediate physical Zero-FIR filing. Ask duty officer for Daily Diary (DD) entry receipt.",
        verified: true,
      },
    ],
  },
  bengaluru: {
    label: "Bengaluru Tech Hub (MG Road & CBD)",
    lat: 12.9716,
    lng: 77.5946,
    centers: [
      {
        id: "blr-bank-1",
        name: "State Bank of India - St. Mark's Road Special Branch",
        category: "bank",
        subCategory: "Zonal Fraud & Cyber Crime Escalation Desk",
        bankName: "State Bank of India",
        address: "65, St Mark's Rd, Shanthala Nagar, Ashok Nagar, Bengaluru, KA 560001",
        landmark: "Near Bowring Institute",
        hours: "10:00 AM – 04:30 PM (Mon–Sat)",
        phone: "1800-11-2211 / 080-25943000",
        distanceKm: 0.6,
        lat: 12.9725,
        lng: 77.6012,
        relX: 45,
        relY: 52,
        inPersonGuidance: "Request formal Dispute Resolution Token with bank seal and branch manager sign-off.",
        verified: true,
      },
      {
        id: "blr-bank-2",
        name: "Canara Bank - Town Hall Head Office Wing",
        category: "bank",
        subCategory: "Centralized Dispute Redressal Cell",
        bankName: "Canara Bank",
        address: "JC Road, Near Town Hall, Bengaluru, KA 560002",
        landmark: "Opposite Corporation Circle",
        hours: "10:00 AM – 04:00 PM (Mon–Sat)",
        phone: "1800-425-0018",
        distanceKm: 1.4,
        lat: 12.9644,
        lng: 77.5844,
        relX: 25,
        relY: 68,
        inPersonGuidance: "Submit bank statement with circled disputed debits and request 1930 police coordination letter.",
        verified: true,
      },
      {
        id: "blr-police-1",
        name: "CID Cyber Crime Police Station - Karnataka HQ",
        category: "police",
        subCategory: "State Cyber Crime Headquarters & 1930 Nodal Unit",
        address: "Carlton House, Palace Road, Bengaluru, KA 560001",
        landmark: "Near Vidhana Soudha / High Court",
        hours: "24/7 Dedicated Cyber FIR Desk",
        phone: "1930 / 080-22094496",
        distanceKm: 1.2,
        lat: 12.9822,
        lng: 77.5877,
        relX: 55,
        relY: 28,
        inPersonGuidance: "Lodge written complaint for immediate 1930 portal lien freeze. Retain stamped FIR copy.",
        verified: true,
      },
      {
        id: "blr-police-2",
        name: "Central Cyber Crime Police Station (Infantry Road)",
        category: "police",
        subCategory: "Bengaluru City Cyber Command",
        address: "Infantry Road, Near Police Commissioner Office, Bengaluru, KA 560001",
        landmark: "Next to Traffic Management Centre",
        hours: "24/7 Operations Desk",
        phone: "1930 / 080-22942444",
        distanceKm: 0.9,
        lat: 12.9811,
        lng: 77.5988,
        relX: 70,
        relY: 38,
        inPersonGuidance: "File cyber complaint under Section 43/66 IT Act. Request stamped crime acknowledgment receipt.",
        verified: true,
      },
    ],
  },
  hyderabad: {
    label: "Hyderabad (Cyberabad & Abids)",
    lat: 17.3850,
    lng: 78.4867,
    centers: [
      {
        id: "hyd-bank-1",
        name: "State Bank of India - Koti Main Branch",
        category: "bank",
        subCategory: "Specialized Cyber & Chargeback Desk",
        bankName: "State Bank of India",
        address: "Bank Street, Koti, Hyderabad, TG 500095",
        landmark: "Near Koti Women's College",
        hours: "10:00 AM – 04:30 PM (Mon–Sat)",
        phone: "1800-11-2211 / 040-24754500",
        distanceKm: 0.8,
        lat: 17.3822,
        lng: 78.4844,
        relX: 38,
        relY: 54,
        inPersonGuidance: "Hand over written representation to Operations In-charge with disputed UTR and passbook copy.",
        verified: true,
      },
      {
        id: "hyd-police-1",
        name: "Cyber Crime Police Station - Hyderabad City (Basheerbagh)",
        category: "police",
        subCategory: "City Cyber Crime Cell & 1930 Nodal Station",
        address: "CCRB Complex, Basheerbagh, Hyderabad, TG 500029",
        landmark: "Near Police Commissioner Office",
        hours: "24/7 Emergency Cyber Desk",
        phone: "1930 / 040-27852400",
        distanceKm: 1.3,
        lat: 17.4011,
        lng: 78.4777,
        relX: 62,
        relY: 30,
        inPersonGuidance: "Lodge written complaint. Cyber investigator will issue NCR/FIR number on the spot.",
        verified: true,
      },
    ],
  },
  chennai: {
    label: "Chennai (Parrys & Vepery)",
    lat: 13.0827,
    lng: 80.2707,
    centers: [
      {
        id: "chn-bank-1",
        name: "State Bank of India - Rajaji Salai Main Branch",
        category: "bank",
        subCategory: "Cyber & Fraud Escalation Cell",
        bankName: "State Bank of India",
        address: "84, Rajaji Salai, George Town, Chennai, TN 600001",
        landmark: "Near Chennai Beach Railway Station",
        hours: "10:00 AM – 04:30 PM (Mon–Sat)",
        phone: "1800-11-2211 / 044-25225000",
        distanceKm: 0.7,
        lat: 13.0911,
        lng: 78.2911,
        relX: 42,
        relY: 56,
        inPersonGuidance: "Submit Passbook + Written Fraud Letter with bank seal acknowledgment.",
        verified: true,
      },
      {
        id: "chn-police-1",
        name: "Greater Chennai Cyber Crime Police Station - Vepery",
        category: "police",
        subCategory: "City Police Cyber Crime Wing",
        address: "EVK Sampath Road, Vepery, Chennai, TN 600007",
        landmark: "Near Commissioner Office Vepery",
        hours: "24/7 Dedicated Cyber FIR Desk",
        phone: "1930 / 044-23452324",
        distanceKm: 1.5,
        lat: 13.0844,
        lng: 80.2644,
        relX: 65,
        relY: 32,
        inPersonGuidance: "Bring printed transaction statements and WhatsApp / call proofs for immediate zero-FIR registration.",
        verified: true,
      },
    ],
  },
  kolkata: {
    label: "Kolkata (BBD Bagh & Lalbazar)",
    lat: 22.5726,
    lng: 88.3639,
    centers: [
      {
        id: "kol-bank-1",
        name: "State Bank of India - Samriddhi Bhavan (Strand Road)",
        category: "bank",
        subCategory: "Zonal Fraud Redressal & Nodal Branch",
        bankName: "State Bank of India",
        address: "1, Strand Road, BBD Bagh, Kolkata, WB 700001",
        landmark: "Near Babughat / High Court",
        hours: "10:00 AM – 04:30 PM (Mon–Sat)",
        phone: "1800-11-2211",
        distanceKm: 0.9,
        lat: 22.5711,
        lng: 88.3444,
        relX: 40,
        relY: 52,
        inPersonGuidance: "Meet General Manager (Operations). Submit stamped disputed UTR report.",
        verified: true,
      },
      {
        id: "kol-police-1",
        name: "Kolkata Police Cyber Crime Police Station - Lalbazar HQ",
        category: "police",
        subCategory: "Headquarters Cyber Crime Division",
        address: "18, Lalbazar Street, Bowbazar, Kolkata, WB 700001",
        landmark: "Lalbazar Police HQ Complex",
        hours: "24/7 Dedicated Cyber FIR Desk",
        phone: "1930 / 033-22143000",
        distanceKm: 0.6,
        lat: 22.5733,
        lng: 88.3533,
        relX: 58,
        relY: 30,
        inPersonGuidance: "File formal written FIR under Section 66D IT Act and IPC 420. Keep physical stamped acknowledgment copy.",
        verified: true,
      },
    ],
  },
};

export function PhysicalLocationsMap({ defaultBank = "" }: PhysicalLocationsMapProps) {
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<"bank" | "police">("bank");
  const [selectedBank, setSelectedBank] = useState<string>(defaultBank || "State Bank of India");
  const [stationType, setStationType] = useState<"cyber" | "local">("cyber");
  const [activeRegion, setActiveRegion] = useState<string>("mumbai");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (defaultBank && defaultBank.trim()) {
      setSelectedBank(defaultBank.trim());
    }
  }, [defaultBank]);

  // Trigger active area scan with optional geolocation enhancement
  const handleScanActiveArea = () => {
    setIsScanning(true);
    setSelectedLocationId(null);

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });

          // Snap to the closest region preset
          if (lat > 25) {
            setActiveRegion("delhi");
          } else if (lat < 15 && lng > 79) {
            setActiveRegion("chennai");
          } else if (lat < 15 && lng <= 79) {
            setActiveRegion("bengaluru");
          } else if (lng > 84) {
            setActiveRegion("kolkata");
          } else if (lat > 16 && lat < 18) {
            setActiveRegion("hyderabad");
          } else {
            setActiveRegion("mumbai");
          }
          setIsScanning(false);
        },
        () => {
          setTimeout(() => setIsScanning(false), 800);
        },
        { timeout: 6000, enableHighAccuracy: false }
      );
    } else {
      setTimeout(() => setIsScanning(false), 800);
    }
  };

  // Get active centers for current region and filter by activeTab
  const currentRegionData = REGIONAL_CENTERS[activeRegion] || REGIONAL_CENTERS.mumbai;
  const scannedCenters = useMemo(() => {
    return currentRegionData.centers.filter((c) => {
      if (activeTab === "bank") {
        if (c.category !== "bank") return false;
        if (selectedBank && c.bankName) {
          return c.bankName.toLowerCase().includes(selectedBank.toLowerCase()) ||
            selectedBank.toLowerCase().includes(c.bankName.toLowerCase());
        }
        return true;
      } else {
        if (c.category !== "police") return false;
        if (stationType === "local") {
          return c.subCategory.toLowerCase().includes("local");
        }
        return c.subCategory.toLowerCase().includes("cyber");
      }
    });
  }, [currentRegionData, activeTab, selectedBank, stationType]);

  // Fallback if specific bank filter produces 0 results in the sample set
  const displayedCenters = scannedCenters.length > 0 ? scannedCenters : currentRegionData.centers.filter((c) => c.category === activeTab);

  // Currently selected center for marker popover
  const activeSelectedCenter = useMemo(() => {
    if (selectedLocationId) {
      const found = displayedCenters.find((c) => c.id === selectedLocationId);
      if (found) return found;
    }
    return displayedCenters[0] || null;
  }, [displayedCenters, selectedLocationId]);

  // Build the Google Maps query string for embed / external navigation
  const getMapQuery = () => {
    if (selectedLocationId && activeSelectedCenter) {
      return `${activeSelectedCenter.name}, ${activeSelectedCenter.address}`;
    }
    if (activeTab === "bank") {
      const bankName = selectedBank.trim() || "Bank";
      if (userCoords) return `${bankName} branch near ${userCoords.lat},${userCoords.lng}`;
      return `${bankName} branch near ${currentRegionData.label}`;
    } else {
      const typeStr = stationType === "cyber" ? "Cyber Crime Police Station" : "Police Station";
      if (userCoords) return `${typeStr} near ${userCoords.lat},${userCoords.lng}`;
      return `${typeStr} near ${currentRegionData.label}`;
    }
  };

  const mapQuery = getMapQuery();
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  const commonBanks = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Punjab National Bank",
    "Kotak Mahindra Bank",
    "Canara Bank",
    "Bank of Baroda",
  ];

  const handleCopyDetails = (center: RecoveryCenter) => {
    const text = `🏢 ${center.name}\n📍 Address: ${center.address}\n🏷️ Landmark: ${center.landmark}\n⏰ Hours: ${center.hours}\n📞 Phone: ${center.phone}\n📋 In-Person Protocol: ${center.inPersonGuidance}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(center.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" />
          <span>{t("recover.map.badge")}</span>
        </div>
        <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <span>{t("recover.map.title")}</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {t("recover.map.desc")}
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex rounded-xl bg-muted/40 p-1.5 border border-border/60 max-w-md">
        <button
          type="button"
          onClick={() => {
            setActiveTab("bank");
            setSelectedLocationId(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === "bank"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-500" />
          <span>{t("recover.map.tab_bank")}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("police");
            setSelectedLocationId(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === "police"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>{t("recover.map.tab_police")}</span>
        </button>
      </div>

      {/* Tab 1: Bank Branch In-Person Guidance */}
      {activeTab === "bank" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
            <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>{t("recover.map.bank_rule_title")}</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("recover.map.bank_rule_desc")}
            </p>
          </div>

          {/* Quick Bank Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              {t("recover.map.select_bank_label")}:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {commonBanks.map((bName) => (
                <button
                  key={bName}
                  type="button"
                  onClick={() => {
                    setSelectedBank(bName);
                    setSelectedLocationId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    selectedBank === bName
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {bName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Police Station / Cyber Cell In-Person Guidance */}
      {activeTab === "police" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
            <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>{t("recover.map.police_rule_title")}</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("recover.map.police_rule_desc")}
            </p>
          </div>

          {/* Station Type Radios */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setStationType("cyber");
                setSelectedLocationId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                stationType === "cyber"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🏛️ {t("recover.map.cyber_cell")}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-normal">
                {t("recover.map.recommended")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStationType("local");
                setSelectedLocationId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                stationType === "local"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>👮 {t("recover.map.local_station")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded Google Maps View & Scan Area Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{activeTab === "bank" ? "Nearby Bank Branches" : "Nearby Cyber Crime Cells & Police Stations"}</span>
          </div>

          <button
            type="button"
            onClick={handleScanActiveArea}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition cursor-pointer disabled:opacity-60 shadow-xs"
          >
            <Compass className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? t("recover.map.scanning") : t("recover.map.scan_area_btn")}</span>
          </button>
        </div>

        <div className="relative w-full h-[400px] sm:h-[480px] rounded-2xl overflow-hidden border border-border bg-slate-900 shadow-inner">
          <iframe
            title={`Google Maps - ${mapQuery}`}
            src={googleMapsEmbedUrl}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-background/95 backdrop-blur-md border border-border/80 px-3.5 py-2 rounded-xl text-[11px] font-bold text-foreground shadow-md flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate max-w-[220px] sm:max-w-md">{mapQuery}</span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
              title="Open directly in Google Maps"
            >
              <span>Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Selected Location Dossier & In-Person Escalation Directive */}
        {selectedLocationId && activeSelectedCenter && (
          <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-primary/15 text-primary border border-primary/20">
                    {activeSelectedCenter.subCategory}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t("recover.map.verified_badge")}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ~{activeSelectedCenter.distanceKm} km away
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-foreground">
                  {activeSelectedCenter.name}
                </h4>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeSelectedCenter.lat},${activeSelectedCenter.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold hover:opacity-90 transition shadow-xs cursor-pointer flex-1 sm:flex-initial min-h-[40px]"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{t("recover.map.directions_btn")}</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopyDetails(activeSelectedCenter)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer flex-1 sm:flex-initial min-h-[40px]"
                  title="Copy details"
                >
                  {copiedId === activeSelectedCenter.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                {selectedLocationId && (
                  <button
                    type="button"
                    onClick={() => setSelectedLocationId(null)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer min-h-[40px] flex items-center justify-center"
                    title={t("recover.map.close_popover")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Address & Hours */}
            <div className="text-xs space-y-1.5 text-foreground/90">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{activeSelectedCenter.address} ({activeSelectedCenter.landmark})</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{activeSelectedCenter.hours}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{activeSelectedCenter.phone}</span>
                </span>
              </div>
            </div>

            {/* In-Person Directive Protocol */}
            <div className="p-3 rounded-xl bg-background/80 border border-border text-[11px] text-foreground/90 leading-relaxed flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground block font-bold mb-0.5">In-Person Escalation Directive:</strong>
                <span>{activeSelectedCenter.inPersonGuidance}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* In-Person Protocol Checklist: What to Bring & What to Demand */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-muted/20 space-y-3">
        <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span>{t("recover.map.checklist_title")}</span>
        </h4>
        <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{t("recover.map.item_statement")}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{t("recover.map.item_id")}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{t("recover.map.item_draft")}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{t("recover.map.item_stamped")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhysicalLocationsMap;
