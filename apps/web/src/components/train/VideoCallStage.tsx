import React, { useState, useEffect, useRef } from "react";
import { GeminiLiveClient } from "@/lib/geminiLive";
import { EmergencyCountermeasures } from "./EmergencyCountermeasures";
import { useT } from "@/lib/i18n";

export type VideoPersona = "police" | "customs" | "other";

export function detectVideoPersona(input: {
  slug?: string;
  title?: string;
  callerOrg?: string;
  callerName?: string;
  text?: string;
}): VideoPersona {
  const slug = (input.slug || "").toLowerCase();
  const callerOrg = (input.callerOrg || "").toLowerCase();
  const title = (input.title || "").toLowerCase();
  const callerName = (input.callerName || "").toLowerCase();
  const text = (input.text || "").toLowerCase();

  // Primary authority metadata reflects the agency the scammer is impersonating on video
  const authorityMetadata = `${slug} ${callerOrg} ${title} ${callerName}`;

  // 1. POLICE / LAW ENFORCEMENT / CBI / DIGITAL ARREST
  // In Digital Arrest scams, scammers fabricate a narrative that "Customs seized a parcel",
  // but the actor on the video call IS A POLICE OFFICER in uniform.
  // Therefore, if the scenario slug, organization, title, or persona is police/cbi/digital arrest,
  // it must ALWAYS use the Police video!
  const isPoliceAuthority =
    /digital_arrest|police|cbi\b|cyber\s*crime|cyber\s*cell|crime\s*branch|law\s*enforcement|anti-extortion|enforcement\s*directorate|\bed\b|nia\b|interpol|thana|police\s*station|sub-inspector|inspector\b/i.test(
      authorityMetadata
    );

  const isUtilityOrBankAuthority =
    /electricity|electric|power|bescom|discom|substation|lineman|feeder|meter\b|water\b|gas\b|utility|bill\b|banking|bank\b|sbi|hdfc|icici|rbi\b|kyc\b|telecom|airtel|jio|trai\b|sim\b|job\b|task\b|trading|crypto|loan\b|lottery/i.test(
      authorityMetadata
    );

  if (isPoliceAuthority && !isUtilityOrBankAuthority) {
    return "police";
  }

  // 2. CUSTOMS / NARCOTICS / COURIER INTERDICTION
  const isCustomsAuthority =
    /courier_customs|customs|narcotics|parcel|courier|fedex|dhl|cargo|contraband|shipment|logistics/i.test(
      authorityMetadata
    );

  if (isCustomsAuthority) {
    return "customs";
  }

  // 3. Fallback: inspect spoken text only if authority metadata was completely unspecified
  if (text) {
    const isPoliceInText =
      /digital\s*arrest|cyber\s*crime\s*cell|cbi\b|police\s*officer|arrest\s*warrant|police\s*station|sub-inspector/i.test(
        text
      );
    const isCustomsInText =
      /customs\s*officer|customs\s*department|narcotics\s*control|courier\s*seizure/i.test(
        text
      );

    if (isPoliceInText) return "police";
    if (isCustomsInText) return "customs";
  }

  // 4. Any other department (Electricity, Bank, Telecom, Jobs, Generic Official -> Man video)
  return "other";
}

interface VideoCallStageProps {
  callerName: string;
  callerOrg: string;
  drillSlug?: string;
  scenarioTitle?: string;
  tension: number; // 0 to 10
  isSpeaking: boolean;
  isListening: boolean;
  isTyping: boolean;
  aiStatus: string | null;
  lastScammerText?: string;
  onSendMessage: (text: string) => void;
  onHangUp: () => void;
  onToggleMic: () => void;
  onPowerOff?: () => void;
  onAirplaneMode?: () => void;
  onDial1930?: () => void;
  onBlockNumber?: () => void;
  onSpeakingChange?: (speaking: boolean) => void;
  isDone: boolean;
  sessionId?: string;
  enableLiveApi?: boolean;
}

