import React, { useState, useEffect } from "react";
import { ringtoneEngine } from "@/lib/ringtone";
import { EmergencyCountermeasures } from "./EmergencyCountermeasures";
import { useT } from "@/lib/i18n";

interface IncomingCallOverlayProps {
  callerName: string;
  callerOrg: string;
  callType: "audio" | "video";
  attempt: number;
  onAccept: () => void;
  onDecline: () => void;
  onPowerOff: () => void;
  onAirplaneMode: () => void;
  onDial1930: () => void;
  onBlockNumber: () => void;
}

export function IncomingCallOverlay({
  callerName,
  callerOrg,
  callType,
  attempt,
  onAccept,
  onDecline,
  onPowerOff,
  onAirplaneMode,
  onDial1930,
  onBlockNumber,
}: IncomingCallOverlayProps) {
  const { t } = useT();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(true);

  // Start realistic ringtone when overlay mounts
  useEffect(() => {
    // Speed up ringtone on repeated attempts for intense panic pressure
    const speed = 1.0 + (attempt - 1) * 0.25;
    ringtoneEngine.setMuted(isMuted);
    ringtoneEngine.startIncomingRingtone(speed);

    return () => {
      ringtoneEngine.stop();
    };
  }, [attempt, isMuted]);

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    ringtoneEngine.setMuted(nextMute);
  };

  const handleDeclineClick = () => {
    setIsDeclining(true);
    ringtoneEngine.playDisconnectTone();
    // Re-trigger decline flow which causes aggressive redial
    setTimeout(() => {
      setIsDeclining(false);
      onDecline();
    }, 1200);
  };

  const handleAcceptClick = () => {
    ringtoneEngine.stop();
    onAccept();
  };

  const threatAlerts = [
    `🚨 HIGH PRIORITY: Disconnection detected. IPC Sec 186 non-compliance summons queued.`,
    `⚠️ URGENT: Investigation Officer ${callerName} is re-dialing. DO NOT IGNORE.`,
    `🚨 PATROL DISPATCH NOTICE: Location tracked via cell tower triangulation. Answer immediately.`,
  ];
  const activeAlert = threatAlerts[(attempt - 1) % threatAlerts.length];

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-3xl overflow-hidden border-2 border-red-500/80 bg-gradient-to-b from-slate-950 via-red-950/20 to-black text-white shadow-2xl p-4 sm:p-8 flex flex-col justify-between min-h-[560px] sm:min-h-[620px] animate-in fade-in zoom-in-95 duration-300">
      {/* Red Alert Ambient Glow & Flashing border */}
      <div className="absolute inset-0 bg-red-600/10 pointer-events-none animate-pulse" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-red-600/25 blur-3xl pointer-events-none" />

      {/* Top Simulated OS Bar with Mute Toggle */}
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 border-b border-red-900/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="font-mono font-bold tracking-wide text-red-400">
            {t("incoming.call_type", { type: callType.toUpperCase() })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 hover:border-slate-500 text-[11px] font-mono text-slate-300 cursor-pointer"
            title="Toggle Ringtone Audio"
          >
            <span className="material-symbols-outlined text-[15px]">
              {isMuted ? "volume_off" : "volume_up"}
            </span>
            <span>{isMuted ? t("incoming.muted") : t("incoming.playing")}</span>
          </button>
          <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold">
            {t("incoming.override")}
          </span>
        </div>
      </div>

      {/* Simulated Urgent Notification Toast Banner */}
      {showNotificationToast && (
        <div className="relative z-10 mt-3 p-3 rounded-2xl bg-slate-900/95 border border-red-500/60 shadow-lg flex items-start gap-2.5 animate-in slide-in-from-top duration-300">
          <span className="material-symbols-outlined text-red-400 text-[20px] shrink-0 animate-bounce">
            warning
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] font-bold text-red-300 uppercase tracking-wider mb-0.5">
              <span>{t("incoming.broadcast")}</span>
              <span className="text-[10px] text-slate-400 font-mono">NOW</span>
            </div>
            <p className="text-xs text-slate-200 leading-snug">
              {activeAlert}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNotificationToast(false)}
            className="text-slate-400 hover:text-white text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Caller Profile & Pulsing Ring Section */}
      <div className="relative z-10 flex flex-col items-center text-center my-4">
        {/* Radar Ring Animation */}
        <div className="relative mb-4">
          <span className="absolute inset-0 rounded-full bg-red-600/30 animate-ping duration-1000" />
          <span className="absolute -inset-3 rounded-full border-2 border-red-500/40 animate-pulse" />
          <span className="absolute -inset-6 rounded-full border border-red-500/20 animate-pulse delay-200" />

          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-red-950 via-red-800 to-red-600 text-white flex items-center justify-center text-3xl font-display font-extrabold shadow-2xl relative z-10 ring-4 ring-red-500/60">
            <span className="material-symbols-outlined text-[48px] animate-pulse">
              {callType === "video" ? "videocam" : "ring_volume"}
            </span>
          </div>
        </div>

        {/* Caller Name */}
        <h3 className="text-xl sm:text-2xl font-bold font-display text-white tracking-wide">
          {callerName}
        </h3>
        <p className="text-sm font-semibold text-red-300 mt-0.5 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-red-400">
            security
          </span>
          <span>{callerOrg}</span>
        </p>

        {/* Aggressive Redial Badge */}
        <div className="mt-3 flex flex-col items-center gap-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-300 bg-red-950/80 border border-red-600/70 px-3.5 py-1 rounded-full shadow-lg shadow-red-950/50">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span>{t("incoming.redial_badge", { attempt })}</span>
          </span>
          <span className="text-[11px] text-slate-400 italic">
            {t("incoming.redial_desc")}
          </span>
        </div>

        {isDeclining && (
          <div className="mt-3 p-2 bg-red-900/60 border border-red-500 rounded-xl text-xs text-red-200 animate-pulse font-bold">
            {t("incoming.rejected")}
          </div>
        )}
      </div>

      {/* Primary Calling Interaction Buttons (Answer / Decline) */}
      <div className="relative z-10 pt-2 pb-4 flex items-center justify-around gap-6">
        {/* Decline / Reject Call Button */}
        <button
          type="button"
          onClick={handleDeclineClick}
          disabled={isDeclining}
          className="flex flex-col items-center gap-1.5 p-4 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white transition-all cursor-pointer shadow-xl shadow-red-600/50 disabled:opacity-50 group"
          title="Decline Call (Warning: Scammer will aggressively redial)"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-700/50 group-hover:rotate-12 transition-transform">
            <span className="material-symbols-outlined text-[32px]">
              call_end
            </span>
          </div>
          <span className="text-xs font-bold">{t("train.call.decline")}</span>
        </button>

        {/* Accept / Answer Call Button */}
        <button
          type="button"
          onClick={handleAcceptClick}
          disabled={isDeclining}
          className="flex flex-col items-center gap-1.5 p-4 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all cursor-pointer shadow-xl shadow-emerald-600/50 group animate-bounce"
          title="Accept Call to Face the Threat"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-700/50 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[32px]">
              {callType === "video" ? "videocam" : "call"}
            </span>
          </div>
          <span className="text-xs font-bold">{t("train.call.answer")}</span>
        </button>
      </div>

      {/* Emergency Tactical Escape Deck */}
      <div className="relative z-10 mt-2">
        <EmergencyCountermeasures
          onPowerOff={onPowerOff}
          onAirplaneMode={onAirplaneMode}
          onDial1930={onDial1930}
          onBlockNumber={onBlockNumber}
          callerName={callerName}
          callerOrg={callerOrg}
          isCompact={true}
        />
      </div>
    </div>
  );
}

export default IncomingCallOverlay;
