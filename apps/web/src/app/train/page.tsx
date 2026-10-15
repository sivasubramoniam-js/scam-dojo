import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchScenarios,
  createTrainSession,
  sendTrainMessage,
  endTrainSession,
  ScenarioItem,
} from "@/lib/api";
import { scrubPii } from "@/lib/pii";

interface ChatMessage {
  id: string;
  role: "scammer" | "user" | "sensei";
  text: string;
}

export function TrainPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("fake_kyc");
  const [activeScenarioInfo, setActiveScenarioInfo] = useState<{
    title: string;
    orgLabel: string;
    personaName: string;
  }>({
    title: "Fake KYC Call",
    orgLabel: "Orion Bank (simulated)",
    personaName: "Rakesh Verma",
  });

  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [tension, setTension] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showTrace, setShowTrace] = useState(true);
  const [traces, setTraces] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [debriefInfo, setDebriefInfo] = useState<any | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Load scenarios from live backend
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetSlug = params.get("forged") || params.get("slug");

    fetchScenarios()
      .then((res) => {
        if (res?.items?.length) {
          setScenarios(res.items);
          if (targetSlug && res.items.some((s) => s.slug === targetSlug)) {
            setSelectedSlug(targetSlug);
          } else {
            const defaultScen = res.items.find((s) => s.recommended) || res.items[0];
            setSelectedSlug(defaultScen.slug);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Quick reply chips
  const chips = [
    "I'd call my bank on the number on my card",
    "Why do you need this? What is your employee ID?",
    "OK, the code is 482913",
  ];

  const startDrill = async (slugToStart?: string) => {
    const slug = slugToStart || selectedSlug;
    setStarted(true);
    setIsDone(false);
    setDebriefInfo(null);
    setTension(0);
    setIsTyping(true);
    setTraces(["Live Backend Pipeline: connecting to /v1/train/sessions..."]);

    try {
      const sess = await createTrainSession(slug);
      if (sess?.sessionId) {
        setSessionId(sess.sessionId);
        setActiveScenarioInfo({
          title: sess.scenario?.title || "Simulated Drill",
          orgLabel: sess.scenario?.orgLabel || "Official Support (simulated)",
          personaName: sess.scenario?.personaName || "Officer",
        });

        const initialMsg = sess.messages?.[0]?.text || "Sir, this is support regarding your account.";
        setMessages([
          {
            id: `init-${Date.now()}`,
            role: "scammer",
            text: initialMsg,
          },
        ]);
        setTraces([
          `Session active: ${sess.sessionId} (Live Backend)`,
          `Scenario: ${sess.scenario?.title} · Difficulty: ${sess.difficulty}`,
          `Persona: ${sess.scenario?.personaName} (${sess.scenario?.orgLabel})`,
          `Initial stage: ${sess.stage || "hook"} · tension: ${sess.tension || 0}`,
        ]);
      }
    } catch {
      // Fallback in case of network issue
      const fallbackMsg =
        "Sir, this is Rakesh from Orion Bank Customer Support. Your KYC document expired today and your savings account is scheduled for immediate suspension. Are you available for 2 minutes to update it?";
      setMessages([
        {
          id: `init-${Date.now()}`,
          role: "scammer",
          text: fallbackMsg,
        },
      ]);
      setTraces(["Fallback mode: local simulator active"]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const raw = (textToSend || inputVal).trim();
    if (!raw || isDone) return;
    setInputVal("");

    // Client-side PII check
    const scrubbed = scrubPii(raw);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: scrubbed.text,
    };

    setMessages((prev) => [...prev, userMsg]);

    if (scrubbed.found.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          role: "sensei",
          text: `Privacy Shield Active: Detected [${scrubbed.found.join(", ").toUpperCase()}]. Always practice with simulated values.`,
        },
      ]);
    }

    setIsTyping(true);

    if (sessionId) {
      try {
        const res = await sendTrainMessage(sessionId, scrubbed.text);

        setIsTyping(false);

        // Update tension from backend live state
        if (typeof res?.state?.tension === "number") {
          setTension(res.state.tension);
        }

        // Add backend agent trace
        setTraces((t) => [
          ...t,
          `Turn ${res?.state?.turn ?? "?"} · Stage: ${res?.state?.stage ?? "active"} · Tension: ${res?.state?.tension ?? 0}/10 · Backend Status: ${res?.state?.status}`,
        ]);

        // Scammer reply from live LLM / state machine
        if (res?.message?.text) {
          setMessages((prev) => [
            ...prev,
            {
              id: `scam-${Date.now()}`,
              role: "scammer",
              text: res.message.text,
            },
          ]);
        }

        // Check if session has ended
        if (res?.sessionEnd) {
          setIsDone(true);
          setDebriefInfo(res.sessionEnd);
          const outcome = res.sessionEnd.outcome;
          setMessages((prev) => [
            ...prev,
            {
              id: `end-${Date.now()}`,
              role: "sensei",
              text:
                outcome === "user_won"
                  ? "Counter-Strike Won! You maintained independent verification and disarmed the scammer."
                  : outcome === "user_fell"
                  ? "Strike Landed! The scammer extracted critical credentials. Review your debrief."
                  : "Drill completed.",
            },
          ]);
        }
        return;
      } catch (err: any) {
        // Fallback to local response if network error
        setTraces((t) => [...t, `Backend note: ${err.message || "using local fallback"}`]);
      }
    }

    // Local fallback if no session or network error
    setTimeout(() => {
      setIsTyping(false);
      setTension((t) => Math.min(10, t + 2));
      setMessages((prev) => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          role: "scammer",
          text: "Sir, please do not disconnect. If you hang up, the account will be locked.",
        },
      ]);
    }, 600);
  };

  const handleHangUp = async () => {
    setIsDone(true);
    if (sessionId) {
      try {
        const res = await endTrainSession(sessionId, "walked_away");
        if (res) {
          setDebriefInfo(res);
          setTraces((t) => [
            ...t,
            `Session ended: walked_away · Final Score: ${res.score?.finalScore ?? 30} pts · Resilience: ${res.resilience?.after ?? 37}`,
          ]);
        }
      } catch {}
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `hang-${Date.now()}`,
        role: "sensei",
        text: "You disconnected the call! Walking away from an unverified caller is always the safest defensive maneuver.",
      },
    ]);
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const activeScenario = scenarios.find((s) => s.slug === selectedSlug);

  return (
    <div className="pt-4 pb-8">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--ink)] mb-1">
          Live Scammer Simulation
        </h2>
        <p className="text-[var(--mut)] text-sm sm:text-base">
          Connected to FastAPI backend with Google Cloud ADK & Gemini Agent orchestration.
        </p>
      </div>

      {/* Scenario Picker Carousel / Select */}
      {!started && (
        <div className="mb-6">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--mut)] block mb-2">
            Select Live Threat Scenario:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {scenarios.map((scen) => {
              const isSelected = scen.slug === selectedSlug;
              return (
                <button
                  key={scen.slug}
                  type="button"
                  onClick={() => setSelectedSlug(scen.slug)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--sf)] border-[var(--act)] ring-2 ring-[var(--act)]/30"
                      : "bg-[var(--sf2)]/50 border-[var(--line)] hover:border-[var(--act)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[var(--act)] capitalize">
                      {scen.channel?.replace("_", " ")}
                    </span>
                    <span className="text-[var(--mut)] font-semibold">
                      ~{scen.estMinutes} mins
                    </span>
                  </div>
                  <b className="text-sm text-[var(--ink)] block mb-0.5">{scen.title}</b>
                  <p className="text-xs text-[var(--mut)] line-clamp-2">{scen.blurb}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PII Notice */}
      <div className="dojo-notice flex items-center justify-between gap-2 text-xs text-[var(--mut)]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--safe)]">shield</span>
          <span>Zero-PII Active: Client & backend auto-redact Aadhaar, PAN, OTP, and cards.</span>
        </div>
        <span className="inline-flex items-center gap-1 font-bold text-[var(--safe)] bg-[var(--safe)]/10 px-2 py-0.5 rounded-full text-[11px]">
          ● Live Backend
        </span>
      </div>

      {!started ? (
        <div className="mt-4 flex flex-col items-center justify-center p-8 bg-[var(--sf)] border border-[var(--line)] rounded-2xl text-center shadow-dojo">
          <div className="w-14 h-14 rounded-full bg-[var(--sf2)] flex items-center justify-center text-[var(--act)] mb-3">
            <span className="material-symbols-outlined text-[28px]">sports_martial_arts</span>
          </div>
          <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-1">
            {activeScenario?.title || "Fake KYC Call"}
          </h3>
          <p className="text-[var(--mut)] text-sm max-w-md mb-6 leading-relaxed">
            {activeScenario?.blurb ||
              "A simulated scammer will use authority, fear, and tight deadlines to extract your credentials. Practice countering in real-time."}
          </p>
          <button
            type="button"
            onClick={() => startDrill()}
            className="dojo-btn px-8 text-base shadow-dojo"
          >
            Start live drill →
          </button>
        </div>
      ) : (
        /* Stage */
        <div className="dojo-stage mt-4 animate-in fade-in duration-200">
          {/* Stage Header */}
          <div className="dojo-sh">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--bad)] animate-pulse"></span>
              <div>
                <b className="text-sm sm:text-base text-[var(--ink)] block leading-tight">
                  {activeScenarioInfo.orgLabel}
                </b>
                <span className="text-xs text-[var(--mut)]">
                  Caller: {activeScenarioInfo.personaName} · Session: {sessionId?.slice(0, 8)}…
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTrace(!showTrace)}
                className="text-xs px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--mut)] hover:text-[var(--ink)] cursor-pointer"
              >
                {showTrace ? "Hide trace" : "Agent trace"}
              </button>
              <button
                type="button"
                onClick={handleHangUp}
                disabled={isDone}
                className="dojo-btn bad min-h-[36px] px-3 text-xs"
              >
                Hang up
              </button>
            </div>
          </div>

          {/* 10-Bar Pressure Meter (Live Backend Tension) */}
          <div
            className="flex items-center gap-1 px-4 pt-3 pb-1 text-xs"
            role="meter"
            aria-label="Pressure"
            aria-valuenow={tension}
            aria-valuemin={0}
            aria-valuemax={10}
          >
            <span className="mr-2 text-[var(--mut)] font-semibold">Tension: {tension}/10</span>
            {Array.from({ length: 10 }).map((_, i) => {
              const on = i < tension;
              const colorClass = on
                ? tension >= 7
                  ? "bg-[var(--bad)] border-transparent"
                  : tension >= 4
                  ? "bg-[var(--warn)] border-transparent"
                  : "bg-[var(--safe)] border-transparent"
                : "bg-[var(--sf2)] border-[var(--line)]";
              return (
                <i
                  key={i}
                  className={`flex-1 h-2 rounded-xs border transition-all duration-300 ${colorClass}`}
                />
              );
            })}
          </div>

          {/* Chat Message Log */}
          <div
            ref={logRef}
            className="h-[360px] max-h-[44vh] overflow-y-auto p-4 flex flex-col gap-2.5"
            role="log"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[84%] px-3.5 py-2.5 text-sm sm:text-base leading-relaxed ${
                  m.role === "scammer"
                    ? "self-start bg-[var(--sf2)] text-[var(--ink)] rounded-2xl rounded-tl-xs"
                    : m.role === "user"
                    ? "self-end bg-[var(--act)] text-white rounded-2xl rounded-tr-xs"
                    : "self-center bg-transparent border border-dashed border-[var(--line)] text-[var(--mut)] rounded-xl text-xs sm:text-sm text-center my-1"
                }`}
              >
                {m.text}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-1.5 px-3 py-2 self-start bg-[var(--sf2)] rounded-2xl rounded-tl-xs">
                <i className="w-2 h-2 rounded-full bg-[var(--mut)] animate-bounce" />
                <i className="w-2 h-2 rounded-full bg-[var(--mut)] animate-bounce [animation-delay:150ms]" />
                <i className="w-2 h-2 rounded-full bg-[var(--mut)] animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {/* Quick Reply Chips */}
          {!isDone && (
            <div className="flex flex-wrap gap-2 px-3 pb-2 pt-1">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip)}
                  className="px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] hover:border-[var(--act)] transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Composer */}
          <div className="flex gap-2 p-3 border-t border-[var(--line)] bg-[var(--sf)]">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isDone || isTyping}
              placeholder={isDone ? "Drill completed." : "Type your reply to the caller…"}
              maxLength={500}
              aria-label="Your reply"
              className="flex-1 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--act)]"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isDone || isTyping || !inputVal.trim()}
              className="dojo-btn min-h-[44px] px-5 text-sm"
            >
              Send
            </button>
          </div>

          {/* Collapsible Live Agent Trace Panel */}
          {showTrace && (
            <div className="p-3 border-t border-[var(--line)] bg-[var(--sf2)]/50 text-xs font-mono text-[var(--mut)] max-h-36 overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--line)] mb-1.5">
                <b className="text-[var(--ink)]">Google ADK Agent Trace:</b>
                <span className="text-[10px] text-[var(--safe)] font-bold">LIVE AGENT TELEMETRY</span>
              </div>
              {traces.map((t, idx) => (
                <div key={idx} className="py-0.5 leading-snug">
                  › {t}
                </div>
              ))}
            </div>
          )}

          {/* Completion Action Bar */}
          {isDone && (
            <div className="p-4 bg-[var(--sf2)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div>
                <b className="text-sm text-[var(--ink)] block">
                  Drill Completed · Score: {debriefInfo?.score?.finalScore ?? 30} pts
                </b>
                <span className="text-xs text-[var(--mut)]">
                  Session recorded in SQLite. Resilience updated on profile.
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStarted(false)}
                  className="dojo-btn q min-h-[40px] px-4 text-xs"
                >
                  Choose another drill
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="dojo-btn min-h-[40px] px-4 text-xs"
                >
                  View your belt →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TrainPage;
