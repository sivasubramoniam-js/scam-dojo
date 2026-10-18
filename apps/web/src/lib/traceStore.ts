/**
 * Global ADK Multi-Agent Trace Store.
 * Provides real-time synchronization between API streaming events,
 * ADK agents (Observer, Scammer, Threat Analyst, Recovery Planner, Scenario Forge, etc.),
 * and the floating TracePanel UI.
 */

import { useState, useEffect } from "react";

export interface TraceEntry {
  id: string;
  timestamp: string; // "HH:MM:SS" local time
  agent: string;
  model: string;
  action: string;
  details: string;
  kind?: "start" | "output" | "code" | "end" | "error" | "info";
  latencyMs?: number;
}

const STORAGE_KEY = "scam_dojo_adk_traces_v2";
const MAX_TRACES = 80;

function getCurrentTimeString(offsetSeconds = 0): string {
  const d = new Date(Date.now() - offsetSeconds * 1000);
  return d.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function createInitialTraces(): TraceEntry[] {
  return [
    {
      id: "tr_init_1",
      timestamp: getCurrentTimeString(45),
      agent: "ADK Runtime",
      model: "gemini-2.5-flash",
      action: "Runtime Online",
      details: "Google Agent Development Kit (ADK) session runtime initialized. 7 defensive agents registered and ready.",
      kind: "info",
    },
    {
      id: "tr_init_2",
      timestamp: getCurrentTimeString(35),
      agent: "Observer Agent",
      model: "gemini-2.5-flash-lite",
      action: "Referee Agent Ready",
      details: "Tension and psychological coercion detectors primed for interactive turn assessments.",
      kind: "start",
    },
    {
      id: "tr_init_3",
      timestamp: getCurrentTimeString(25),
      agent: "Scammer Persona",
      model: "gemini-2.5-flash",
      action: "Persona Engine Ready",
      details: "Adaptive urgency escalation and tactic switching matrix loaded.",
      kind: "info",
    },
    {
      id: "tr_init_4",
      timestamp: getCurrentTimeString(15),
      agent: "Threat Analyst",
      model: "gemini-2.5-flash",
      action: "Multimodal Scanner Ready",
      details: "Domain verification, shortener detangling, and OCR evidence pipelines armed.",
      kind: "info",
    },
    {
      id: "tr_init_5",
      timestamp: getCurrentTimeString(5),
      agent: "Recovery Planner",
      model: "gemini-2.5-flash",
      action: "Resource Grounding Ready",
      details: "Helpline 1930 & RBI dispute frameworks connected for golden-hour synthesis.",
      kind: "info",
    },
  ];
}

let memoryTraces: TraceEntry[] = [];
let isLoaded = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("[TraceStore] Listener error:", e);
    }
  });
}

function loadTraces(): TraceEntry[] {
  if (isLoaded) return memoryTraces;

  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryTraces = parsed;
          isLoaded = true;
          return memoryTraces;
        }
      }
    } catch (e) {
      console.warn("[TraceStore] Could not read sessionStorage:", e);
    }
  }

  memoryTraces = createInitialTraces();
  isLoaded = true;
  saveTraces();
  return memoryTraces;
}

function saveTraces(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryTraces));
  } catch (e) {
    console.warn("[TraceStore] Could not write sessionStorage:", e);
  }
}

export function addTraceEntry(
  entry: Partial<TraceEntry> & { agent: string; action: string; details: string }
): void {
  if (!isLoaded) {
    loadTraces();
  }

  const newEntry: TraceEntry = {
    id: entry.id || `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || getCurrentTimeString(),
    agent: entry.agent,
    model: entry.model || "gemini-2.5-flash",
    action: entry.action,
    details: entry.details,
    kind: entry.kind || "output",
    latencyMs: entry.latencyMs,
  };

  memoryTraces.push(newEntry);
  if (memoryTraces.length > MAX_TRACES) {
    memoryTraces = memoryTraces.slice(-MAX_TRACES);
  }

  saveTraces();
  notify();
}

export function clearTraces(): void {
  memoryTraces = [
    {
      id: `tr_cleared_${Date.now()}`,
      timestamp: getCurrentTimeString(),
      agent: "ADK Runtime",
      model: "gemini-2.5-flash",
      action: "Traces Cleared",
      details: "Live trace history reset by user. Monitoring new agent handoffs...",
      kind: "info",
    },
  ];
  saveTraces();
  notify();
}

export function getTraces(): TraceEntry[] {
  return [...loadTraces()];
}

export function useGlobalTraces(): {
  traces: TraceEntry[];
  addTrace: typeof addTraceEntry;
  clearTraces: typeof clearTraces;
} {
  const [traces, setTraces] = useState<TraceEntry[]>(() => loadTraces());

  useEffect(() => {
    const handleUpdate = () => {
      setTraces([...loadTraces()]);
    };

    listeners.add(handleUpdate);
    // Ensure state matches current traces on mount
    setTraces([...loadTraces()]);

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return {
    traces,
    addTrace: addTraceEntry,
    clearTraces,
  };
}
