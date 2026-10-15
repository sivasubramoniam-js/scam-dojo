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
} from "lucide-react";

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

  const presets = [
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
        setInputText("Scam check: Analyzing screenshot uploaded from device...");
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          AI Threat Inspector & Heuristic Scanner
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Am I being scammed right now?
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Paste any suspicious SMS, WhatsApp message, email, or upload a screenshot. Our dual-engine pipeline verifies against official Indian banking patterns and detects psychological coercion.
        </p>
      </div>

      {/* Main Input Form */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Suspicious Message or Transcript</span>
            </label>
            {(inputText || imagePreview) && (
              <button
                onClick={clearForm}
                className="text-xs text-muted-foreground hover:text-foreground underline"
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
            className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition placeholder:text-muted-foreground/60 resize-y"
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-border hover:border-primary/60 bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span>Upload Screenshot / Image</span>
          </button>

          {imagePreview && (
            <div className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border text-xs">
              <img
                src={imagePreview}
                alt="Uploaded preview"
                className="w-6 h-6 rounded object-cover"
              />
              <span className="text-foreground font-medium truncate max-w-[150px]">
                Screenshot Attached
              </span>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="text-muted-foreground hover:text-destructive text-sm font-bold ml-1"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
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
                className="text-xs px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition font-medium text-left"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="button"
            disabled={loading || (!inputText.trim() && !imagePreview)}
            onClick={() => handleRunAnalysis()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Deep Threat Inspection...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Inspect Message Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Steps Animation */}
      {loading && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>Dojo Threat Pipeline Active</span>
          </h3>
          <div className="space-y-3">
            <div className={`flex items-center gap-3 text-xs transition-opacity ${stepIndex >= 1 ? "opacity-100 text-foreground" : "opacity-40"}`}>
              <CheckCircle2 className={`w-4 h-4 ${stepIndex >= 1 ? "text-emerald-500" : "text-muted-foreground"}`} />
              <span>1. Extracting links, Shorteners, Phone Numbers, and Urgency Patterns...</span>
            </div>
            <div className={`flex items-center gap-3 text-xs transition-opacity ${stepIndex >= 2 ? "opacity-100 text-foreground" : "opacity-40"}`}>
              <CheckCircle2 className={`w-4 h-4 ${stepIndex >= 2 ? "text-emerald-500" : "text-muted-foreground"}`} />
              <span>2. Matching against Indian Cybercrime (I4C) & NPCI fraud playbooks...</span>
            </div>
            <div className={`flex items-center gap-3 text-xs transition-opacity ${stepIndex >= 3 ? "opacity-100 text-foreground" : "opacity-40"}`}>
              <CheckCircle2 className={`w-4 h-4 ${stepIndex >= 3 ? "text-emerald-500" : "text-muted-foreground"}`} />
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
            className={`border rounded-2xl p-6 shadow-sm space-y-4 ${
              checkResult.riskLevel === "high"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100"
                : checkResult.riskLevel === "caution"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                {checkResult.riskLevel === "high" ? (
                  <div className="p-2.5 rounded-xl bg-rose-500 text-white">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                ) : checkResult.riskLevel === "caution" ? (
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold opacity-80">
                    {checkResult.riskLevel === "high"
                      ? "High Danger — Active Threat"
                      : checkResult.riskLevel === "caution"
                      ? "Caution Advised — Suspicious"
                      : "Verified Safe"}
                  </div>
                  <h2 className="text-xl font-bold leading-tight">{checkResult.title}</h2>
                </div>
              </div>

              {/* Score Meter */}
              <div className="flex items-center gap-3 bg-card/60 backdrop-blur border border-border/40 px-4 py-2.5 rounded-xl self-start sm:self-auto">
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Threat Score</div>
                  <div className="text-2xl font-black text-foreground">
                    {checkResult.score}
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm opacity-90 leading-relaxed">{checkResult.explanation}</p>

            {/* Cross-Mode Loop: Train me on this */}
            {checkResult.riskLevel !== "safe" && (
              <div className="pt-2 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs opacity-90">
                  <strong>Forge a Custom Drill:</strong> Practice defending against this exact scam tactic in our interactive training arena.
                </div>
                <button
                  type="button"
                  disabled={forging}
                  onClick={handleForgeDrill}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 active:scale-95 transition shadow whitespace-nowrap self-start sm:self-auto"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>{forging ? "Forging Custom Drill..." : "🥋 Train Me On This Scam"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Red Flags Cards */}
          {checkResult.redFlags && checkResult.redFlags.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Detected Manipulation Indicators & Red Flags ({checkResult.redFlags.length})</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {checkResult.redFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="p-4 rounded-xl border border-border bg-muted/30 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Indicator #{flag.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          flag.severity === "high"
                            ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {flag.severity} Risk
                      </span>
                    </div>
                    {flag.quote && (
                      <div className="font-mono text-muted-foreground bg-background px-2.5 py-1.5 rounded border border-border/40 truncate">
                        "{flag.quote}"
                      </div>
                    )}
                    <p className="text-muted-foreground leading-normal">{flag.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Protocol Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Do Right Now */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>What you must DO right now</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                {(checkResult.doNow && checkResult.doNow.length > 0
                  ? checkResult.doNow
                  : checkResult.actions
                ).map((act, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-bold text-foreground shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Do NOT Do */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>What you must NEVER do</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                {(checkResult.dontDo && checkResult.dontDo.length > 0
                  ? checkResult.dontDo
                  : [
                      "Do not click any links or scan QR codes provided in the message.",
                      "Do not enter UPI PIN or share 6-digit OTP under any circumstances.",
                      "Do not install apps like AnyDesk, TeamViewer, or unknown APK files.",
                    ]
                ).map((dont, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span className="leading-relaxed">{dont}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Safe Verification Method */}
          {checkResult.verifyHow && (
            <div className="bg-muted/40 border border-border rounded-2xl p-5 flex items-start gap-3 text-xs">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Official Verification Protocol: </strong>
                <span className="text-muted-foreground">{checkResult.verifyHow}</span>
              </div>
            </div>
          )}

          {/* High Danger Emergency Helplines */}
          {checkResult.riskLevel === "high" && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-500" />
                  <span>Immediate Indian Cyber Fraud Helplines</span>
                </h3>
                <Link
                  to="/recover"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Already lost funds? Open Recovery Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <a
                  href="tel:1930"
                  className="p-4 rounded-xl border border-border bg-background hover:bg-muted/40 transition flex items-center gap-3 text-xs"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold">1930</div>
                  <div>
                    <div className="font-bold text-foreground">Cyber Helpline 1930</div>
                    <div className="text-[11px] text-muted-foreground">National Fraud Desk (24/7)</div>
                  </div>
                </a>

                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-xl border border-border bg-background hover:bg-muted/40 transition flex items-center gap-3 text-xs"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary font-bold">Portal</div>
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-1">
                      <span>cybercrime.gov.in</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">Official Crime Filing</div>
                  </div>
                </a>

                <a
                  href="https://sancharsaathi.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-xl border border-border bg-background hover:bg-muted/40 transition flex items-center gap-3 text-xs"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary font-bold">Chakshu</div>
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-1">
                      <span>Sanchar Saathi</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">Report Fraud Number</div>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CheckPage;
