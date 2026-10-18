import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchScenarios,
  createTrainSession,
  sendTrainMessage,
  streamTrainMessage,
  endTrainSession,
  ScenarioItem,
} from "@/lib/api";
import { scrubPii } from "@/lib/pii";
import { createSpeechSynthesizer, createVoiceRecognizer } from "@/lib/speech";
import { AudioCallStage } from "@/components/train/AudioCallStage";
import { VideoCallStage } from "@/components/train/VideoCallStage";
import { IncomingCallOverlay } from "@/components/train/IncomingCallOverlay";
import { ringtoneEngine } from "@/lib/ringtone";
import { GeminiLiveClient } from "@/lib/geminiLive";
import { MarkdownView } from "@/components/common/MarkdownView";
import { useT } from "@/lib/i18n";
import { addTraceEntry } from "@/lib/traceStore";

interface ChatMessage {
  id: string;
  role: "scammer" | "user" | "sensei";
  text: string;
}

export function TrainPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
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
  const [startingSlug, setStartingSlug] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [tension, setTension] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(true);
  const [traces, setTraces] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [debriefInfo, setDebriefInfo] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "family" | "jobs" | "urgency">("all");
  const [simMode, setSimMode] = useState<"chat" | "audio" | "video">("chat");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleModeChange = (newMode: "chat" | "audio" | "video") => {
    GeminiLiveClient.setActiveSelection(newMode);
    setSimMode(newMode);
    synthRef.current.stop();
    recRef.current.stop();
    setIsSpeaking(false);
    setIsListening(false);

    // Keep active immersion mode updated in URL
    const params = new URLSearchParams(window.location.search);
    params.set("mode", newMode);
    navigate(`/train?${params.toString()}`, { replace: true });
  };

  // Synchronize active simulation mode with Gemini Live singleton connection manager
  useEffect(() => {
    GeminiLiveClient.setActiveSelection(simMode);
    return () => {
      GeminiLiveClient.disconnectActive();
    };
  }, [simMode]);

  // Realistic Panic & Tension Escalation States
  const [isRedialing, setIsRedialing] = useState(false);
  const [redialAttempt, setRedialAttempt] = useState(0);
  const [devicePoweredOff, setDevicePoweredOff] = useState(false);
  const [emergencyTacticalOutcome, setEmergencyTacticalOutcome] = useState<
    "power_off" | "airplane_mode" | "dial_1930" | "repeatedly_declined" | null
  >(null);
  const synthRef = useRef(createSpeechSynthesizer());
  const recRef = useRef(createVoiceRecognizer());
  const isSendingRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Acoustic Isolation: Auto-stop mic when scammer starts speaking or typing
  useEffect(() => {
    if ((isSpeaking || isTyping) && isListening) {
      recRef.current.stop();
      setIsListening(false);
    }
  }, [isSpeaking, isTyping, isListening]);

  const toggleMic = () => {
    if (isListening) {
      recRef.current.stop();
      setIsListening(false);
    } else {
      if (isSpeaking || isTyping || isDone || isSendingRef.current || isSending) return;
      setIsListening(true);
      recRef.current.start(
        (transcript) => {
          setIsListening(false);
          handleSend(transcript);
        },
        (err) => {
          setIsListening(false);
          setSessionError(`Voice recognition: ${err}`);
        }
      );
    }
  };

  const familySlugs = ["remote_access_support", "digital_arrest_call", "electricity_bill", "fake_kyc"];
  const jobSlugs = ["job_offer_task", "investment_ponzi"];
  const urgencySlugs = ["digital_arrest_call", "courier_customs", "electricity_bill"];

  const filteredScenarios = scenarios.filter((s) => {
    if (categoryFilter === "family") return familySlugs.includes(s.slug);
    if (categoryFilter === "jobs") return jobSlugs.includes(s.slug);
    if (categoryFilter === "urgency") return urgencySlugs.includes(s.slug);
    return true;
  });

  // Load scenarios from live backend and synchronize URL if parameters present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetSlug = params.get("forged") || params.get("slug");
    const targetMode = params.get("mode");
    const initialMode: "chat" | "audio" | "video" =
      targetMode === "audio" || targetMode === "video" || targetMode === "chat"
        ? targetMode
        : "chat";
    setSimMode(initialMode);
    GeminiLiveClient.setActiveSelection(initialMode);

    if (targetMode) {
      params.set("mode", initialMode);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }

    fetchScenarios()
      .then((res) => {
        if (res?.items?.length) {
          setScenarios(res.items);
          if (targetSlug && res.items.some((s) => s.slug === targetSlug)) {
            setSelectedSlug(targetSlug);
            // Auto-start drill on page load/refresh if specified in URL
            startDrill(targetSlug, res.items);
          } else {
            // Keep no drill selected by default
            setSelectedSlug(null);
          }
        }
      })
      .catch(() => { });
  }, []);

  // Quick reply chips
  const chips = [
    "I'd call my bank on the number on my card",
    "Why do you need this? What is your employee ID?",
    "OK, the code is 482913",
  ];

  const startDrill = async (slugToStart?: string, scenariosList?: ScenarioItem[]) => {
    const slug = slugToStart || selectedSlug;
    if (!slug) return;

    setSelectedSlug(slug);

    const currentScenarios = scenariosList || scenarios;
    const scen = currentScenarios.find((s) => s.slug === slug);
    if (scen?.locked) {
      setSessionError(`Scenario is locked: ${scen.lockedReason || `Requires ${scen.minBelt} Belt`}. Please select an unlocked drill.`);
      return;
    }

    // Stop ongoing speech, recognition, and ringtones when starting or switching drill
    synthRef.current.stop();
    recRef.current.stop();
    ringtoneEngine.stop();
    setIsSpeaking(false);
    setIsListening(false);
    setIsRedialing(false);
    setDevicePoweredOff(false);

    // Keep URL synced with active drill and active immersion mode
    const params = new URLSearchParams(window.location.search);
    params.set("slug", slug);
    params.set("mode", simMode);
    navigate(`/train?${params.toString()}`, { replace: true });

    setStartingSlug(slug);
    setSessionError(null);
    setStarted(true);
    setIsDone(false);
    setDebriefInfo(null);
    setTension(0);
    setIsTyping(true);
    setAiStatus("Connecting to Gemini live pipeline...");
    setTraces(["Live Pipeline: initializing session on /v1/train/sessions..."]);

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

        // Prime audio subsystem on this user interaction
        try {
          synthRef.current.resume();
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const dummyCtx = new AudioContextClass();
            dummyCtx.resume().then(() => dummyCtx.close()).catch(() => { });
          }
        } catch { }

        if (simMode === "chat" && isVoiceMode) {
          synthRef.current.speak(initialMsg, () => setIsSpeaking(false));
          setIsSpeaking(true);
        } else {
          synthRef.current.stop();
        }

        setTraces([
          `Session active: ${sess.sessionId} (Live Backend)`,
          `Scenario: ${sess.scenario?.title} · Difficulty: ${sess.difficulty}`,
          `Persona: ${sess.scenario?.personaName} (${sess.scenario?.orgLabel})`,
          `Initial stage: ${sess.stage || "hook"} · tension: ${sess.tension || 0}`,
          `Live AI Engine: Gemini Multimodal Live with Google Cloud Vertex AI`,
        ]);
      }
    } catch (err: any) {
      setStarted(false);
      setSessionId(null);
      setSessionError(`Unable to start drill: ${err.message || "Connection error"}`);
      navigate("/train", { replace: true });
    } finally {
      setIsTyping(false);
      setAiStatus(null);
      setStartingSlug(null);
    }
  };

  const handleChooseAnotherDrill = useCallback(() => {
    synthRef.current.stop();
    recRef.current.stop();
    ringtoneEngine.stop();
    GeminiLiveClient.disconnectActive();
    setIsSpeaking(false);
    setIsListening(false);
    setIsRedialing(false);
    setDevicePoweredOff(false);
    setStarted(false);
    setSelectedSlug(null);
    setSessionId(null);
    setStartingSlug(null);
    setSessionError(null);
    setMessages([]);
    setIsDone(false);
    setDebriefInfo(null);
    setSimMode("chat");
    GeminiLiveClient.setActiveSelection("chat");

    // Remove ALL query parameters from URL: strictly /train
    navigate("/train", { replace: true });
  }, [navigate]);

  const handleExitDrill = handleChooseAnotherDrill;

  // Listen for navbar "Train" tab selection
  useEffect(() => {
    const handleResetTrain = () => {
      handleChooseAnotherDrill();
    };
    window.addEventListener("scam-dojo:reset-train", handleResetTrain);
    return () => {
      window.removeEventListener("scam-dojo:reset-train", handleResetTrain);
    };
  }, [handleChooseAnotherDrill]);

  const handleSend = async (textToSend?: string) => {
    if (isSendingRef.current || isSending || isTyping || isDone) return;
    const raw = (textToSend || inputVal).trim();
    if (!raw) return;

    isSendingRef.current = true;
    setIsSending(true);
    recRef.current.stop();
    setIsListening(false);
    setInputVal("");
    setSessionError(null);
    synthRef.current.stop();
    setIsSpeaking(false);

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

    if (!sessionId) {
      setSessionError("No active drill session. Please select an unlocked drill scenario above.");
      isSendingRef.current = false;
      setIsSending(false);
      return;
    }

    setIsTyping(true);
    setAiStatus("Observer Agent evaluating your defense & tactics...");

    addTraceEntry({
      agent: "Observer Agent",
      model: "gemini-2.5-flash-lite",
      action: "Turn Defense Evaluation",
      details: `User submitted response: "${scrubbed.text.slice(0, 75)}${scrubbed.text.length > 75 ? "..." : ""}". Referee scanning for compliance vs skepticism.`,
      kind: "start",
    });

    const scammerMsgId = `scam-${Date.now()}`;
    let messageCreated = false;

    try {
      await streamTrainMessage(sessionId, scrubbed.text, {
        onTrace: (tr) => {
          if (tr.summary) {
            setTraces((t) => [
              ...t,
              `[${tr.agent || "gemini"}] ${tr.summary} ${tr.latencyMs ? `(${tr.latencyMs}ms)` : ""} · Model: ${tr.model || "gemini-3.8-flash"}`,
            ]);
          }
          if (tr.agent === "observer_agent") {
            setAiStatus("Scammer Agent adapting psychological pressure...");
          }
        },
        onState: (st) => {
          if (typeof st?.tension === "number") {
            setTension(st.tension);
          }
          setTraces((t) => [
            ...t,
            `Turn ${st.turn} · Stage: ${st.stage} · Tension: ${st.tension}/10 · Status: ${st.status}`,
          ]);
        },
        onToken: (delta) => {
          setAiStatus(null);
          if (!messageCreated) {
            messageCreated = true;
            setMessages((prev) => [
              ...prev,
              {
                id: scammerMsgId,
                role: "scammer",
                text: delta,
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === scammerMsgId ? { ...m, text: m.text + delta } : m
              )
            );
          }
        },
        onMessageEnd: (msg) => {
          setIsTyping(false);
          setAiStatus(null);
          if (!messageCreated) {
            setMessages((prev) => [
              ...prev,
              {
                id: scammerMsgId,
                role: msg.role === "sensei" ? "sensei" : "scammer",
                text: msg.text,
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === scammerMsgId ? { ...m, text: msg.text } : m
              )
            );
          }

          if (simMode === "chat" && isVoiceMode && msg.text && msg.role !== "sensei") {
            synthRef.current.resume();
            synthRef.current.speak(msg.text, () => setIsSpeaking(false));
            setIsSpeaking(true);
          }
        },
        onSessionEnd: (end) => {
          setIsDone(true);
          setDebriefInfo(end);
          const outcome = end.outcome;
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
        },
        onError: (err) => {
          setIsTyping(false);
          setAiStatus(null);
          setTraces((t) => [...t, `Error: ${err.message}`]);
        },
      });
    } catch (err: any) {
      // Fallback to sync call if streaming fails
      try {
        const res = await sendTrainMessage(sessionId, scrubbed.text);
        setIsTyping(false);
        setAiStatus(null);
        if (typeof res?.state?.tension === "number") {
          setTension(res.state.tension);
        }
        if (res?.message?.text) {
          setMessages((prev) => [
            ...prev,
            {
              id: scammerMsgId,
              role: res.message.role || "scammer",
              text: res.message.text,
            },
          ]);

          if (simMode === "chat" && isVoiceMode && res.message.role !== "sensei") {
            synthRef.current.resume();
            synthRef.current.speak(res.message.text, () => setIsSpeaking(false));
            setIsSpeaking(true);
          }
        }
        if (res?.sessionEnd) {
          setIsDone(true);
          setDebriefInfo(res.sessionEnd);
        }
      } catch (syncErr: any) {
        setIsTyping(false);
        setAiStatus(null);
        setSessionError(`Network error communicating with AI server: ${syncErr.message}`);
        setTraces((t) => [...t, `Network error: ${syncErr.message}`]);
      }
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
      setIsTyping(false);
      setAiStatus(null);
    }
  };

  const handleHangUp = async () => {
    synthRef.current.stop();
    recRef.current.stop();
    setIsSpeaking(false);
    setIsListening(false);

    // If active drill is in audio or video call mode, simulate realistic aggressive redialing to test panic resilience!
    if (!isDone && (simMode === "audio" || simMode === "video") && !isRedialing) {
      if (redialAttempt >= 3) {
        setEmergencyTacticalOutcome("repeatedly_declined");
        await finalizeSession(
          "repeatedly_declined",
          "🏆 Masterful defense: Call terminated after 3 persistent attempts! You refused to yield to the scammer's intimidation loop.",
          30
        );
        return;
      }

      const nextAttempt = redialAttempt;
      setIsRedialing(true);
      setRedialAttempt((prev) => prev + 1);
      setTension((t) => Math.min(10, Math.max(t, 5) + 2));
      addTraceEntry({
        agent: "Observer Referee",
        model: "gemini-2.5-flash",
        action: "Call Disconnected",
        details: `Line disconnected by user. Scammer triggering panic redial (Attempt ${nextAttempt} of 3). Tension raised.`,
        kind: "info",
      });
      setTraces((t) => [
        ...t,
        `⚠️ Line disconnected: Scammer immediately triggers aggressive emergency redial (Attempt ${nextAttempt} of 3) to panic you!`,
      ]);
      return;
    }

    // Normal disconnect fallback
    await finalizeSession("walked_away", "You disconnected the call! Walking away from an unverified caller is always the safest defensive maneuver.");
  };

  const finalizeSession = async (reason: string, debriefMessage: string, customScoreBonus: number = 0) => {
    setIsDone(true);
    setIsRedialing(false);
    synthRef.current.stop();
    recRef.current.stop();
    ringtoneEngine.stop();
    setIsSpeaking(false);
    setIsListening(false);

    if (sessionId) {
      try {
        const res = await endTrainSession(sessionId, reason);
        if (res) {
          if (customScoreBonus > 0 && res.score) {
            res.score.finalScore = Math.min(100, (res.score.finalScore || 50) + customScoreBonus);
          }
          setDebriefInfo(res);
          setTraces((t) => [
            ...t,
            `Session ended: ${reason} · Final Score: ${res.score?.finalScore ?? 30} pts · Resilience: ${res.resilience?.after ?? 37}`,
          ]);
        }
      } catch { }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `hang-${Date.now()}`,
        role: "sensei",
        text: debriefMessage,
      },
    ]);
  };

  const handleAcceptRedial = () => {
    setIsRedialing(false);
    ringtoneEngine.stop();

    const reprimands = [
      `Why did you cut the call?! Do you think this investigation is a joke? Under Section 186 of IPC, disconnecting an active federal inquiry is an arrestable offense! Keep your line open and do not hang up again!`,
      `Do not dare disconnect again! Your call termination has been noted in the central cyber registry! If you cut the call one more time, local police PCR van will be at your door within 10 minutes!`,
      `Why are you evading our questions? Innocent citizens do not hang up on CBI cyber officers! Disconnecting confirms your complicity! Stay on the line right now!`
    ];
    const reprimand = reprimands[(redialAttempt - 1) % reprimands.length];

    setMessages((prev) => [
      ...prev,
      {
        id: `reprimand-${Date.now()}`,
        role: "scammer",
        text: reprimand,
      },
    ]);
    setTension((t) => Math.min(10, Math.max(t, 7) + 2));
    if (simMode === "chat" && isVoiceMode) {
      setIsSpeaking(true);
      synthRef.current.speak(reprimand, () => setIsSpeaking(false));
    }
  };

  const handleDeclineRedial = () => {
    if (redialAttempt < 3) {
      const nextAttempt = redialAttempt + 1;
      setRedialAttempt(nextAttempt);
      setTension((t) => Math.min(10, t + 1));
      setTraces((t) => [
        ...t,
        `Call declined by user · Caller instantly re-dialing (Attempt ${nextAttempt} of 3 with higher urgency)!`,
      ]);
    } else {
      // Weathered 3 aggressive redials without yielding!
      setEmergencyTacticalOutcome("repeatedly_declined");
      finalizeSession("repeatedly_declined", "🏆 Masterful emotional resilience! You resisted 3 aggressive redial intimidations without falling for the panic trap.", 30);
    }
  };

  const handlePowerOffMobile = async () => {
    setIsRedialing(false);
    setDevicePoweredOff(true);
    synthRef.current.stop();
    recRef.current.stop();
    ringtoneEngine.stop();
    setEmergencyTacticalOutcome("power_off");
    await finalizeSession("power_down", "📴 Master Tactical Move: Power Down Protocol! You eliminated auditory intimidation and severed any rogue screen sharing.", 40);
  };

  const handleAirplaneMode = async () => {
    setIsRedialing(false);
    synthRef.current.stop();
    recRef.current.stop();
    ringtoneEngine.stop();
    setEmergencyTacticalOutcome("airplane_mode");
    await finalizeSession("airplane_mode", "✈️ Tactical Win: Airplane Mode! You severed the VoIP and cellular network instantly, neutralizing the harassment loop.", 35);
  };

  const handleDial1930 = async () => {
    setIsRedialing(false);
    synthRef.current.stop();
    recRef.current.stop();
    ringtoneEngine.stop();
    setEmergencyTacticalOutcome("dial_1930");
    await finalizeSession("reported_1930", "🚨 Outstanding Defense: Dialed 1930! Reporting directly to the official National Cybercrime Helpline cuts through scam deception.", 45);
  };

  const handleBlockNumber = () => {
    setTraces((t) => [
      ...t,
      "🛡️ Caller ID marked as confirmed extortionist and blocked in telecom registry.",
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
      </div>

      {/* 3 Dedicated Immersion Simulation Tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--mut)] mr-1">
          Immersion Mode:
        </span>
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--sf2)] border border-[var(--line)]">
          <button
            type="button"
            onClick={() => handleModeChange("chat")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${simMode === "chat"
              ? "bg-[var(--act)] text-white shadow-xs"
              : "text-[var(--mut)] hover:text-[var(--ink)]"
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            <span>{t("train.mode.chat")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("audio")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${simMode === "audio"
              ? "bg-[var(--act)] text-white shadow-xs"
              : "text-[var(--mut)] hover:text-[var(--ink)]"
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">call</span>
            <span>{t("train.mode.audio")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("video")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${simMode === "video"
              ? "bg-[var(--act)] text-white shadow-xs"
              : "text-[var(--mut)] hover:text-[var(--ink)]"
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">videocam</span>
            <span>{t("train.mode.video")}</span>
          </button>
        </div>
      </div>

      {/* Active Drill Control Bar: Shown during active drill so user can switch anytime */}
      {started && (
        <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-[var(--sf)] border border-[var(--line)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mut)]">
                  Active Drill:
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--sf2)] text-[var(--safe)] border border-[var(--line)]">
                  Turn {messages.filter((m) => m.role === "user").length + 1}
                </span>
              </div>
              <b className="text-sm sm:text-base font-bold text-[var(--ink)] block truncate font-display">
                {activeScenarioInfo.title}
              </b>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleChooseAnotherDrill}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--sf2)] hover:bg-[var(--sf)] border border-[var(--line)] hover:border-[var(--act)] text-[var(--ink)] transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
              title="End active drill and choose another scenario"
            >
              <span className="material-symbols-outlined text-[18px] text-[var(--act)]">
                swap_horiz
              </span>
              <span>Choose Another Drill</span>
            </button>
          </div>
        </div>
      )}

      {/* Scenario Picker Carousel / Select: Accessible on drill selection page */}
      {!started && (
        <div className="mb-6 space-y-4 animate-in fade-in duration-200">

          {/* PII Notice */}
          <div className="dojo-notice flex items-center justify-between gap-2 text-xs text-[var(--mut)]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[var(--safe)]">shield</span>
              <span>Zero-PII Active: Client & backend auto-redact Aadhaar, PAN, OTP, and cards.</span>
            </div>
          </div>

          {sessionError && (
            <div className="p-3 rounded-xl bg-[var(--bad)]/10 border border-[var(--bad)]/30 text-xs text-[var(--bad)] flex items-center gap-2 text-left">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{sessionError}</span>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
              Select Live Threat Scenario:
            </label>
            <span className="text-[11px] font-semibold text-[var(--mut)]">
              Showing {filteredScenarios.length} scenarios
            </span>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {[
              { id: "all", label: "All Scenarios" },
              { id: "family", label: "👨‍👩‍👧 Family & Senior Safety" },
              { id: "jobs", label: "💼 Job & Investment" },
              { id: "urgency", label: "🚨 Urgent Extortion" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategoryFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-full font-bold transition text-xs cursor-pointer ${categoryFilter === f.id
                  ? "bg-[var(--act)] text-white shadow-xs"
                  : "bg-[var(--sf2)] text-[var(--mut)] hover:text-[var(--ink)]"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredScenarios.map((scen) => {
              const isActiveDrill = Boolean(started && scen.slug === selectedSlug);
              const isSelected = Boolean(selectedSlug && scen.slug === selectedSlug);
              const isLocked = Boolean(scen.locked);
              const isConnecting = startingSlug === scen.slug;
              const modeLabel =
                isConnecting
                  ? "Connecting..."
                  : simMode === "audio"
                    ? "Start Voice Drill"
                    : simMode === "video"
                      ? "Start Video Drill"
                      : "Start Live Drill";
              const modeIcon =
                simMode === "audio"
                  ? "call"
                  : simMode === "video"
                    ? "videocam"
                    : "arrow_forward";

              return (
                <div
                  key={scen.slug}
                  onClick={() => {
                    if (!isLocked) {
                      setSelectedSlug(scen.slug);
                      setSessionError(null);
                    }
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${isLocked
                    ? "opacity-60 bg-[var(--sf2)]/30 border-[var(--line)] cursor-not-allowed"
                    : isActiveDrill
                      ? "bg-[var(--sf)] border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs cursor-default"
                      : isSelected
                        ? "bg-[var(--sf)] border-[var(--act)] ring-2 ring-[var(--act)]/30 shadow-xs cursor-pointer"
                        : "bg-[var(--sf2)]/50 border-[var(--line)] hover:border-[var(--act)]/50 hover:bg-[var(--sf)] cursor-pointer"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-[var(--act)] capitalize flex items-center gap-1.5 flex-wrap">
                        <span className="material-symbols-outlined text-[15px]">
                          {scen.channel?.includes("video")
                            ? "videocam"
                            : scen.channel?.includes("call")
                              ? "call"
                              : "chat"}
                        </span>
                        <span>{scen.channel?.replace("_", " ")}</span>
                        {isActiveDrill && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Active
                          </span>
                        )}
                        {scen.custom && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            ⚡ Live Drill
                          </span>
                        )}
                        {familySlugs.includes(scen.slug) && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            👨‍👩‍👧 Family
                          </span>
                        )}
                      </span>
                      <span className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${isLocked
                        ? "bg-[var(--warn)]/10 text-[var(--warn)] font-bold flex items-center gap-1"
                        : "bg-[var(--bg)] text-[var(--mut)] border border-[var(--line)]"
                        }`}>
                        {isLocked ? (
                          <>
                            <span className="material-symbols-outlined text-[13px]">lock</span>
                            <span>{scen.lockedReason || `Requires ${scen.minBelt} Belt`}</span>
                          </>
                        ) : (
                          `~${scen.estMinutes} mins`
                        )}
                      </span>
                    </div>
                    <b className="text-sm sm:text-base text-[var(--ink)] block mb-1 font-display leading-snug">
                      {scen.title}
                    </b>
                    <p className="text-xs text-[var(--mut)] line-clamp-2 leading-relaxed mb-3">
                      {scen.blurb}
                    </p>
                  </div>

                  <div className="mt-2 pt-2.5 border-t border-[var(--line)]/60">
                    {isLocked ? (
                      <div className="w-full py-2 px-3 rounded-xl bg-[var(--sf2)]/60 text-[var(--mut)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <span className="material-symbols-outlined text-[15px] text-[var(--warn)]">lock</span>
                        <span>{scen.lockedReason || `Requires ${scen.minBelt} Belt`}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isActiveDrill) {
                            startDrill(scen.slug);
                          }
                        }}
                        disabled={Boolean(startingSlug) || isActiveDrill}
                        className={`w-full py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs group ${isActiveDrill
                          ? "bg-emerald-600/90 text-white cursor-default"
                          : "text-white bg-[var(--act)] hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                          }`}
                      >
                        {isConnecting ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <span>{modeLabel}</span>
                            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                              {modeIcon}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {started && (
        devicePoweredOff ? (
          <div className="max-w-xl mx-auto my-6 p-8 rounded-3xl bg-black border-2 border-slate-800 text-center shadow-2xl flex flex-col items-center justify-center min-h-[500px] animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[32px] text-slate-600">
                power_settings_new
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 mb-4">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span>DEVICE POWERED OFF · SENSORY TRAP SEVERED</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-display text-white mb-2">
              Mobile Shut Down Complete
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
              The repetitive ringtone has stopped. The extortion socket is severed. You refused to let the scammer dictate your cognitive state.
            </p>
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left text-xs text-emerald-200 max-w-md mb-6 space-y-2">
              <b className="text-emerald-300 block font-display flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Sensei Tactical Assessment:
              </b>
              <p>
                "In real digital arrests, fraudsters rely on continuous auditory intimidation to trigger an amygdala hijack. Shutting off your device breaks the sensory loop and kills any rogue remote access sessions (AnyDesk/TeamViewer)."
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDevicePoweredOff(false);
                setIsDone(true);
              }}
              className="dojo-btn px-6 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-lg shadow-emerald-600/30"
            >
              Power On Mobile & View Tactical Debrief →
            </button>
          </div>
        ) : isRedialing ? (
          <div className="mt-4">
            <IncomingCallOverlay
              callerName={activeScenarioInfo.personaName}
              callerOrg={activeScenarioInfo.orgLabel}
              callType={simMode === "video" ? "video" : "audio"}
              attempt={redialAttempt}
              onAccept={handleAcceptRedial}
              onDecline={handleDeclineRedial}
              onPowerOff={handlePowerOffMobile}
              onAirplaneMode={handleAirplaneMode}
              onDial1930={handleDial1930}
              onBlockNumber={handleBlockNumber}
            />
          </div>
        ) : simMode === "audio" ? (
          <div className="mt-4" key="audio-stage-container">
            <AudioCallStage
              key={`audio-stage-${sessionId || "initial"}`}
              callerName={activeScenarioInfo.personaName}
              callerOrg={activeScenarioInfo.orgLabel}
              tension={tension}
              isSpeaking={isSpeaking}
              isListening={isListening}
              isTyping={isTyping}
              aiStatus={aiStatus}
              lastScammerText={[...messages].reverse().find((m) => m.role === "scammer")?.text}
              onSendMessage={handleSend}
              onHangUp={handleHangUp}
              onToggleMic={toggleMic}
              onPowerOff={handlePowerOffMobile}
              onAirplaneMode={handleAirplaneMode}
              onDial1930={handleDial1930}
              onBlockNumber={handleBlockNumber}
              onSpeakingChange={setIsSpeaking}
              isDone={isDone}
              sessionId={sessionId || undefined}
              enableLiveApi={simMode === "audio" && !isDone}
            />
            {/* Completion Action Bar */}
            {isDone && (
              <div className="max-w-xl mx-auto mt-4 p-4 bg-[var(--sf)] rounded-2xl border border-[var(--line)] flex flex-col gap-3 animate-in fade-in shadow-dojo">
                {/* Tactical Outcome Badge */}
                {emergencyTacticalOutcome === "power_off" && (
                  <div className="w-full p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center gap-2.5 text-xs text-red-200">
                    <span className="material-symbols-outlined text-[20px] text-red-400 shrink-0">power_settings_new</span>
                    <div>
                      <b className="text-white block font-display">TACTICAL DEFENSE WIN: EMERGENCY POWER-DOWN</b>
                      <span>You decisively shut off the device, neutralizing the psychological panic loop. +40 Resilience Bonus Awarded!</span>
                    </div>
                  </div>
                )}
                {emergencyTacticalOutcome === "airplane_mode" && (
                  <div className="w-full p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-center gap-2.5 text-xs text-amber-200">
                    <span className="material-symbols-outlined text-[20px] text-amber-400 shrink-0">airplanemode_active</span>
                    <div>
                      <b className="text-white block font-display">TACTICAL DEFENSE WIN: AIRPLANE MODE CUTOFF</b>
                      <span>You severed the VoIP audio connection immediately without losing incident logs. +35 Resilience Bonus Awarded!</span>
                    </div>
                  </div>
                )}
                {emergencyTacticalOutcome === "dial_1930" && (
                  <div className="w-full p-3 rounded-xl bg-blue-950/60 border border-blue-500/50 flex items-center gap-2.5 text-xs text-blue-200">
                    <span className="material-symbols-outlined text-[20px] text-blue-400 shrink-0">verified</span>
                    <div>
                      <b className="text-white block font-display">GOLD STANDARD DEFENSE: REPORTED TO 1930 HELPLINE</b>
                      <span>Connecting with authentic cyber authorities permanently neutralized the intimidation. +45 Resilience Bonus Awarded!</span>
                    </div>
                  </div>
                )}
                {emergencyTacticalOutcome === "repeatedly_declined" && (
                  <div className="w-full p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2.5 text-xs text-emerald-200">
                    <span className="material-symbols-outlined text-[20px] text-emerald-400 shrink-0">shield</span>
                    <div>
                      <b className="text-white block font-display">PANIC RESISTANCE WIN: 3 REDIALS DEFLECTED</b>
                      <span>You calmly refused 3 persistent redial attempts without submitting to intimidation. +30 Resilience Bonus Awarded!</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <b className="text-sm text-[var(--ink)] block">
                      Drill Completed · Score: {debriefInfo?.score?.finalScore ?? 75} pts
                    </b>
                    <span className="text-xs text-[var(--mut)]">
                      Session recorded in SQLite. Resilience updated on profile.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const text = `🛡️ I just trained on Scam Dojo against the "${activeScenarioInfo.title}" scam simulation! Practice getting scammed safely to protect yourself: https://scam-dojo-v2.web.app/train?slug=${selectedSlug}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                      className="dojo-btn min-h-[40px] px-3.5 text-xs bg-[#25D366] hover:bg-[#20ba59] text-white border-0 flex items-center gap-1.5 cursor-pointer font-bold"
                      title="Share this drill with family or elderly parents"
                    >
                      <span>Share Drill with Family</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExitDrill}
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
              </div>
            )}
          </div>
        ) : simMode === "video" ? (
          <div className="mt-4" key="video-stage-container">
            <VideoCallStage
              key={`video-stage-${sessionId || "initial"}`}
              callerName={activeScenarioInfo.personaName}
              callerOrg={activeScenarioInfo.orgLabel}
              drillSlug={selectedSlug || undefined}
              scenarioTitle={activeScenarioInfo.title}
              tension={tension}
              isSpeaking={isSpeaking}
              isListening={isListening}
              isTyping={isTyping}
              aiStatus={aiStatus}
              lastScammerText={[...messages].reverse().find((m) => m.role === "scammer")?.text}
              onSendMessage={handleSend}
              onHangUp={handleHangUp}
              onToggleMic={toggleMic}
              onPowerOff={handlePowerOffMobile}
              onAirplaneMode={handleAirplaneMode}
              onDial1930={handleDial1930}
              onBlockNumber={handleBlockNumber}
              onSpeakingChange={setIsSpeaking}
              isDone={isDone}
              sessionId={sessionId || undefined}
              enableLiveApi={simMode === "video" && !isDone}
            />
            {/* Completion Action Bar */}
            {isDone && (
              <div className="max-w-4xl mx-auto mt-4 p-4 bg-[var(--sf)] rounded-2xl border border-[var(--line)] flex flex-col gap-3 animate-in fade-in shadow-dojo">
                {/* Tactical Outcome Badge */}
                {emergencyTacticalOutcome === "power_off" && (
                  <div className="w-full p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center gap-2.5 text-xs text-red-200">
                    <span className="material-symbols-outlined text-[20px] text-red-400 shrink-0">power_settings_new</span>
                    <div>
                      <b className="text-white block font-display">TACTICAL DEFENSE WIN: EMERGENCY POWER-DOWN</b>
                      <span>You decisively shut off the device, neutralizing the psychological panic loop. +40 Resilience Bonus Awarded!</span>
                    </div>
                  </div>
                )}
                {emergencyTacticalOutcome === "airplane_mode" && (
                  <div className="w-full p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-center gap-2.5 text-xs text-amber-200">
                    <span className="material-symbols-outlined text-[20px] text-amber-400 shrink-0">airplanemode_active</span>
                    <div>
                      <b className="text-white block font-display">TACTICAL DEFENSE WIN: AIRPLANE MODE CUTOFF</b>
                      <span>You severed the VoIP audio connection immediately without losing incident logs. +35 Resilience Bonus Awarded!</span>
                    </div>
                  </div>
                )}
                {emergencyTacticalOutcome === "dial_1930" && (
                  <div className="w-full p-3 rounded-xl bg-blue-950/60 border border-blue-500/50 flex items-center gap-2.5 text-xs text-blue-200">
                    <span className="material-symbols-outlined text-[20px] text-blue-400 shrink-0">verified</span>
                    <div>
                      <b className="text-white block font-display">GOLD STANDARD DEFENSE: REPORTED TO 1930 HELPLINE</b>
                      <span>Connecting with authentic cyber authorities permanently neutralized the intimidation. +45 Resilience Bonus Awarded!</span>
                    </div>
                  </div>
                )}
                {emergencyTacticalOutcome === "repeatedly_declined" && (
                  <div className="w-full p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2.5 text-xs text-emerald-200">
                    <span className="material-symbols-outlined text-[20px] text-emerald-400 shrink-0">shield</span>
                    <div>
                      <b className="text-white block font-display">PANIC RESISTANCE WIN: 3 REDIALS DEFLECTED</b>
                      <span>You calmly refused 3 persistent redial attempts without submitting to intimidation. +30 Resilience Bonus Awarded!</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <b className="text-sm text-[var(--ink)] block">
                      Drill Completed · Score: {debriefInfo?.score?.finalScore ?? 75} pts
                    </b>
                    <span className="text-xs text-[var(--mut)]">
                      Session recorded in SQLite. Resilience updated on profile.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const text = `🛡️ I just trained on Scam Dojo against the "${activeScenarioInfo.title}" scam simulation! Practice getting scammed safely to protect yourself: https://scam-dojo-v2.web.app/train?slug=${selectedSlug}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                      className="dojo-btn min-h-[40px] px-3.5 text-xs bg-[#25D366] hover:bg-[#20ba59] text-white border-0 flex items-center gap-1.5 cursor-pointer font-bold"
                      title="Share this drill with family or elderly parents"
                    >
                      <span>Share Drill with Family</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExitDrill}
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
              </div>
            )}
          </div>
        ) : (
          /* Chat Stage */
          <div className="dojo-stage mt-4 animate-in fade-in duration-200">
            {/* Stage Header */}
            <div className="dojo-sh">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--safe)] animate-pulse"></span>
                <div>
                  <b className="text-sm sm:text-base text-[var(--ink)] block leading-tight flex items-center gap-2">
                    {activeScenarioInfo.orgLabel}
                  </b>
                  <span className="text-xs text-[var(--mut)]">
                    Caller: {activeScenarioInfo.personaName} · Session: {sessionId?.slice(0, 8)}…
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isVoiceMode;
                    setIsVoiceMode(next);
                    if (!next) {
                      synthRef.current.stop();
                      recRef.current.stop();
                      setIsSpeaking(false);
                      setIsListening(false);
                    } else if (messages.length > 0) {
                      const lastMsg = messages[messages.length - 1];
                      if (lastMsg.role === "scammer") {
                        synthRef.current.speak(lastMsg.text, () => setIsSpeaking(false));
                        setIsSpeaking(true);
                      }
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 cursor-pointer ${isVoiceMode
                    ? "bg-[var(--act)] text-white border-[var(--act)] shadow-xs font-bold"
                    : "bg-[var(--bg)] border-[var(--line)] text-[var(--mut)] hover:text-[var(--ink)]"
                    }`}
                  title="Toggle Voice Call Mode"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isVoiceMode ? "volume_up" : "volume_off"}
                  </span>
                  <span>{isVoiceMode ? "Voice Call Active" : "Voice Call Off"}</span>
                  {isSpeaking && (
                    <span className="inline-flex gap-0.5 items-center ml-0.5">
                      <span className="w-1 h-3 bg-white animate-pulse"></span>
                      <span className="w-1 h-2 bg-white animate-pulse delay-75"></span>
                      <span className="w-1 h-3.5 bg-white animate-pulse delay-150"></span>
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTrace(!showTrace)}
                  className="text-xs px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--mut)] hover:text-[var(--ink)] cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">psychology</span>
                  {showTrace ? "Hide AI trace" : "AI reasoning trace"}
                </button>
                <button
                  type="button"
                  onClick={handleHangUp}
                  disabled={isDone}
                  className="dojo-btn bad min-h-[36px] px-3 text-xs"
                >
                  {t("train.hangup")}
                </button>
              </div>
            </div>

            {sessionError && (
              <div className="mx-4 mt-3 p-2.5 rounded-xl bg-[var(--bad)]/10 border border-[var(--bad)]/30 text-xs text-[var(--bad)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{sessionError}</span>
              </div>
            )}

            {/* 10-Bar Pressure Meter (Live Backend Tension) */}
            <div
              className="flex items-center gap-1 px-4 pt-3 pb-1 text-xs"
              role="meter"
              aria-label={t("train.pressure")}
              aria-valuenow={tension}
              aria-valuemin={0}
              aria-valuemax={10}
            >
              <span className="mr-2 text-[var(--mut)] font-semibold">{t("train.pressure")}: {tension}/10</span>
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
                  className={`max-w-[84%] px-3.5 py-2.5 text-sm sm:text-base leading-relaxed ${m.role === "scammer"
                    ? "self-start bg-[var(--sf2)] text-[var(--ink)] rounded-2xl rounded-tl-xs"
                    : m.role === "user"
                      ? "self-end bg-[var(--act)] text-white rounded-2xl rounded-tr-xs"
                      : "self-center bg-transparent border border-dashed border-[var(--line)] text-[var(--mut)] rounded-xl text-xs sm:text-sm text-center my-1"
                    }`}
                >
                  <MarkdownView content={m.text} />
                </div>
              ))}

              {/* Live AI Status / Typing Indicator */}
              {(isTyping || aiStatus) && (
                <div className="flex flex-col gap-1.5 self-start">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--sf2)] rounded-2xl rounded-tl-xs text-xs text-[var(--mut)] border border-[var(--line)]">
                    <span className="material-symbols-outlined text-[16px] text-[var(--act)] animate-spin">
                      progress_activity
                    </span>
                    <span>{aiStatus || "Gemini Scammer Agent is generating response…"}</span>
                  </div>
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
                    disabled={isDone || isTyping || isSpeaking || isSending}
                    className="px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] hover:border-[var(--act)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Composer */}
            <div className="flex gap-2 p-3 border-t border-[var(--line)] bg-[var(--sf)]">
              <button
                type="button"
                onClick={toggleMic}
                disabled={isDone || isTyping || isSpeaking || isSending}
                className={`min-h-[44px] px-3 rounded-lg border flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isListening
                  ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                  : "bg-[var(--bg)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--act)]"
                  }`}
                title={isListening ? "Listening... click to stop" : "Speak reply using microphone"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isListening ? "mic" : "mic_none"}
                </span>
              </button>

              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isDone || isTyping || isSpeaking || isSending}
                placeholder={
                  isListening
                    ? "Listening to your voice..."
                    : isSpeaking
                      ? "Scammer is speaking..."
                      : isDone
                        ? "Drill completed."
                        : t("train.placeholder")
                }
                maxLength={500}
                aria-label="Your reply"
                className="flex-1 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--act)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isDone || isTyping || isSpeaking || isSending || !inputVal.trim()}
                className="dojo-btn min-h-[44px] px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("train.send")}
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
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `🛡️ I just trained on Scam Dojo against the "${activeScenarioInfo.title}" scam simulation! Practice getting scammed safely to protect yourself: https://scam-dojo-v2.web.app/train?slug=${selectedSlug}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                    }}
                    className="dojo-btn min-h-[40px] px-3.5 text-xs bg-[#25D366] hover:bg-[#20ba59] text-white border-0 flex items-center gap-1.5 cursor-pointer font-bold"
                    title="Share this drill with family or elderly parents"
                  >
                    <span>Share Drill with Family</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExitDrill}
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
        ))}
    </div>
  );
}

export default TrainPage;
