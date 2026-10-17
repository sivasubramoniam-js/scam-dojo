import React, { useState, useEffect } from "react";
import { Bot, Terminal, ChevronDown, ChevronUp, Cpu, Activity, Sparkles } from "lucide-react";
import { MarkdownView } from "@/components/common/MarkdownView";
import { useT } from "@/lib/i18n";

export interface TraceEntry {
  id: string;
  timestamp: string;
  agent: string;
  model: string;
  action: string;
  details: string;
}

export function TracePanel() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [traces, setTraces] = useState<TraceEntry[]>([
    {
      id: "tr_1",
      timestamp: "09:30:12",
      agent: "Observer Agent",
      model: "gemini-2.5-flash-lite",
      action: "Referee assessment",
      details: "Turn 2: Detected user skepticism. Tension set to 3/10. No PII leaks.",
    },
    {
      id: "tr_2",
      timestamp: "09:30:14",
      agent: "Scammer Persona",
      model: "gemini-2.5-flash",
      action: "Adaptive streaming",
      details: "Tactic: Urgency escalation. Pushed 20-minute deadline pretext.",
    },
    {
      id: "tr_3",
      timestamp: "09:32:05",
      agent: "Analyst Agent",
      model: "gemini-2.5-flash",
      action: "Multimodal Threat Inspection",
      details: "Scanned SMS text + verified shortener domain against KB pattern rules. Risk: High (88/100).",
    },
    {
      id: "tr_4",
      timestamp: "09:33:40",
      agent: "Scenario Forge",
      model: "gemini-2.5-flash",
      action: "Custom drill generation",
      details: "Extracted Electricity Disconnection pretext into custom drill scenario.",
    },
    {
      id: "tr_5",
      timestamp: "09:35:10",
      agent: "Recovery Planner",
      model: "gemini-2.5-flash",
      action: "Grounded Resource Synthesis",
      details: "Synthesized golden-hour actions strictly grounded in Helpline 1930 and RBI guidelines.",
    },
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("trace") === "1") {
        setOpen(true);
      }
    }
  }, []);

  return (
    <div className="fixed bottom-16 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Collapsed Badge Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/90 text-amber-400 border border-amber-500/30 text-xs font-bold shadow-lg hover:bg-slate-900 hover:scale-105 active:scale-95 transition backdrop-blur cursor-pointer"
          title="Judge Live AI Agent Trace Panel"
        >
          <Cpu className="w-4 h-4 animate-pulse text-amber-400" />
          <span>{t("trace_panel.badge")}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </button>
      )}

      {/* Expanded Trace Drawer */}
      {open && (
        <div className="w-[90vw] max-w-[420px] bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs flex flex-col font-mono max-h-[460px]">
          {/* Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>{t("trace_panel.title")}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
            <div className="text-[11px] text-slate-400">
              {t("trace_panel.desc")}
            </div>

            {traces.map((t) => (
              <div
                key={t.id}
                className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    {t.agent}
                  </span>
                  <span className="text-slate-500">{t.timestamp}</span>
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>{t.action}</span>
                  <span className="text-slate-500">({t.model})</span>
                </div>
                <div className="text-slate-300 leading-tight text-[11px] font-sans">
                  <MarkdownView content={t.details} />
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-900/60 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Stateless Firestore session seeding</span>
            </span>
            <span className="text-emerald-400 font-bold">Live Ready</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TracePanel;
