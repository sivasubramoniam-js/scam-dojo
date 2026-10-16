import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkMessage, forgeDrillFromCheck, CheckResult } from "@/lib/api";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Upload,
  ArrowRight,
  Flame,
  CheckCircle2,
  XCircle,
  PhoneCall,
  ExternalLink,
  Sparkles,
  Info,
  RefreshCw,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { ScamScoreCard } from "@/components/check/ScamScoreCard";
import { ShareableWarningCardModal } from "@/components/check/ShareableWarningCardModal";

export function CheckPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputText, setInputText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [forging, setForging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const getShareText = () => {
    if (!checkResult) return "";
    const topFlag = checkResult.redFlags?.[0]?.why || "Unverified urgency and links";
    return `⚠️ Scam Alert from Scam Dojo:\n\n*${checkResult.title}*\nThreat Score: ${checkResult.score}/100 (${checkResult.riskLevel.toUpperCase()})\n\nExplanation: ${checkResult.explanation}\n\nKey Red Flag: ${topFlag}\n\nNever share 6-digit OTPs, UPI PINs, or click unverified links.\nVerify at Scam Dojo: https://scam-dojo.web.app/check`;
  };

  const handleShareWhatsApp = () => {
    const text = getShareText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleCopyAlert = () => {
    navigator.clipboard.writeText(getShareText());
    setCopiedAlert(true);
    setTimeout(() => setCopiedAlert(false), 2500);
  };

  const presets = [
    {
      label: "Bank OTP via Typo-Squatted Email",
      text: "share your OTP to this secured email hdfcbank@gmall.com",
    },
    {
      label: "Bank KYC Expiry Phishing",
      text: "Dear SBI User, your KYC expires today. Your debit card and netbanking will be suspended at 9 PM. Click here to verify: http://bit.ly/sbi-kyc-verify and enter OTP.",
    },
    {
      label: "Electricity Disconnection Threat",
      text: "URGENT NOTICE: Your electricity connection will be disconnected tonight at 9:30 PM by electricity office because your previous bill was not updated. Immediately call 9876543210.",
    },
    {
      label: "Telegram Paid Job Task Lure",
      text: "Part time job opportunity! Earn ₹3,000 to ₹8,000 daily by simply reviewing hotels and liking YouTube videos. Deposit ₹500 security fee to unlock VIP tasks.",
    },
    {
      label: "Legitimate Bank Alert",
      text: "Rs. 1,450.00 debited from A/c XX4102 on 15-OCT at Grocery Store. Avl Bal: Rs. 24,190.40. If not done by you, SMS BLOCK to 567676.",
    },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file (PNG, JPG, Screenshot).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImagePreview(b64);
      if (!inputText) {
        setInputText("Scam check: Analyze the screenshot uploaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunAnalysis = async (customText?: string) => {
    const textToScan = (customText || inputText).trim();
    if (!textToScan && !imagePreview) {
      setErrorMessage("Please paste a suspicious message or upload a screenshot.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setCheckResult(null);
    setStepIndex(1);

    setTimeout(() => setStepIndex(2), 350);
    setTimeout(() => setStepIndex(3), 750);

    try {
      const result = await checkMessage(textToScan, imagePreview || undefined);
      setTimeout(() => {
        setCheckResult(result);
        setLoading(false);
      }, 950);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze message. Please try again.");
      setLoading(false);
    }
  };

  const handleForgeDrill = async () => {
    if (!checkResult?.checkId) return;
    setForging(true);
    try {
      const forge = await forgeDrillFromCheck(checkResult.checkId);
      navigate(`/train?forged=${encodeURIComponent(forge.scenarioSlug)}`);
    } catch {
      navigate("/train");
    } finally {
      setForging(false);
    }
  };

  const clearForm = () => {
    setInputText("");
    setImagePreview(null);
    setCheckResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-600/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          AI Threat Inspector & Heuristic Scanner
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-slate-50 tracking-tight">
          Am I being scammed right now?
        </h1>
        <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
          Paste any suspicious SMS, WhatsApp message, email, or upload a screenshot. Our dual-engine pipeline verifies against official Indian banking patterns and detects psychological coercion.
        </p>
      </div>

      {/* Main Input Form */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Suspicious Message or Transcript</span>
            </label>
            {(inputText || imagePreview) && (
              <button
                onClick={clearForm}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 underline transition"
              >
                Clear all
              </button>
            )}
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g. 'Your SBI account is blocked due to KYC. Download AnyDesk or click http://bit.ly/... to verify immediately.'"
            rows={4}
            className="w-full rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition placeholder:text-slate-500 dark:placeholder:text-slate-500 resize-y"
          />
        </div>

        {/* Screenshot Upload & Preview */}
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
          >
            <Upload className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Upload Screenshot / Image</span>
          </button>

          {imagePreview && (
            <div className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs">
              <img
                src={imagePreview}
                alt="Uploaded preview"
                className="w-6 h-6 rounded object-cover"
              />
              <span className="text-slate-900 dark:text-slate-100 font-bold truncate max-w-[150px]">
                Screenshot Attached
              </span>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-sm font-black ml-1"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Try a real-world sample:
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputText(p.text);
                  handleRunAnalysis(p.text);
                }}
                className="text-xs px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 transition font-bold text-left shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 dark:bg-rose-950/60 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="button"
            disabled={loading || (!inputText.trim() && !imagePreview)}
            onClick={() => handleRunAnalysis()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-sm shadow-md transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Deep Threat Inspection...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Inspect Message Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Steps Animation */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Dojo Threat Pipeline Active</span>
          </h3>
          <div className="space-y-3">
            <div className={`flex items-center gap-3 text-xs font-semibold transition-opacity ${stepIndex >= 1 ? "opacity-100 text-slate-900 dark:text-slate-100" : "opacity-40 text-slate-500"}`}>
              <CheckCircle2 className={`w-4 h-4 ${stepIndex >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
              <span>1. Extracting links, Shorteners, Phone Numbers, and Urgency Patterns...</span>
            </div>
            <div className={`flex items-center gap-3 text-xs font-semibold transition-opacity ${stepIndex >= 2 ? "opacity-100 text-slate-900 dark:text-slate-100" : "opacity-40 text-slate-500"}`}>
              <CheckCircle2 className={`w-4 h-4 ${stepIndex >= 2 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
              <span>2. Matching against Indian Cybercrime (I4C) & NPCI fraud playbooks...</span>
            </div>
            <div className={`flex items-center gap-3 text-xs font-semibold transition-opacity ${stepIndex >= 3 ? "opacity-100 text-slate-900 dark:text-slate-100" : "opacity-40 text-slate-500"}`}>
              <CheckCircle2 className={`w-4 h-4 ${stepIndex >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
              <span>3. Synthesizing Gemini GenAI threat analysis and defense steps...</span>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {checkResult && (
        <div className="space-y-6">
          {/* Verdict Banner */}
          <div
            className={`border-2 rounded-2xl p-6 shadow-md space-y-5 ${checkResult.riskLevel === "high"
              ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800"
              : checkResult.riskLevel === "caution"
                ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800"
                : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800"
              }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                {checkResult.riskLevel === "high" ? (
                  <div className="p-3 rounded-xl bg-rose-600 text-white shadow-sm shrink-0">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                ) : checkResult.riskLevel === "caution" ? (
                  <div className="p-3 rounded-xl bg-amber-600 text-white shadow-sm shrink-0">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <div
                    className={`text-xs uppercase tracking-wider font-extrabold ${checkResult.riskLevel === "high"
                      ? "text-rose-900 dark:text-rose-300"
                      : checkResult.riskLevel === "caution"
                        ? "text-amber-900 dark:text-amber-300"
                        : "text-emerald-900 dark:text-emerald-300"
                      }`}
                  >
                    {checkResult.riskLevel === "high"
                      ? "High Danger — Active Threat"
                      : checkResult.riskLevel === "caution"
                        ? "Caution Advised — Suspicious"
                        : "Verified Safe"}
                  </div>
                  <h2
                    className={`text-2xl font-black leading-tight ${checkResult.riskLevel === "high"
                      ? "text-rose-950 dark:text-rose-50"
                      : checkResult.riskLevel === "caution"
                        ? "text-amber-950 dark:text-amber-50"
                        : "text-emerald-950 dark:text-emerald-50"
                      }`}
                  >
                    {checkResult.title}
                  </h2>
                </div>
              </div>

              {/* Score Meter */}
              <div
                className={`flex items-center gap-3 px-5 py-3 rounded-xl self-start sm:self-auto shadow-xs border-2 ${checkResult.riskLevel === "high"
                  ? "bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-800"
                  : checkResult.riskLevel === "caution"
                    ? "bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800"
                    : "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800"
                  }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Threat Score</div>
                  <div
                    className={`text-3xl font-black ${checkResult.riskLevel === "high"
                      ? "text-rose-600 dark:text-rose-400"
                      : checkResult.riskLevel === "caution"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                      }`}
                  >
                    {checkResult.score}
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-0.5">/100</span>
                  </div>
                </div>
              </div>
            </div>

            <p
              className={`text-sm sm:text-base leading-relaxed font-semibold ${checkResult.riskLevel === "high"
                ? "text-rose-950 dark:text-rose-100"
                : checkResult.riskLevel === "caution"
                  ? "text-amber-950 dark:text-amber-100"
                  : "text-emerald-950 dark:text-emerald-100"
                }`}
            >
              {checkResult.explanation}
            </p>

            {/* Action Bar: Train me on this + Share Alert */}
            <div
              className={`pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap ${checkResult.riskLevel === "high"
                ? "border-rose-200 dark:border-rose-800/80"
                : checkResult.riskLevel === "caution"
                  ? "border-amber-200 dark:border-amber-800/80"
                  : "border-emerald-200 dark:border-emerald-800/80"
                }`}
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white text-xs font-black transition shadow-sm"
                  title="Share warning to family and WhatsApp groups"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Alert to WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCardModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black transition shadow-sm"
                  title="Generate high-res downloadable warning poster"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Warning Poster</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyAlert}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs"
                >
                  {copiedAlert ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-700 dark:text-slate-300" />}
                  <span>{copiedAlert ? "Copied Alert!" : "Copy Warning Text"}</span>
                </button>
              </div>

              {checkResult.riskLevel !== "safe" && (
                <button
                  type="button"
                  disabled={forging}
                  onClick={handleForgeDrill}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 active:scale-95 text-white dark:text-slate-950 text-xs font-black transition shadow-md whitespace-nowrap self-start sm:self-auto"
                >
                  <Flame className="w-4 h-4 text-amber-400 dark:text-amber-500 fill-amber-400 dark:fill-amber-500" />
                  <span>{forging ? "Forging Custom Drill..." : "Train Me On This Scam"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Multi-Pillar ScamScore™ Breakdown & Vector Badges */}
          <ScamScoreCard checkResult={checkResult} />

          {/* Red Flags Cards */}
          {checkResult.redFlags && checkResult.redFlags.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-950 dark:text-slate-50 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Detected Manipulation Indicators & Red Flags ({checkResult.redFlags.length})</span>
              </h3>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {checkResult.redFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-2.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 dark:text-slate-100 text-xs">Indicator #{flag.id}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${flag.severity === "high"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          }`}
                      >
                        {flag.severity} Risk
                      </span>
                    </div>
                    {flag.quote && (
                      <div className="font-mono font-bold text-amber-950 dark:text-amber-200 bg-amber-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800/80 break-all text-xs">
                        "{flag.quote}"
                      </div>
                    )}
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{flag.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Protocol Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Do Right Now */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>What you must DO right now</span>
              </h3>
              <ul className="space-y-3 text-xs">
                {(checkResult.doNow && checkResult.doNow.length > 0
                  ? checkResult.doNow
                  : checkResult.actions
                ).map((act, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
                      {act}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Do NOT Do */}
            <div className="bg-rose-50/70 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>What you must NEVER do</span>
              </h3>
              <ul className="space-y-3 text-xs">
                {(checkResult.dontDo && checkResult.dontDo.length > 0
                  ? checkResult.dontDo
                  : [
                    "Do not click any links or scan QR codes provided in the message.",
                    "Do not enter UPI PIN or share 6-digit OTP under any circumstances.",
                    "Do not install apps like AnyDesk, TeamViewer, or unknown APK files.",
                  ]
                ).map((dont, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">
                      ✕
                    </span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
                      {dont}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Safe Verification Method */}
          {checkResult.verifyHow && (
            <div className="bg-blue-50/80 dark:bg-blue-950/40 border-2 border-blue-300 dark:border-blue-800 rounded-2xl p-5 flex items-start gap-3.5 text-xs">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-blue-950 dark:text-blue-200 font-black">Official Verification Protocol: </strong>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{checkResult.verifyHow}</span>
              </div>
            </div>
          )}

          {/* Live Google Search Grounding Sources */}
          {checkResult.groundingSources && checkResult.groundingSources.length > 0 && (
            <div className="bg-sky-50/70 dark:bg-sky-950/30 border-2 border-sky-300 dark:border-sky-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Google Cloud Vertex AI Live Search Grounding Sources</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {checkResult.groundingSources.map((source, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                  >
                    <ExternalLink className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* High Danger Emergency Helplines */}
          {checkResult.riskLevel === "high" && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-black text-slate-950 dark:text-slate-50 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Immediate Indian Cyber Fraud Helplines</span>
                </h3>
                <Link
                  to="/recover"
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Already lost funds? Open Recovery Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <a
                  href="tel:1930"
                  className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:border-emerald-600 transition flex items-center gap-3.5 text-xs shadow-2xs"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-600 text-white font-black text-xs">1930</div>
                  <div>
                    <div className="font-black text-slate-950 dark:text-slate-50">Cyber Helpline 1930</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">National Fraud Desk (24/7)</div>
                  </div>
                </a>

                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:border-indigo-600 transition flex items-center gap-3.5 text-xs shadow-2xs"
                >
                  <div className="p-2.5 rounded-lg bg-indigo-600 text-white font-black text-xs">Portal</div>
                  <div>
                    <div className="font-black text-slate-950 dark:text-slate-50 flex items-center gap-1">
                      <span>cybercrime.gov.in</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Official Crime Filing</div>
                  </div>
                </a>

                <a
                  href="https://sancharsaathi.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:border-indigo-600 transition flex items-center gap-3.5 text-xs shadow-2xs"
                >
                  <div className="p-2.5 rounded-lg bg-indigo-600 text-white font-black text-xs">Chakshu</div>
                  <div>
                    <div className="font-black text-slate-950 dark:text-slate-50 flex items-center gap-1">
                      <span>Sanchar Saathi</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Report Fraud Number</div>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shareable Warning Card Modal */}
      {checkResult && (
        <ShareableWarningCardModal
          isOpen={showCardModal}
          onClose={() => setShowCardModal(false)}
          checkResult={checkResult}
        />
      )}
    </div>
  );
}

export default CheckPage;
