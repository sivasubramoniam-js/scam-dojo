import React, { useState } from "react";
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  X,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  Send,
} from "lucide-react";

interface EvidenceDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBank?: string;
  defaultAmount?: string;
}

export function EvidenceDossierModal({
  isOpen,
  onClose,
  defaultBank = "",
  defaultAmount = "",
}: EvidenceDossierModalProps) {
  // Form State
  const [victimName, setVictimName] = useState("");
  const [victimPhone, setVictimPhone] = useState("");
  const [bankName, setBankName] = useState(defaultBank);
  const [accountLast4, setAccountLast4] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [amountLost, setAmountLost] = useState(defaultAmount);
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [scamType, setScamType] = useState("UPI Collect / QR Scan Fraud");
  const [suspectPhone, setSuspectPhone] = useState("");
  const [suspectUpiOrAccount, setSuspectUpiOrAccount] = useState("");
  const [incidentDetails, setIncidentDetails] = useState("");

  const [activeTab, setActiveTab] = useState<"police" | "bank">("police");
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const formattedDate = new Date(incidentDate).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Cyber Crime Portal Complaint Text
  const generatePoliceComplaint = () => {
    return `================================================================================
NATIONAL CYBER CRIME REPORTING PORTAL (cybercrime.gov.in / 1930)
INCIDENT COMPLAINT DOSSIER & EVIDENCE SUMMARY
================================================================================

1. COMPLAINANT PARTICULARS
- Complainant Name: ${victimName || "[Your Full Name]"}
- Registered Mobile Number: ${victimPhone || "[Your Mobile Number]"}
- Date & Time of Incident: ${formattedDate}
- Incident Category: Financial Fraud (${scamType})

2. SUSPECT / FRAUDSTER IDENTIFIERS
- Suspect Contact / Mobile No: ${suspectPhone || "Unspecified / Hidden Caller"}
- Suspect Beneficiary UPI VPA / Account: ${suspectUpiOrAccount || "See Transaction UTR Details"}
- Communication Channel Used: WhatsApp / Phone Call / Telegram / SMS

3. FINANCIAL TRANSACTION DETAILS (FOR CFCFRMS INTERBANK LIEN)
- Victim Bank Name: ${bankName || "[Bank Name]"}
- Victim Account (Last 4 digits): XX${accountLast4 || "XXXX"}
- Transaction Reference (UTR / Txn ID): ${utrNumber || "[Enter Transaction Reference]"}
- Debited Amount: ₹${amountLost || "0.00"}
- Transaction Timestamp: ${formattedDate}

4. CHRONOLOGY OF THE INCIDENT
${incidentDetails || "The complainant was contacted by the suspect who posed as an official entity and induced the complainant to approve an unauthorized transaction under deceptive pretenses."}

5. EVIDENCE PRESERVED BY COMPLAINANT
[x] Screenshot of transaction debit message with timestamp & UTR
[x] Screenshot of WhatsApp / Telegram / SMS communication
[x] Call logs with timestamps showing suspect contact
[x] Copy of Bank Account statement highlighting unauthorized debits

PRAYER:
Kindly register this complaint, issue an acknowledgment number, and notify the beneficiary bank via CFCFRMS to freeze the recipient account before the fraudulent funds are withdrawn.
`;
  };

  // Formal Bank Dispute & Chargeback Letter citing RBI Circular
  const generateBankDisputeLetter = () => {
    return `To,
The Branch Manager / Fraud Dispute Desk,
${bankName || "[Bank Name]"} Branch,

Date: ${new Date().toLocaleDateString("en-IN")}

SUBJECT: URGENT: Formal Notice of Unauthorized Digital Transaction & Claim of Customer Zero/Limited Liability under RBI Circular DBR.No.Leg.BC.78/09.07.005/2017-18

Respected Sir/Madam,

I, ${victimName || "[Your Name]"}, holding Savings/Current Account (ending with XX${accountLast4 || "XXXX"}) with your bank, hereby report an unauthorized and fraudulent transaction debited from my account.

TRANSACTION PARTICULARS:
- Transaction Date & Time: ${formattedDate}
- Transaction Reference / UTR Number: ${utrNumber || "[Enter UTR Number]"}
- Amount Debited: ₹${amountLost || "0.00"}
- Suspect Beneficiary / VPA: ${suspectUpiOrAccount || "Attached in statement"}
- Attack Category: ${scamType}

NOTIFICATION TIMELINE & REGULATORY COMPLIANCE:
I am reporting this fraudulent debit promptly within the golden hour / notification window prescribed by the Reserve Bank of India. In accordance with RBI Circular DBR.No.Leg.BC.78/09.07.005/2017-18 ("Customer Protection - Limiting Liability of Customers in Unauthorised Electronic Banking Transactions"):

1. I request you to immediately register a formal fraud dispute and furnish a dispute reference ticket.
2. I request you to contact the beneficiary bank / NPCI via the CFCFRMS (Cyber Fraud Citizen Financial Reporting & Management System) network to place an immediate interbank lien/freeze on the funds.
3. As this transaction has been reported without delay, I request that provisional shadow credit / reversal be granted as per RBI guidelines pending investigation.

Enclosed:
1. Bank statement extract highlighting the fraudulent debit.
2. Screenshots of suspect communication and transaction receipt.
3. Copy of Cyber Crime Helpline (1930 / cybercrime.gov.in) complaint acknowledgment.

Yours sincerely,

${victimName || "[Signature]"}
Contact: ${victimPhone || "[Phone Number]"}`;
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleDownload = () => {
    const content = `${generatePoliceComplaint()}\n\n\n${generateBankDisputeLetter()}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Scam_Dojo_Evidence_Dossier_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Official Evidence Dossier & Case Builder
              </h2>
              <p className="text-xs text-muted-foreground">
                Generate pre-formatted legal dispute packets for cybercrime.gov.in (1930) and your bank.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Quick Input Fields */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Step 1: Enter Incident Key Facts (takes 60 seconds)</span>
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Your Full Name</label>
                <input
                  type="text"
                  value={victimName}
                  onChange={(e) => setVictimName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Your Mobile Number</label>
                <input
                  type="text"
                  value={victimPhone}
                  onChange={(e) => setVictimPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Your Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. SBI, HDFC, ICICI"
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Your Account (Last 4 Digits)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={accountLast4}
                  onChange={(e) => setAccountLast4(e.target.value)}
                  placeholder="e.g. 4102"
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Transaction UTR / Reference ID</label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 428910284719 or UPI/CR/..."
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Amount Debited (₹)</label>
                <input
                  type="text"
                  value={amountLost}
                  onChange={(e) => setAmountLost(e.target.value)}
                  placeholder="e.g. 25,000"
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Suspect Mobile / WhatsApp</label>
                <input
                  type="text"
                  value={suspectPhone}
                  onChange={(e) => setSuspectPhone(e.target.value)}
                  placeholder="e.g. +91 9123456789"
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Suspect Beneficiary UPI / Account</label>
                <input
                  type="text"
                  value={suspectUpiOrAccount}
                  onChange={(e) => setSuspectUpiOrAccount(e.target.value)}
                  placeholder="e.g. fraudpay@okaxis or A/c 9102..."
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Brief Incident Description</label>
              <textarea
                rows={2}
                value={incidentDetails}
                onChange={(e) => setIncidentDetails(e.target.value)}
                placeholder="e.g. Scammer posed as electricity board officer demanding urgent bill payment via QR code, warning power would be cut at 9:30 PM."
                className="w-full mt-1 p-2 rounded-lg border border-border bg-background text-xs"
              />
            </div>
          </div>

          {/* Generated Documents View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("police")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    activeTab === "police"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  cybercrime.gov.in / 1930 Format
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("bank")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    activeTab === "bank"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Bank RBI Dispute Letter
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      activeTab === "police" ? generatePoliceComplaint() : generateBankDisputeLetter(),
                      activeTab
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-bold hover:bg-muted transition text-foreground"
                >
                  {copied === activeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Document</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-bold hover:bg-muted transition text-foreground"
                  title="Download both packets as .txt"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>
            </div>

            {/* Document Preview Box */}
            <pre className="p-4 rounded-xl bg-muted/40 border border-border font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto select-all">
              {activeTab === "police" ? generatePoliceComplaint() : generateBankDisputeLetter()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20 text-xs">
          <div className="text-muted-foreground">
            💡 Submit the Police format on <strong>cybercrime.gov.in</strong> or read it aloud to <strong>1930</strong>. Email the bank letter to your branch fraud desk.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvidenceDossierModal;