export function VideoCallStage({
  callerName,
  callerOrg,
  drillSlug,
  scenarioTitle,
  tension,
  isSpeaking: externalIsSpeaking,
  isListening: externalIsListening,
  isTyping,
  aiStatus,
  lastScammerText,
  onSendMessage,
  onHangUp,
  onToggleMic,
  onPowerOff,
  onAirplaneMode,
  onDial1930,
  onBlockNumber,
  onSpeakingChange,
  isDone,
  sessionId,
  enableLiveApi = true,
}: VideoCallStageProps) {
  const { t } = useT();
  const [callDuration, setCallDuration] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [showEmergencyDeck, setShowEmergencyDeck] = useState(false);

  // Gemini Live State
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveSpeaking, setLiveSpeaking] = useState(false);
  const [liveCaptions, setLiveCaptions] = useState<string>("");
  const [currentTurnCaption, setCurrentTurnCaption] = useState<string>(lastScammerText || "");
  const liveClientRef = useRef<GeminiLiveClient | null>(null);

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

  const [videoPersona, setVideoPersona] = useState<VideoPersona>(() =>
    detectVideoPersona({
      slug: drillSlug,
      title: scenarioTitle,
      callerOrg,
      callerName,
      text: lastScammerText,
    })
  );

  useEffect(() => {
    setVideoPersona(
      detectVideoPersona({
        slug: drillSlug,
        title: scenarioTitle,
        callerOrg,
        callerName,
        text: lastScammerText,
      })
    );
  }, [drillSlug, scenarioTitle, callerOrg, callerName]);

  const talkingVideoRef = useRef<HTMLVideoElement | null>(null);
  const listeningVideoRef = useRef<HTMLVideoElement | null>(null);

  // Unified Speaking State: Driven by Gemini Live audio streaming or external speech synthesis
  const isSpeaking = liveSpeaking || externalIsSpeaking;
  const isListening = externalIsListening;

  // Track which scammer texts have already been spoken by Gemini Live
  const spokenTextsRef = useRef<Set<string>>(new Set());
  const lastScammerTextRef = useRef(lastScammerText);
  lastScammerTextRef.current = lastScammerText;

  // Initialize Gemini Live Client
  useEffect(() => {
    if (
      !enableLiveApi ||
      typeof window === "undefined" ||
      !sessionId ||
      GeminiLiveClient.getActiveSelection() !== "video"
    ) {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      setLiveConnected(false);
      setLiveSpeaking(false);
      onSpeakingChange?.(false);
      return;
    }

    let isDisposed = false;
    const liveClient = new GeminiLiveClient({
      onSpeakingChange: (speaking) => {
        if (!isDisposed) {
          setLiveSpeaking(speaking);
          onSpeakingChange?.(speaking);
        }
      },
      onTranscript: (text, role) => {
        if (!isDisposed && role === "scammer" && text) {
          setLiveCaptions((prev) => (prev ? `${prev} ${text}` : text));
        }
      },
      onReady: () => {
        if (!isDisposed) {
          setLiveConnected(true);
        }
      },
      onConnected: () => {
        if (!isDisposed) setLiveConnected(true);
      },
      onInterrupted: () => {
        if (!isDisposed) {
          setLiveSpeaking(false);
          onSpeakingChange?.(false);
        }
      },
      onError: (err) => {
        if (!isDisposed) {
          console.warn("Gemini Live warning:", err);
        }
      },
    });

    liveClientRef.current = liveClient;
    liveClient
      .connect(sessionId, "video")
      .then(() => {
        if (!isDisposed) liveClient.resumeAudio();
      })
      .catch((err) => {
        if (!isDisposed) {
          console.warn("Gemini Live video connect error:", err);
        }
      });

    return () => {
      isDisposed = true;
      onSpeakingChange?.(false);
      liveClient.disconnect();
      liveClientRef.current = null;
    };
  }, [sessionId, enableLiveApi]);

  // Stream user camera frames to Gemini Live whenever camera is enabled
  useEffect(() => {
    const client = liveClientRef.current;
    if (!client) return;

    if (cameraEnabled && userVideoRef.current) {
      client.startVideoCapture(userVideoRef.current, 1.5);
    } else {
      client.stopVideoCapture();
    }
  }, [cameraEnabled]);

  // When lastScammerText updates or connection is established, synchronize subtitles and trigger Gemini Live speech
  useEffect(() => {
    if (lastScammerText) {
      setCurrentTurnCaption(lastScammerText);
      setLiveCaptions("");
    }

    // Only synthesize when message has finished streaming completely (!isTyping), socket is connected, and not yet spoken
    if (
      liveConnected &&
      !isTyping &&
      lastScammerText &&
      liveClientRef.current &&
      !spokenTextsRef.current.has(lastScammerText)
    ) {
      spokenTextsRef.current.add(lastScammerText);
      liveClientRef.current.stopAudioPlayback();
      liveClientRef.current.sendText(lastScammerText);
    }
  }, [lastScammerText, isTyping, liveConnected]);

  const PERSONA_VIDEOS: Record<
    VideoPersona,
    {
      name: string;
      casePrefix: string;
      legalNotice: string;
      defaultName: string;
      defaultOrg: string;
      speakerLabel: string;
      talking: string;
      listening: string;
    }
  > = {
    police: {
      name: "CBI Cyber Crime Cell",
      casePrefix: "CBI/E-CYBER/2026/8942",
      legalNotice: "LEGAL NOTICE: MANDATORY COMPLIANCE SUMMONS",
      defaultName: "Inspector D.A. Togav",
      defaultOrg: "CBI Cyber Crime Cell",
      speakerLabel: "Officer:",
      talking: "/assets/video/Police-talking.mp4",
      listening: "/assets/video/Police-listening.mp4",
    },
    customs: {
      name: "Customs & Narcotics Interdiction",
      casePrefix: "CUSTOMS/NARCO/BOM-7741",
      legalNotice: "CUSTOMS NOTICE: CONTRABAND INTERCEPTION ORDER",
      defaultName: "Officer K. Mehta",
      defaultOrg: "Customs & Narcotics Interdiction Bureau",
      speakerLabel: "Customs Officer:",
      talking: "/assets/video/Customs-talking.mp4",
      listening: "/assets/video/Customs-listening.mp4",
    },
    other: {
      name: "Department Verification Cell",
      casePrefix: "DEPT/OFFICIAL/2026/44910",
      legalNotice: "OFFICIAL NOTICE: IMMEDIATE VERIFICATION REQUIRED",
      defaultName: "Officer R. Sharma",
      defaultOrg: "Official Department (simulated)",
      speakerLabel: "Official:",
      talking: "/assets/video/Man-talking.mp4",
      listening: "/assets/video/Man-listening.mp4",
    },
  };

  const activePersona = PERSONA_VIDEOS[videoPersona];

  const safePlay = (el: HTMLVideoElement | null) => {
    if (!el || typeof el.play !== "function") return;
    try {
      const res = el.play();
      if (res && typeof res.catch === "function") {
        res.catch(() => { });
      }
    } catch { }
  };

  const safePause = (el: HTMLVideoElement | null) => {
    if (!el || typeof el.pause !== "function") return;
    try {
      el.pause();
    } catch { }
  };

  // Control video playback:
  // - Talking video plays in 2x speed loop mode when scammer is speaking (isSpeaking === true)
  // - Listening video plays in loop mode when talking stops until user completes speech (isSpeaking === false)
  // - Both videos are muted so simultaneous Gemini Live audio plays crystal clear
  useEffect(() => {
    const talkingEl = talkingVideoRef.current;
    const listeningEl = listeningVideoRef.current;

    if (isSpeaking) {
      if (talkingEl) {
        talkingEl.playbackRate = 1.0;
        safePlay(talkingEl);
      }
      safePause(listeningEl);
    } else {
      if (listeningEl) {
        listeningEl.playbackRate = 1.0;
        safePlay(listeningEl);
      }
      safePause(talkingEl);
    }
  }, [isSpeaking, videoPersona]);



  const verbalCounters = [
    "I will verify with my local police station in person.",
    "Show me your official ID card and court order number.",
    "Indian law does not allow digital arrest over video calls.",
    "I am hanging up and dialing 1930 Cyber Helpline now.",
  ];

  return (
    <div
      onPointerDown={() => liveClientRef.current?.resumeAudio()}
      className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-slate-800 bg-black text-white shadow-2xl flex flex-col justify-between animate-in fade-in duration-300"
    >
      {/* Central Scammer Video Stream Window */}
      <div className="relative w-full aspect-video sm:aspect-16/10 bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Scammer Talking Video (2x Speed Loop Mode, Muted for voiceover clarity) */}
        <video
          ref={talkingVideoRef}
          src={activePersona.talking}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isSpeaking ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            } ${tension >= 7 ? "contrast-110 brightness-95" : ""}`}
        />

        {/* Scammer Listening Video (1x Speed Loop Mode, Muted, Waits until user completes speech) */}
        <video
          ref={listeningVideoRef}
          src={activePersona.listening}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${!isSpeaking ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            } ${tension >= 7 ? "contrast-110 brightness-95" : ""}`}
        />

        {/* Dynamic Scanline & CRT Effect for High-Tech Extortion Realism */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none z-15" />

        {/* Coercion Tension Red Border Pulse */}
        {tension >= 7 && (
          <div className="absolute inset-0 border-4 border-red-600/80 animate-pulse pointer-events-none z-15" />
        )}

        {/* Bottom Video HUD: Officer Name & Authority Stamp */}
        <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 flex items-end justify-between pointer-events-none z-20 gap-2">
          <div className="bg-black/75 backdrop-blur-md px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/10 max-w-[65%] sm:max-w-sm">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="font-mono font-bold tracking-wider text-red-400 text-[11px] sm:text-xs">
                ● REC {formatTime(callDuration)}
              </span>
              <span className="text-slate-400 font-mono text-[10px] hidden sm:inline">
                | {activePersona.casePrefix}
              </span>
            </div>
            <b className="text-xs sm:text-sm font-display text-white block truncate">
              {callerName || activePersona.defaultName}
            </b>
            <span className="text-[11px] sm:text-xs text-slate-300 block truncate">
              {callerOrg || activePersona.defaultOrg}
            </span>
            <span className="text-[9px] sm:text-[10px] text-amber-400 font-mono block mt-0.5 truncate">
              {activePersona.legalNotice}
            </span>
          </div>

          {/* Tension Indicator on Video */}
          <div className="bg-black/75 backdrop-blur-md px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-white/10 text-right shrink-0">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              Urgency Gauge
            </span>
            <span
              className={`text-xs sm:text-sm font-mono font-extrabold ${tension >= 7 ? "text-red-400" : tension >= 4 ? "text-amber-400" : "text-emerald-400"
                }`}
            >
              {tension}/10 <span className="hidden sm:inline">({tension >= 7 ? "MAX PRESSURE" : "ACTIVE"})</span>
            </span>
          </div>
        </div>

        {/* User Picture-in-Picture (PiP) Window */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-28 h-20 sm:w-44 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-900/90 shadow-2xl backdrop-blur-md z-20 transition-all">
          {cameraEnabled ? (
            <video
              ref={userVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 text-center bg-slate-900">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px] text-slate-500 mb-0.5 sm:mb-1">
                videocam_off
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-tight">
                {t("train.call.camera_off")}
              </span>
              <span className="text-[8px] text-slate-500 hidden sm:inline">(Optional)</span>
            </div>
          )}

          {/* User PiP Status Badge */}
          <div className="absolute bottom-1 left-1 right-1 sm:left-1.5 sm:right-1.5 flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-slate-300 bg-black/60 px-1 sm:px-1.5 py-0.5 rounded">
            <span>{t("train.call.you_citizen")}</span>
            {isListening && (
              <span className="text-emerald-400 font-bold animate-pulse">● Mic</span>
            )}
          </div>
        </div>
      </div>

      {/* Subtitles & Spoken Dialogue CC Banner */}
      {(currentTurnCaption || liveCaptions || lastScammerText) && (
        <div className="bg-slate-950 px-4 sm:px-6 py-2.5 border-t border-b border-slate-800 text-center animate-in fade-in duration-200">
          <p className="text-xs sm:text-sm text-slate-200 font-medium">
            <span className="text-amber-400 font-bold mr-1">{activePersona.speakerLabel}</span>
            "{currentTurnCaption || liveCaptions || lastScammerText}"
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
      <div className="p-3 sm:p-6 bg-slate-950 flex flex-col gap-3">
        {/* Quick Verbal Tactical Counters */}
        {!isDone && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>{t("train.call.quick_counters")}:</span>
              <button
                type="button"
                onClick={() => setShowManualFallback(!showManualFallback)}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                {showManualFallback ? t("train.call.hide_typing") : t("train.call.type_reply")}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {verbalCounters.map((phrase, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCurrentTurnCaption("");
                    setLiveCaptions("");
                    liveClientRef.current?.stopAudioPlayback();
                    onSendMessage(phrase);
                  }}
                  disabled={isTyping || isSpeaking}
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
                    const text = manualInput.trim();
                    setCurrentTurnCaption("");
                    setLiveCaptions("");
                    liveClientRef.current?.stopAudioPlayback();
                    onSendMessage(text);
                    setManualInput("");
                  }
                }}
                className="mt-2 flex gap-2"
              >
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={t("train.call.speak_or_type")}
                  disabled={isTyping || isSpeaking}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim() || isTyping || isSpeaking}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {t("train.send")}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Primary Video Conference Action Bar */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-4">
          {/* User Camera Toggle Button */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer min-h-[44px] w-full sm:w-auto ${cameraEnabled
              ? "bg-slate-800 text-white border border-slate-700"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            title="Toggle User Camera (Webcam is optional)"
          >
            <span className="material-symbols-outlined text-[18px]">
              {cameraEnabled ? "videocam" : "videocam_off"}
            </span>
            <span className="truncate">{cameraEnabled ? t("train.call.camera_on") : t("train.call.camera_off")}</span>
          </button>

          {/* User Microphone Toggle Button */}
          <button
            type="button"
            onClick={onToggleMic}
            disabled={isDone || isSpeaking || isTyping}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] w-full sm:w-auto ${isListening
              ? "bg-emerald-500 text-black ring-4 ring-emerald-400/40"
              : "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
              }`}
            title={isSpeaking ? "Officer is speaking..." : isTyping ? "AI is processing..." : isListening ? "Listening... click to stop" : "Click to speak your reply"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isListening ? "mic" : "mic_none"}
            </span>
            <span className="truncate">{isListening ? t("train.call.listening") : t("train.call.mic")}</span>
          </button>

          {/* Emergency SOS Countermeasures Button */}
          <button
            type="button"
            onClick={() => setShowEmergencyDeck(!showEmergencyDeck)}
            disabled={isDone}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shadow-md min-h-[44px] w-full sm:w-auto ${
              showEmergencyDeck
                ? "bg-amber-500 text-black ring-4 ring-amber-400/40"
                : "bg-slate-800 text-amber-300 hover:text-white hover:bg-slate-700 border border-amber-500/40"
            }`}
            title="Emergency Panic Escape / Power Off Mobile"
          >
            <span className="material-symbols-outlined text-[18px]">
              shield_with_heart
            </span>
            <span className="truncate">{t("train.call.sos_actions")}</span>
          </button>

          {/* Red Disconnect Video Call Button */}
          <button
            type="button"
            onClick={() => {
              liveClientRef.current?.disconnect();
              onHangUp();
            }}
            disabled={isDone}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-lg shadow-red-600/40 min-h-[44px] w-full sm:w-auto"
            title="Disconnect Video Call"
          >
            <span className="material-symbols-outlined text-[18px]">
              call_end
            </span>
            <span className="truncate">{t("train.hangup")}</span>
          </button>
        </div>

        {/* Expandable Emergency Deck inside Video Stage */}
        {showEmergencyDeck && onPowerOff && onAirplaneMode && onDial1930 && (
          <div className="mt-4 animate-in slide-in-from-bottom duration-200">
            <EmergencyCountermeasures
              onPowerOff={onPowerOff}
              onAirplaneMode={onAirplaneMode}
              onDial1930={onDial1930}
              onBlockNumber={onBlockNumber || (() => {})}
              callerName={callerName}
              callerOrg={callerOrg}
              isCompact={true}
            />
          </div>
        )}

        {cameraError && (
          <p className="text-center text-[11px] text-amber-400">{cameraError}</p>
        )}
      </div>
    </div>
  );
}

export default VideoCallStage;
