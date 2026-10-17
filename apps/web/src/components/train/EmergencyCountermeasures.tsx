import React, { useState } from "react";
import { ringtoneEngine } from "@/lib/ringtone";
import { useT } from "@/lib/i18n";

interface EmergencyCountermeasuresProps {
  onPowerOff: () => void;
  onAirplaneMode: () => void;
  onDial1930: () => void;
  onBlockNumber: () => void;
  callerName?: string;
  callerOrg?: string;
  isCompact?: boolean;
}

export function EmergencyCountermeasures({
  onPowerOff,
  onAirplaneMode,
  onDial1930,
  onBlockNumber,
  callerName = "Unknown Intimidator",
  callerOrg = "Official Authority (Simulated)",
  isCompact = false,
}: EmergencyCountermeasuresProps) {
  const { t } = useT();
  const [showPowerOffSlider, setShowPowerOffSlider] = useState(false);
  const [sliderVal, setSliderVal] = useState(0);
  const [showGroundingModal, setShowGroundingModal] = useState(false);
  const [show1930Modal, setShow1930Modal] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [airplaneActive, setAirplaneActive] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderVal(val);
    if (val >= 90) {
      ringtoneEngine.playPowerDownSound();
      setShowPowerOffSlider(false);
      onPowerOff();
    }
  };

  const handleToggleAirplane = () => {
    ringtoneEngine.playAirplaneModeSound();
    setAirplaneActive(true);
    setTimeout(() => {
      onAirplaneMode();
    }, 600);
  };

  const handleCall1930 = () => {
    ringtoneEngine.stop();
    setShow1930Modal(true);
  };

  const handleBlock = () => {
    setBlocked(true);
    onBlockNumber();
  };

  return (
    <div className="w-full">
      {/* Action Deck Bar */}
      <div className={`bg-slate-950/90 border border-red-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md ${isCompact ? "py-2.5 px-3" : ""}`}>
        <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-[20px] animate-pulse">
              shield_with_heart
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {t("sos.title")}
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/70 border border-amber-600/40 px-2 py-0.5 rounded-full">
            {t("sos.tactical_escape")}
          </span>
        </div>

        <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
          {t("sos.sensory_overload")}
        </p>

        {/* Tactical Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Action 1: Power Off Mobile */}
          <button
            type="button"
            onClick={() => setShowPowerOffSlider(true)}
            className="group flex flex-col items-center justify-center p-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/50 hover:border-red-400 text-white transition-all cursor-pointer shadow-md text-center"
            title="Force Power Down Mobile Device"
          >
            <div className="w-8 h-8 rounded-full bg-red-600/40 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px] text-red-300">
                power_settings_new
              </span>
            </div>
            <span className="text-xs font-bold text-red-200">{t("sos.power_off")}</span>
            <span className="text-[9px] text-red-300/80 mt-0.5">{t("sos.kill_sensory")}</span>
          </button>

          {/* Action 2: Airplane Mode */}
          <button
            type="button"
            onClick={handleToggleAirplane}
            disabled={airplaneActive}
            className="group flex flex-col items-center justify-center p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 hover:border-amber-400 text-white transition-all cursor-pointer shadow-md text-center disabled:opacity-50"
            title="Sever Cellular & Wi-Fi Network"
          >
            <div className="w-8 h-8 rounded-full bg-amber-600/40 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px] text-amber-300">
                airplanemode_active
              </span>
            </div>
            <span className="text-xs font-bold text-amber-200">
              {airplaneActive ? "Airplane Mode Active" : t("sos.airplane_mode")}
            </span>
            <span className="text-[9px] text-amber-300/80 mt-0.5">{t("sos.cut_voip")}</span>
          </button>

          {/* Action 3: Call 1930 */}
          <button
            type="button"
            onClick={handleCall1930}
            className="group flex flex-col items-center justify-center p-3 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 border border-blue-500/50 hover:border-blue-400 text-white transition-all cursor-pointer shadow-md text-center"
            title="Dial National Cyber Crime Reporting Helpline"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/40 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px] text-blue-300">
                support_agent
              </span>
            </div>
            <span className="text-xs font-bold text-blue-200">{t("sos.dial_1930")}</span>
            <span className="text-[9px] text-blue-300/80 mt-0.5">{t("sos.national_desk")}</span>
          </button>

          {/* Action 4: Grounding Reality Check */}
          <button
            type="button"
            onClick={() => setShowGroundingModal(true)}
            className="group flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 hover:border-emerald-400 text-white transition-all cursor-pointer shadow-md text-center"
            title="Read Forensic Legal Facts & Box Breathing"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-600/40 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px] text-emerald-300">
                self_improvement
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-200">{t("sos.reality_check")}</span>
            <span className="text-[9px] text-emerald-300/80 mt-0.5">{t("sos.deescalate")}</span>
          </button>
        </div>
      </div>

      {/* POWER OFF SLIDER MODAL */}
      {showPowerOffSlider && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="max-w-md w-full text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500/50 flex items-center justify-center mb-6 animate-pulse">
              <span className="material-symbols-outlined text-[42px] text-red-400">
                power_settings_new
              </span>
            </div>

            <h3 className="text-2xl font-bold font-display text-white mb-2">
              {t("sos.shutdown_title")}
            </h3>
            <p className="text-sm text-slate-300 mb-8 max-w-sm">
              {t("sos.shutdown_desc")}
            </p>

            {/* Slider track */}
            <div className="relative w-full max-w-xs h-16 bg-slate-900 rounded-full border-2 border-red-500/40 overflow-hidden flex items-center px-2 shadow-inner">
              <div
                className="absolute inset-y-0 left-0 bg-red-600/30 transition-all pointer-events-none"
                style={{ width: `${sliderVal}%` }}
              />
              <span className="w-full text-center text-xs font-bold uppercase tracking-wider text-slate-400 select-none pointer-events-none">
                {sliderVal >= 80 ? t("sos.release_to_power") : t("sos.slide_to_power")}
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderVal}
                onChange={handleSliderChange}
                onMouseUp={() => sliderVal < 90 && setSliderVal(0)}
                onTouchEnd={() => sliderVal < 90 && setSliderVal(0)}
                className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10"
              />
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  ringtoneEngine.playPowerDownSound();
                  setShowPowerOffSlider(false);
                  onPowerOff();
                }}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-red-600/30"
              >
                {t("sos.instant_shutdown")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPowerOffSlider(false);
                  setSliderVal(0);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                {t("sos.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1930 HELPLINE SIMULATOR MODAL */}
      {show1930Modal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border border-blue-500/40 rounded-3xl p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-blue-400">
                  verified
                </span>
              </div>
              <div>
                <h4 className="font-bold text-base text-white">
                  {t("sos.helpline_title")}
                </h4>
                <p className="text-[11px] text-blue-300 font-mono">
                  {t("sos.helpline_sub")}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Duty Officer: "Please stay calm. You are safe."</span>
              </div>
              <p>
                "You have connected to the National Cyber Crime Emergency Response Desk. Based on your report, this caller claiming to be <strong className="text-white">{callerName} ({callerOrg})</strong> is an impersonator executing a coercive Digital Extortion scam."
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pt-1">
                <li><strong className="text-amber-300">Legal Fact:</strong> Law enforcement never conducts video call arrests or warrants.</li>
                <li><strong className="text-amber-300">Strict Rule:</strong> Never transfer funds to any 'verification RBI account'.</li>
                <li><strong className="text-amber-300">Action:</strong> Keep your line disconnected and block the caller.</li>
              </ul>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShow1930Modal(false);
                  onDial1930();
                }}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">call_end</span>
                {t("sos.confirm_1930")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SENSEI REALITY GROUNDING MODAL */}
      {showGroundingModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[24px]">
                  spa
                </span>
                <h4 className="font-bold text-base text-white">
                  {t("sos.grounding_title")}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowGroundingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Box breathing exercise */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl mb-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-1">
                {t("sos.breathing_title")}
              </span>
              <p className="text-xs text-slate-200 mb-2">
                {t("sos.breathing_desc")}
              </p>
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-emerald-400/50 flex items-center justify-center animate-pulse">
                <span className="text-[11px] font-mono font-bold text-emerald-300">{t("sos.breathe")}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2">
                <span className="text-red-400 font-bold shrink-0">1.</span>
                <span><strong>No 'Digital Arrest' in Law:</strong> The Supreme Court and Ministry of Home Affairs confirm no agency arrests over Skype or WhatsApp.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2">
                <span className="text-red-400 font-bold shrink-0">2.</span>
                <span><strong>Urgency is a Weapon:</strong> The screaming, the continuous redials, the fake court badges are staged solely to disable your critical thinking.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2">
                <span className="text-red-400 font-bold shrink-0">3.</span>
                <span><strong>You Have the Power:</strong> You can disconnect and verify by physically visiting the nearest police station or bank branch.</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowGroundingModal(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                {t("sos.centered")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmergencyCountermeasures;
