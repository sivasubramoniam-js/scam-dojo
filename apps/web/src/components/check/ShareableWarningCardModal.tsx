import React, { useEffect, useRef, useState } from "react";
import { CheckResult } from "@/lib/api";
import {
  Download,
  Share2,
  Copy,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

interface ShareableWarningCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkResult: CheckResult;
}

export function ShareableWarningCardModal({
  isOpen,
  onClose,
  checkResult,
}: ShareableWarningCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-res square card dimensions (1080x1080)
    canvas.width = 1080;
    canvas.height = 1080;

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGrad.addColorStop(0, "#090d16");
    bgGrad.addColorStop(0.5, "#0f172a");
    bgGrad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Outer Border & Glow
    const isHigh = checkResult.riskLevel === "high";
    const accentColor = isHigh ? "#f43f5e" : "#f59e0b";

    ctx.lineWidth = 14;
    ctx.strokeStyle = accentColor;
    ctx.strokeRect(30, 30, 1020, 1020);

    // Inner subtle glow border
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.strokeRect(45, 45, 990, 990);

    // 3. Top Banner
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(80, 80, 920, 64, 16);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚠️ SCAM DOJO THREAT ALERT · DO NOT FALL FOR THIS", 540, 112);

    // 4. Threat Score Badge (Large)
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.roundRect(80, 180, 920, 150, 24);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = accentColor;
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = "900 82px Inter, system-ui, sans-serif";
    ctx.fillText(`${checkResult.score}`, 120, 275);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 34px Inter, system-ui, sans-serif";
    ctx.fillText("/100", 230, 275);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 36px Inter, system-ui, sans-serif";
    const riskLabel = isHigh ? "CRITICAL THREAT" : "SUSPICIOUS VECTOR";
    ctx.fillText(riskLabel, 340, 245);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 24px Inter, system-ui, sans-serif";
    ctx.fillText("Verified by Scam Dojo AI Dual-Engine Threat Inspector", 340, 285);

    // 5. Threat Title
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 44px Inter, system-ui, sans-serif";
    const titleText = checkResult.title.length > 42 ? checkResult.title.slice(0, 42) + "…" : checkResult.title;
    ctx.fillText(titleText, 80, 390);

    // 6. Quoted Message Snippet Box
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.roundRect(80, 425, 920, 180, 20);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fef08a";
    ctx.font = "italic 600 26px Inter, system-ui, monospace";
    const rawQuote = (checkResult.text || "").replace(/\n/g, " ");
    const line1 = rawQuote.slice(0, 58);
    const line2 = rawQuote.slice(58, 116);
    const line3 = rawQuote.length > 116 ? rawQuote.slice(116, 170) + "…" : "";

    ctx.fillText(`"${line1}`, 110, 480);
    if (line2) ctx.fillText(line2, 110, 520);
    if (line3) ctx.fillText(`${line3}"`, 110, 560);
    else if (!line3 && line2) ctx.fillText(`"`, 110 + ctx.measureText(line2).width, 520);

    // 7. Key Red Flags
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 32px Inter, system-ui, sans-serif";
    ctx.fillText("Key Manipulation Red Flags:", 80, 655);

    const redFlags = checkResult.redFlags?.slice(0, 3) || [];
    let flagY = 705;

    if (redFlags.length > 0) {
      redFlags.forEach((rf) => {
        ctx.fillStyle = accentColor;
        ctx.font = "900 28px Inter, system-ui, sans-serif";
        ctx.fillText("✕", 90, flagY);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "600 24px Inter, system-ui, sans-serif";
        const whyText = rf.why.length > 55 ? rf.why.slice(0, 55) + "…" : rf.why;
        ctx.fillText(whyText, 130, flagY);
        flagY += 46;
      });
    } else {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 24px Inter, system-ui, sans-serif";
      ctx.fillText("• Demands immediate action to bypass logical verification.", 100, flagY);
      flagY += 46;
      ctx.fillText("• Requests unauthorized credential or payment verification.", 100, flagY);
      flagY += 46;
    }

    // 8. Bottom Emergency Bar
    ctx.fillStyle = "rgba(225, 29, 72, 0.15)";
    ctx.beginPath();
    ctx.roundRect(80, 860, 920, 110, 20);
    ctx.fill();

    ctx.strokeStyle = "rgba(225, 29, 72, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px Inter, system-ui, sans-serif";
    ctx.fillText("Emergency Indian Cyber Helplines:", 110, 905);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 26px Inter, system-ui, sans-serif";
    ctx.fillText("National Helpline: 1930  ·  cybercrime.gov.in  ·  Chakshu (Sanchar Saathi)", 110, 945);

    // 9. Watermark / Footer
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 20px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Practice getting scammed safely at scam-dojo-v2.web.app · Powered by Gemini 3.8", 540, 1015);

    setDataUrl(canvas.toDataURL("image/png"));
  }, [isOpen, checkResult]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `Scam_Alert_${checkResult.checkId || Date.now()}.png`;
    a.click();
  };

  const handleShareWhatsApp = () => {
    const text = `⚠️ Scam Alert from Scam Dojo:\n\n*${checkResult.title}*\nThreat Score: ${checkResult.score}/100\n\nExplanation: ${checkResult.explanation}\n\nNever click unverified links, share 6-digit OTPs, or transfer money.\nVerify any suspicious message at: https://scam-dojo-v2.web.app/check`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob && navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ "image/png": blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      });
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Shareable Scam Warning Card
              </h2>
              <p className="text-xs text-muted-foreground">
                High-contrast alert card generated for WhatsApp groups & social media.
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

        {/* Card Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-muted/30">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[420px] aspect-square rounded-2xl shadow-2xl border-2 border-border object-contain"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex flex-wrap items-center justify-between gap-3 bg-muted/20 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Image (.png)</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold transition shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground font-bold hover:bg-muted transition shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Image</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareableWarningCardModal;
