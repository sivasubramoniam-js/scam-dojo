import React, { useState, useEffect, useRef } from "react";
import { GeminiLiveClient } from "@/lib/geminiLive";

interface AudioCallStageProps {
  callerName: string;
  callerOrg: string;
  tension: number; // 0 to 10
  isSpeaking: boolean;
  isListening: boolean;
  isTyping: boolean;
  aiStatus: string | null;
  lastScammerText?: string;
  onSendMessage: (text: string) => void;
  onHangUp: () => void;
  onToggleMic: () => void;
  isDone: boolean;
  sessionId?: string;
  enableLiveApi?: boolean;
}

export function AudioCallStage({
  callerName,
  callerOrg,
  tension,
  isSpeaking: externalIsSpeaking,
  isListening: externalIsListening,
  isTyping,
  aiStatus,
  lastScammerText,
  onSendMessage,
  onHangUp,
  onToggleMic,
  isDone,
  sessionId,
  enableLiveApi = true,
}: AudioCallStageProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);

  // Gemini Live State
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveSpeaking, setLiveSpeaking] = useState(false);
  const [liveCaptions, setLiveCaptions] = useState<string>("");
  const liveClientRef = useRef<GeminiLiveClient | null>(null);

  const isSpeaking = liveSpeaking || externalIsSpeaking;
  const isListening = externalIsListening;

  // Initialize Gemini Live Client
  useEffect(() => {
    if (!enableLiveApi || typeof window === "undefined") return;

    const liveClient = new GeminiLiveClient({
      onSpeakingChange: (speaking) => {
        setLiveSpeaking(speaking);
      },
      onTranscript: (text, role) => {
        if (role === "scammer") {
          setLiveCaptions((prev) => (prev ? `${prev} ${text}` : text));
        }
      },
      onReady: () => {
        setLiveConnected(true);
      },
      onConnected: () => {
        setLiveConnected(true);
      },
      onInterrupted: () => {
        setLiveSpeaking(false);
      },
      onError: (err) => {
        console.warn("Gemini Live warning:", err);
      },
    });

    liveClientRef.current = liveClient;
    const targetSid = sessionId || `live_audio_${Date.now()}`;
    liveClient.connect(targetSid).catch(() => {});

    return () => {
      liveClient.disconnect();
      liveClientRef.current = null;
    };
  }, [sessionId, enableLiveApi]);

  // Stream user mic audio to Gemini Live when user toggles mic
  useEffect(() => {
    const client = liveClientRef.current;
    if (!client) return;

    if (isListening && !isMuted) {
      client.startAudioCapture().catch(() => {});
    } else {
      client.stopAudioCapture();
    }
  }, [isListening, isMuted]);

  // Call timer
  useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isDone]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const verbalCounters = [
    "I will verify and call back on the official bank number.",
    "What is your official employee ID and police station jurisdiction?",
    "Under RBI rules, I will never share any OTP or CVV.",
    "I am disconnecting and reporting this call to 1930 helpline.",
  ];

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white shadow-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[580px] animate-in fade-in duration-300">
      {/* Background glow effects based on tension */}
      <div
        className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-colors duration-700 opacity-30 ${
          tension >= 7
            ? "bg-red-600"
            : tension >= 4
            ? "bg-amber-500"
            : "bg-emerald-500"
        }`}
      />

      {/* Top Status Bar */}
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono font-semibold tracking-wide">
            VOIP PRI ENCRYPTED
          </span>
        </div>
        <div className="flex items-center gap-2">
          {liveConnected && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-300 bg-purple-950/70 border border-purple-500/50 px-2.5 py-0.5 rounded-full shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
              <span>Gemini 3.8 Live</span>
            </span>
          )}
          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
            <span className="material-symbols-outlined text-[14px]">call</span>
            <span>{formatTime(callDuration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
            HD AUDIO
          </span>
        </div>
      </div>

      {/* Caller Profile Section */}
      <div className="relative z-10 flex flex-col items-center text-center my-6">
        {/* Pulsing Avatar Ring */}
        <div className="relative mb-4">
          {/* Animated sound wave rings when scammer is speaking */}
          {isSpeaking && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping duration-1000" />
              <span className="absolute -inset-2 rounded-full border border-red-500/40 animate-pulse" />
              <span className="absolute -inset-4 rounded-full border border-red-500/20 animate-pulse delay-150" />
            </>
          )}

          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl font-display font-extrabold shadow-inner transition-colors duration-300 relative z-10 ${
              tension >= 7
                ? "bg-gradient-to-tr from-red-900 to-red-600 text-white ring-4 ring-red-500/40"
                : tension >= 4
                ? "bg-gradient-to-tr from-amber-900 to-amber-600 text-white ring-4 ring-amber-500/40"
                : "bg-gradient-to-tr from-slate-800 to-slate-700 text-slate-200 ring-4 ring-slate-700/50"
            }`}
          >
            <span className="material-symbols-outlined text-[48px]">
              support_agent
            </span>
          </div>
        </div>

        {/* Name and Organization */}
        <h3 className="text-xl sm:text-2xl font-bold font-display text-white tracking-wide">
          {callerName}
        </h3>
        <p className="text-sm font-medium text-slate-300 mt-0.5 flex items-center gap-1.5">
          <span>{callerOrg}</span>
          <span className="text-slate-500 font-mono text-xs">(Simulated)</span>
        </p>

        {/* Live Call State Label */}
        <div className="mt-3 flex items-center gap-2">
          {isSpeaking ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-3 py-1 rounded-full animate-pulse">
              <span className="material-symbols-outlined text-[16px]">
                graphic_eq
              </span>
              Scammer Speaking…
            </span>
          ) : isTyping ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px] animate-spin">
                progress_activity
              </span>
              {aiStatus || "Analyzing your defense…"}
            </span>
          ) : isListening ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Microphone Active — Speak Now!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full">
              Line Connected · Tap mic to respond
            </span>
          )}
        </div>
      </div>

      {/* Audio Waveform Equalizer (Animated) */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 h-10 my-1 px-8">
        {Array.from({ length: 18 }).map((_, idx) => {
          const heightFactor = isSpeaking
            ? Math.sin((idx + callDuration * 4) * 0.8) * 0.5 + 0.5
            : isListening
            ? Math.cos((idx + callDuration * 3) * 0.6) * 0.4 + 0.3
            : 0.15;
          const barHeight = Math.max(6, Math.round(heightFactor * 36));
          return (
            <span
              key={idx}
              className={`w-1 rounded-full transition-all duration-150 ${
                isSpeaking
                  ? "bg-red-500 shadow-sm shadow-red-500/50"
                  : isListening
                  ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                  : "bg-slate-700"
              }`}
              style={{ height: `${barHeight}px` }}
            />
          );
        })}
      </div>

      {/* Scammer Last Spoken Closed Caption (Subtle / Audio Subtitle) */}
      {(liveCaptions || lastScammerText) && (
        <div className="relative z-10 my-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
          <p className="text-xs text-slate-300 italic line-clamp-2">
            "{liveCaptions || lastScammerText}"
          </p>
        </div>
      )}

      {/* Tension Meter HUD */}
      <div className="relative z-10 my-3 bg-slate-900/80 rounded-2xl p-3 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <span className="text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-amber-400">
              psychology
            </span>
            Psychological Pressure Level
          </span>
          <span
            className={`font-mono font-bold ${
              tension >= 7
                ? "text-red-400"
                : tension >= 4
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            {tension}/10 ({tension >= 7 ? "CRITICAL COERCION" : tension >= 4 ? "ELEVATED" : "MODERATE"})
          </span>
        </div>
        <div className="flex gap-1 h-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-xs transition-colors duration-300 ${
                i < tension
                  ? tension >= 7
                    ? "bg-red-500 shadow-xs shadow-red-500/50"
                    : tension >= 4
                    ? "bg-amber-400 shadow-xs shadow-amber-400/50"
                    : "bg-emerald-400 shadow-xs shadow-emerald-400/50"
                  : "bg-slate-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Suggested Verbal Tactical Counters */}
      {!isDone && (
        <div className="relative z-10 my-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Quick Tactical Verbal Counters:</span>
            <button
              type="button"
              onClick={() => setShowManualFallback(!showManualFallback)}
              className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              {showManualFallback ? "Hide typing" : "Type reply instead"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {verbalCounters.map((phrase, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (liveClientRef.current) {
                    liveClientRef.current.sendText(phrase);
                  }
                  onSendMessage(phrase);
                }}
                disabled={isSpeaking || isTyping}
                className="text-left text-xs p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/80 transition-all text-slate-300 hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0">
                  record_voice_over
                </span>
                <span className="truncate">{phrase}</span>
              </button>
            ))}
          </div>

          {/* Fallback text input if speech recognition isn't preferred */}
          {showManualFallback && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualInput.trim()) {
                  if (liveClientRef.current) {
                    liveClientRef.current.sendText(manualInput.trim());
                  }
                  onSendMessage(manualInput.trim());
                  setManualInput("");
                }
              }}
              className="mt-2 flex gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Speak or type your defensive statement…"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || isSpeaking || isTyping}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}

      {/* Primary Phone Action Controls */}
      <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-around">
        {/* Mute Button */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`flex flex-col items-center gap-1 p-3 rounded-full transition cursor-pointer ${
            isMuted ? "bg-red-500/20 text-red-400" : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="Toggle Mute"
        >
          <span className="material-symbols-outlined text-[24px]">
            {isMuted ? "mic_off" : "mic"}
          </span>
          <span className="text-[10px] font-medium">{isMuted ? "Muted" : "Mute"}</span>
        </button>

        {/* PRIMARY MICROPHONE PUSH-TO-TALK BUTTON */}
        <button
          type="button"
          onClick={onToggleMic}
          disabled={isDone}
          className={`relative p-5 rounded-full shadow-lg transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
            isListening
              ? "bg-emerald-500 text-black scale-110 ring-4 ring-emerald-400/50 shadow-emerald-500/50"
              : "bg-slate-800 text-white hover:bg-slate-700 ring-2 ring-slate-600"
          }`}
          title={isListening ? "Listening... click to stop" : "Click to speak your reply"}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75 pointer-events-none" />
          )}
          <span className="material-symbols-outlined text-[32px]">
            {isListening ? "mic" : "mic_none"}
          </span>
        </button>

        {/* Speakerphone Toggle */}
        <button
          type="button"
          onClick={() => setIsSpeaker(!isSpeaker)}
          className={`flex flex-col items-center gap-1 p-3 rounded-full transition cursor-pointer ${
            isSpeaker ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="Toggle Speakerphone"
        >
          <span className="material-symbols-outlined text-[24px]">
            {isSpeaker ? "volume_up" : "volume_down"}
          </span>
          <span className="text-[10px] font-medium">{isSpeaker ? "Speaker On" : "Speaker Off"}</span>
        </button>

        {/* Big Red Hang Up Button */}
        <button
          type="button"
          onClick={() => {
            liveClientRef.current?.disconnect();
            onHangUp();
          }}
          disabled={isDone}
          className="flex flex-col items-center gap-1 p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition cursor-pointer disabled:opacity-50 shadow-lg shadow-red-600/40"
          title="Hang Up / Disconnect"
        >
          <span className="material-symbols-outlined text-[28px]">
            call_end
          </span>
          <span className="text-[10px] font-bold">Hang Up</span>
        </button>
      </div>
    </div>
  );
}

export default AudioCallStage;
