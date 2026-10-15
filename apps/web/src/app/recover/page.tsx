import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  createRecoveryPlan,
  toggleRecoveryStep,
  sendRecoveryChatMessage,
  PlanResult,
  PlanStep,
} from "@/lib/api";
import {
  ShieldAlert,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Flame,
  FileText,
  Lock,
} from "lucide-react";

export function RecoverPage() {
  // Wizard state
  const [inWizard, setInWizard] = useState(true);
  const [incidents, setIncidents] = useState<string[]>(["upi_payment"]);
  const [timeSince, setTimeSince] = useState<"just_now" | "within_1h" | "today" | "1_3_days" | "longer">("just_now");
  const [moneyLost, setMoneyLost] = useState(true);
  const [amountBand, setAmountBand] = useState<string>("10k_50k");
  const [bank, setBank] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Active Plan state
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "I am here with you. Take a deep breath. Focus on freezing debits first. Ask me anything about what to say to the bank or police.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const incidentOptions = [
    { id: "upi_payment", label: "Approved UPI collect request / QR scan" },
    { id: "card_details_shared", label: "Shared Card number / CVV / Expiry" },
    { id: "otp_shared", label: "Shared 6-digit SMS OTP" },
    { id: "remote_app_installed", label: "Installed AnyDesk / TeamViewer / APK" },
    { id: "threatened", label: "Extorted via Digital Arrest / Police threat" },
    { id: "investment_or_job", label: "Telegram Job Task / Fake Trading App" },
  ];

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const generated = await createRecoveryPlan({
        incident: incidents,
        timeSince,
        moneyLost,
        amountBand: moneyLost ? amountBand : undefined,
        bank: bank.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setPlan(generated);
      setInWizard(false);
    } catch {
      // Fallback local plan if offline
      setPlan({
        planId: "rec_local_fallback",
        createdAt: new Date().toISOString(),
        urgency: moneyLost && (timeSince === "just_now" || timeSince === "within_1h") ? "critical" : "high",
        summary: `Action plan to freeze fraudulent debits and file official cyber cell complaints.`,
        steps: [
          {
            id: "step_1930",
            phase: "now",
            title: "Call 1930 National Cyber Fraud Helpline immediately",
            why: "Allows CFCFRMS to place an immediate interbank lien on recipient bank accounts before funds are withdrawn.",
            how: ["Dial 1930", "Share transaction ID / UTR and bank details", "Save complaint acknowledgment"],
            resources: [],
            timeCritical: true,
            done: false,
          },
          {
            id: "step_bank_freeze",
            phase: "now",
            title: `Contact ${bank || "your bank"} fraud control room`,
            why: "Freezes compromised cards and UPI IDs to halt further debits.",
            how: ["Call number on back of card", "Request transaction dispute ticket"],
            draftText: `Dear ${bank || "Bank"} Fraud Desk, I was a victim of financial fraud on ${new Date().toLocaleDateString()}. Please freeze fraudulent debits and raise an immediate dispute.`,
            draftLabel: "Copy Bank Dispute Draft",
            resources: [],
            timeCritical: true,
            done: false,
          },
          {
            id: "step_cybercrime",
            phase: "today",
            title: "File formal complaint at cybercrime.gov.in",
            why: "Official FIR tracking number required for bank chargeback procedures.",
            how: ["Visit cybercrime.gov.in", "Upload bank statement and screenshots"],
            resources: [],
            timeCritical: false,
            done: false,
          },
          {
            id: "step_scam_warning",
            phase: "protect_next",
            title: "NEVER pay anyone offering to recover funds for a fee",
            why: "Secondary recovery scams prey on victims. No third party can hack money back.",
            how: ["Only communicate with official banks and police."],
            resources: [],
            timeCritical: false,
            done: false,
          },
        ],
        whatToExpect: ["Bank will freeze compromised cards.", "1930 will attempt an interbank hold."],
        evidenceChecklist: ["Bank statement highlighting UTR", "Screenshots of chats and links"],
        protectNext: ["Turn off international transactions", "Never share UPI MPIN"],
        disclaimer: "Informational guidance based on Indian cyber laws.",
        resourcesVerifiedOn: "2026-10-14",
      });
      setInWizard(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStep = async (stepId: string, currentDone: boolean) => {
    if (!plan) return;
    const newDone = !currentDone;
    const updatedSteps = plan.steps.map((s) => (s.id === stepId ? { ...s, done: newDone } : s));
    setPlan({ ...plan, steps: updatedSteps });

    try {
      if (plan.planId !== "rec_local_fallback") {
        await toggleRecoveryStep(plan.planId, stepId, newDone);
      }
    } catch {
      // ignore
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendChat = async () => {
    const q = chatInput.trim();
    if (!q || !plan) return;

    setChatMessages((prev) => [...prev, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await sendRecoveryChatMessage(plan.planId, q);
      setChatMessages((prev) => [...prev, { role: "assistant", text: res.text }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Dial 1930 first to place a lien on the recipient bank account. If the bank branch hesitates, quote RBI Circular DBR.No.Leg.BC.78/09.07.005/2017-18 which limits customer liability for prompt fraud reports.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          Golden-Hour Fraud Triage & Recovery
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          I was targeted or lost money. What now?
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Do not panic. Follow this step-by-step incident response plan. The first 2 hours are the "Golden Hour" where banks and Helpline 1930 have the highest chance to freeze funds.
        </p>
      </div>

      {/* Guided Intake Wizard */}
      {inWizard ? (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-foreground">Tell us what happened (30 seconds)</h2>

          {/* Incidents Multi-Select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              1. What kind of fraud or compromise occurred?
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {incidentOptions.map((opt) => {
                const checked = incidents.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setIncidents((prev) =>
                        checked ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
                      );
                    }}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between ${
                      checked
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {checked && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Elapsed */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              2. How long ago did this happen?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {[
                { id: "just_now", label: "Just now (<30m)" },
                { id: "within_1h", label: "Within 1-2 hours" },
                { id: "today", label: "Earlier today" },
                { id: "1_3_days", label: "1-3 days ago" },
                { id: "longer", label: "Over 3 days ago" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeSince(t.id as any)}
                  className={`p-3 rounded-xl border text-center font-medium transition ${
                    timeSince === t.id
                      ? "border-primary bg-primary/10 text-foreground font-bold"
                      : "border-border bg-background hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Money Lost Toggle & Details */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-foreground">Did you lose money?</div>
                <div className="text-xs text-muted-foreground">Was money debited from your account or card?</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMoneyLost(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    moneyLost ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  Yes, lost money
                </button>
                <button
                  type="button"
                  onClick={() => setMoneyLost(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    !moneyLost ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  No, but shared data
                </button>
              </div>
            </div>

            {moneyLost && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Approximate Amount</label>
                  <select
                    value={amountBand}
                    onChange={(e) => setAmountBand(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-xs text-foreground"
                  >
                    <option value="lt_1k">Under ₹1,000</option>
                    <option value="1k_10k">₹1,000 – ₹10,000</option>
                    <option value="10k_50k">₹10,000 – ₹50,000</option>
                    <option value="50k_2l">₹50,000 – ₹2,00,000</option>
                    <option value="gt_2l">Over ₹2 Lakhs</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Bank Name</label>
                  <input
                    type="text"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="e.g. SBI, HDFC, ICICI, Bank of Baroda"
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={loading || incidents.length === 0}
            onClick={handleGeneratePlan}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-95 active:scale-[0.99] transition shadow"
          >
            {loading ? "Generating Priority Action Plan..." : "Create My Recovery Action Plan"}
          </button>
        </div>
      ) : (
        /* Plan View */
        plan && (
          <div className="space-y-6">
            {/* Urgency Alert Banner */}
            <div
              className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
                plan.urgency === "critical"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-600 text-white">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      {plan.urgency === "critical" ? "Golden Hour — Act Immediately" : "High Priority Triage"}
                    </div>
                    <h2 className="text-lg font-bold">{plan.summary}</h2>
                  </div>
                </div>

                <a
                  href="tel:1930"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow whitespace-nowrap self-start sm:self-auto"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 1930 Helpline Now</span>
                </a>
              </div>
            </div>

            {/* Checklist Tabs / Groups */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Action Checklist</h3>
                  <p className="text-xs text-muted-foreground">
                    Check off tasks as you complete them to track recovery progress.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInWizard(true)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Reconfigure Intake
                </button>
              </div>

              <div className="space-y-4">
                {plan.steps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-xl border transition ${
                      step.done
                        ? "bg-muted/20 border-border/50 opacity-60"
                        : step.timeCritical
                        ? "bg-rose-500/5 border-rose-500/20"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStep(step.id, step.done)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          step.done
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-muted-foreground/40 hover:border-primary bg-background"
                        }`}
                      >
                        {step.done && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="space-y-1.5 flex-1 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {step.title}
                          </span>
                          {step.timeCritical && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white uppercase">
                              Golden Hour
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase">
                            Phase: {step.phase}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{step.why}</p>

                        {step.how && step.how.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 pt-1 text-muted-foreground">
                            {step.how.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        )}

                        {/* Copyable Dispute Draft */}
                        {step.draftText && (
                          <div className="mt-3 p-3 rounded-lg bg-background border border-border/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                {step.draftLabel || "Copy-Ready Dispute Draft"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(step.draftText!, step.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                              >
                                {copiedId === step.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Text</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                              {step.draftText}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Checklist & What to Expect */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3 text-xs">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Evidence Checklist for FIR / Bank</span>
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  {plan.evidenceChecklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3 text-xs">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  <span>How to Protect Yourself Next</span>
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  {plan.protectNext.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* In-page Recovery Chatbot */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Ask the Dojo Recovery Assistant</span>
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto p-3 bg-muted/20 rounded-xl border border-border/50 text-xs">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                      msg.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground font-medium"
                        : "bg-background border border-border text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-background border border-border p-3 rounded-xl text-xs text-muted-foreground animate-pulse">
                    Thinking and consulting verified RBI / Cyber Crime procedures...
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="e.g. 'What if my bank refuses to register the dispute?'"
                  className="flex-1 p-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  disabled={chatLoading || !chatInput.trim()}
                  onClick={handleSendChat}
                  className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-95 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cross-Mode Loop: Suggested Drill */}
            {plan.suggestedDrill && (
              <div className="p-5 rounded-2xl border border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs uppercase font-bold text-muted-foreground">Build Immunity</div>
                  <div className="text-sm font-bold text-foreground">{plan.suggestedDrill.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Train your reflexes against the exact deception tactics used in this incident.
                  </div>
                </div>
                <Link
                  to={`/train?slug=${plan.suggestedDrill.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition shadow self-start sm:self-auto"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Start Practice Drill</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default RecoverPage;
