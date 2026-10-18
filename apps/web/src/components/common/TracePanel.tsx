import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Terminal,
  ChevronDown,
  Cpu,
  Activity,
  Sparkles,
  Trash2,
  Clock,
  Radio,
} from "lucide-react";
import { MarkdownView } from "@/components/common/MarkdownView";
import { useT } from "@/lib/i18n";
import { useGlobalTraces, TraceEntry } from "@/lib/traceStore";

export type { TraceEntry };

export function TracePanel() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const { traces, clearTraces } = useGlobalTraces();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasNewEntry, setHasNewEntry] = useState(false);
  const prevCountRef = useRef(traces.length);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("trace") === "1") {
        setOpen(true);
      }
    }
  }, []);

  // Pulse badge when new trace events arrive
  useEffect(() => {
    if (traces.length > prevCountRef.current) {
      setHasNewEntry(true);
      const timer = setTimeout(() => setHasNewEntry(false), 2500);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = traces.length;
  }, [traces.length]);

  // Auto-scroll to latest trace when opened or when new trace arrives
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, traces.length]);

  const getKindColor = (kind?: string) => {
    switch (kind) {
      case "start":
        return "text-sky-400 border-sky-500/20";
      case "end":
        return "text-amber-400 border-amber-500/20";
      case "error":
        return "text-rose-400 border-rose-500/20";
      case "info":
        return "text-slate-400 border-slate-700/40";
      default:
        return "text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="fixed bottom-16 right-3 sm:bottom-6 sm:right-6 z-50">
      {/* Collapsed Badge Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-slate-900/95 text-amber-400 border text-xs font-bold shadow-xl hover:bg-slate-900 hover:scale-105 active:scale-95 transition backdrop-blur cursor-pointer ${
            hasNewEntry
              ? "border-emerald-400 ring-2 ring-emerald-500/30 animate-pulse"
              : "border-amber-500/30"
          }`}
          title="Judge Live AI Agent Trace Panel (Google ADK)"
        >
          <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          <span>{t("trace_panel.badge")}</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            {traces.length}
          </span>
        </button>
      )}

      {/* Expanded Trace Drawer */}
      {open && (
        <div className="w-[calc(100vw-24px)] sm:w-[440px] max-w-[440px] bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs flex flex-col font-mono max-h-[70vh] sm:max-h-[500px]">
          {/* Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>{t("trace_panel.title")}</span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                Live ({traces.length})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearTraces}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                title="Clear Trace Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Close Drawer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description banner */}
          <div className="px-3 py-2 bg-slate-900/40 border-b border-slate-800/60 text-[11px] text-slate-400">
            {t("trace_panel.desc")}
          </div>

          {/* Body */}
          <div
            ref={scrollRef}
            className="p-3 space-y-2.5 overflow-y-auto flex-1 scroll-smooth"
          >
            {traces.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No active traces yet. Start a drill or scan a threat to stream ADK traces.
              </div>
            ) : (
              traces.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className={`p-2.5 rounded-lg bg-slate-900/90 border space-y-1.5 transition-colors ${getKindColor(
                    t.kind
                  )}`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Bot className="w-3 h-3 text-amber-400" />
                      {t.agent}
                    </span>
                    <span className="text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-500" />
                      {t.timestamp}
                    </span>
                  </div>
                  <div className="text-[10px] flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 font-semibold">
                      <Activity className="w-3 h-3" />
                      <span>{t.action}</span>
                    </span>
                    <span className="text-slate-400 text-[9px] font-mono">
                      {t.model}
                      {t.latencyMs ? ` · ${t.latencyMs}ms` : ""}
                    </span>
                  </div>
                  <div className="text-slate-300 leading-relaxed text-[11px] font-sans pt-0.5">
                    <MarkdownView content={t.details} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-900/80 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Real-Time ADK Multi-Agent Sync</span>
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Ready
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TracePanel;
