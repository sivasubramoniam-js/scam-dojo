import React, { useState, useEffect, useRef } from "react";

interface VideoCallStageProps {
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
}

export function VideoCallStage({
  callerName,
  callerOrg,
  tension,
  isSpeaking,
  isListening,
  isTyping,
  aiStatus,
  lastScammerText,
  onSendMessage,
  onHangUp,
  onToggleMic,
  isDone,
}: VideoCallStageProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);

  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  // Toggle User Camera (Non-mandatory webcam)
  const toggleCamera = async () => {
    if (cameraEnabled) {
      // Turn off
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setCameraEnabled(false);
      setCameraError(null);
    } else {
      // Turn on
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        mediaStreamRef.current = stream;
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
        setCameraEnabled(true);
      } catch (err: any) {
        setCameraError("Camera permission declined or not available.");
        setCameraEnabled(false);
      }
    }
  };

  // Attach stream when video element renders
  useEffect(() => {
    if (cameraEnabled && userVideoRef.current && mediaStreamRef.current) {
      userVideoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [cameraEnabled]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Determine active Veo video state
  const getVideoState = () => {
    if (tension >= 7) {
      return {
        src: "/assets/simulation/officer_threat.jpg",
        label: "COERCIVE THREAT / WARRANT ISSUANCE",
        badgeColor: "bg-red-600 text-white",
      };
    }
    if (isSpeaking) {
      return {
        src: "/assets/simulation/officer_speaking.jpg",
        label: "OFFICER INTERROGATING (LIVE)",
        badgeColor: "bg-amber-600 text-white",
      };
    }
    return {
      src: "/assets/simulation/officer_listening.jpg",
      label: "OFFICER OBSERVING / RECORDING",
      badgeColor: "bg-slate-800 text-slate-300",
    };
  };

  const activeVideo = getVideoState();

  const verbalCounters = [
    "I will verify with my local police station in person.",
    "Show me your official ID card and court order number.",
    "Indian law does not allow digital arrest over video calls.",
    "I am hanging up and dialing 1930 Cyber Helpline now.",
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-slate-800 bg-black text-white shadow-2xl flex flex-col justify-between animate-in fade-in duration-300">
      {/* Central Scammer Video Stream Window */}
      <div className="relative w-full aspect-video sm:aspect-16/10 bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Dynamic Video State Image */}
        <img
          src={activeVideo.src}
          alt="Simulated Interrogator Video Stream"
          className={`w-full h-full object-cover transition-all duration-500 ${
            tension >= 7 ? "contrast-110 brightness-95" : ""
          }`}
        />

        {/* Dynamic Scanline & CRT Effect for High-Tech Extortion Realism */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

        {/* Coercion Tension Red Border Pulse */}
        {tension >= 7 && (
          <div className="absolute inset-0 border-4 border-red-600/80 animate-pulse pointer-events-none" />
        )}

        {/* Top Video Overlay Bar */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-xs pointer-events-none">
          {/* Agency Badge & Case ID */}
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono font-bold tracking-wider text-red-400">
              ● REC {formatTime(callDuration)}
            </span>
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
              | CBI/E-CYBER/2026/8942
            </span>
          </div>

          {/* Video State Badge */}
          <div
            className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/15 ${activeVideo.badgeColor}`}
          >
            {activeVideo.label}
          </div>
        </div>

        {/* Bottom Video HUD: Officer Name & Authority Stamp */}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between pointer-events-none">
          <div className="bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 max-w-sm">
            <b className="text-sm font-display text-white block">
              {callerName || "Inspector D.A. Togav"}
            </b>
            <span className="text-xs text-slate-300 block">
              {callerOrg || "Cyber Crime Investigation Cell, New Delhi HQ"}
            </span>
            <span className="text-[10px] text-amber-400 font-mono block mt-0.5">
              LEGAL NOTICE: MANDATORY COMPLIANCE SUMMONS
            </span>
          </div>

          {/* Tension Indicator on Video */}
          <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              Urgency Gauge
            </span>
            <span
              className={`text-sm font-mono font-extrabold ${
                tension >= 7 ? "text-red-400" : tension >= 4 ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {tension}/10 ({tension >= 7 ? "MAX PRESSURE" : "ACTIVE"})
            </span>
          </div>
        </div>

        {/* User Picture-in-Picture (PiP) Window */}
        <div className="absolute top-3 right-4 sm:top-4 sm:right-4 w-32 h-24 sm:w-44 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-900/90 shadow-2xl backdrop-blur-md z-20 transition-all">
          {cameraEnabled ? (
            <video
              ref={userVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-900">
              <span className="material-symbols-outlined text-[24px] text-slate-500 mb-1">
                videocam_off
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight">
                Camera Off
              </span>
              <span className="text-[8px] text-slate-500">(Optional)</span>
            </div>
          )}

          {/* User PiP Status Badge */}
          <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px] font-mono text-slate-300 bg-black/60 px-1.5 py-0.5 rounded">
            <span>You (Citizen)</span>
            {isListening && (
              <span className="text-emerald-400 font-bold animate-pulse">● Mic On</span>
            )}
          </div>
        </div>
      </div>

      {/* Subtitles & Spoken Dialogue CC Banner */}
      {lastScammerText && (
        <div className="bg-slate-950 px-6 py-2.5 border-t border-b border-slate-800 text-center">
          <p className="text-xs sm:text-sm text-slate-200 font-medium">
            <span className="text-amber-400 font-bold mr-1">Officer:</span>
            "{lastScammerText}"
          </p>
        </div>
      )}

      {/* Live AI Status Banner */}
      {(isTyping || aiStatus) && (
        <div className="bg-slate-900/90 px-4 py-1.5 border-b border-slate-800 flex items-center justify-center gap-2 text-xs text-amber-300">
          <span className="material-symbols-outlined text-[15px] animate-spin">
            progress_activity
          </span>
          <span>{aiStatus || "Analyzing your verbal defense…"}</span>
        </div>
      )}

      {/* Video Call Tactical & Speaking Panel */}
      <div className="p-4 sm:p-6 bg-slate-950 flex flex-col gap-3">
        {/* Quick Verbal Tactical Counters */}
        {!isDone && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Verbal Tactical Counters (Speak or Click to Execute):</span>
              <button
                type="button"
                onClick={() => setShowManualFallback(!showManualFallback)}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                {showManualFallback ? "Hide typing" : "Type reply"}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {verbalCounters.map((phrase, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSendMessage(phrase)}
                  disabled={isSpeaking || isTyping}
                  className="text-left text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-850 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-[16px] text-slate-500 group-hover:text-emerald-400 shrink-0">
                    record_voice_over
                  </span>
                  <span className="truncate">{phrase}</span>
                </button>
              ))}
            </div>

            {/* Fallback text box if needed */}
            {showManualFallback && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualInput.trim()) {
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
                  placeholder="State your legal defense or counter-question…"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim() || isSpeaking || isTyping}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        )}

        {/* Primary Video Conference Action Bar */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between sm:justify-center sm:gap-6 flex-wrap">
          {/* User Camera Toggle Button */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              cameraEnabled
                ? "bg-slate-800 text-white border border-slate-700"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
            title="Toggle User Camera (Webcam is optional)"
          >
            <span className="material-symbols-outlined text-[18px]">
              {cameraEnabled ? "videocam" : "videocam_off"}
            </span>
            <span>{cameraEnabled ? "Camera On" : "Camera Off (Optional)"}</span>
          </button>

          {/* User Microphone Toggle Button */}
          <button
            type="button"
            onClick={onToggleMic}
            disabled={isDone}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shadow-md ${
              isListening
                ? "bg-emerald-500 text-black ring-4 ring-emerald-400/40"
                : "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
            }`}
            title={isListening ? "Listening... click to stop" : "Click to speak your reply"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isListening ? "mic" : "mic_none"}
            </span>
            <span>{isListening ? "Listening… Speak Now" : "Push-to-Talk (Mic)"}</span>
          </button>

          {/* Red Disconnect Video Call Button */}
          <button
            type="button"
            onClick={onHangUp}
            disabled={isDone}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-lg shadow-red-600/40"
            title="Disconnect Video Call"
          >
            <span className="material-symbols-outlined text-[18px]">
              call_end
            </span>
            <span>Hang Up</span>
          </button>
        </div>

        {cameraError && (
          <p className="text-center text-[11px] text-amber-400">{cameraError}</p>
        )}
      </div>
    </div>
  );
}

export default VideoCallStage;
