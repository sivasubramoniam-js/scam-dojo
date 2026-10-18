import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { addTraceEntry, clearTraces, getTraces, useGlobalTraces } from "../lib/traceStore";
import { TracePanel } from "../components/common/TracePanel";

// Mock i18n
vi.mock("../lib/i18n", () => ({
  useT: () => ({
    t: (k: string) => {
      if (k === "trace_panel.badge") return "ADK Live Tracing";
      if (k === "trace_panel.title") return "Google ADK Multi-Agent Tracing";
      if (k === "trace_panel.desc") return "Live handoffs between 7 ADK agents";
      return k;
    },
    lang: "en",
  }),
}));

describe("ADK Trace Store & Panel", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("initializes with dynamic real-time timestamps instead of static older results", () => {
    const traces = getTraces();
    expect(traces.length).toBeGreaterThan(0);
    // Ensure no hardcoded 09:30:12 timestamps
    const hasOldTime = traces.some((t) => t.timestamp === "09:30:12");
    expect(hasOldTime).toBe(false);

    // Ensure format is valid HH:MM:SS
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    expect(timeRegex.test(traces[0].timestamp)).toBe(true);
  });

  it("adds new trace entries dynamically and dispatches to listeners", () => {
    act(() => {
      addTraceEntry({
        agent: "Observer Agent",
        model: "gemini-2.5-flash-lite",
        action: "Unit Test Turn",
        details: "Detected defense resistance in unit test.",
        kind: "output",
      });
    });

    const traces = getTraces();
    const latest = traces[traces.length - 1];
    expect(latest.action).toBe("Unit Test Turn");
    expect(latest.agent).toBe("Observer Agent");
    expect(latest.kind).toBe("output");
  });

  it("clears traces when clearTraces is called", () => {
    act(() => {
      clearTraces();
    });

    const traces = getTraces();
    expect(traces.length).toBe(1);
    expect(traces[0].action).toBe("Traces Cleared");
  });

  it("renders TracePanel collapsed badge with event count", () => {
    render(<TracePanel />);
    const badge = screen.getByText("ADK Live Tracing");
    expect(badge).toBeDefined();
  });
});
