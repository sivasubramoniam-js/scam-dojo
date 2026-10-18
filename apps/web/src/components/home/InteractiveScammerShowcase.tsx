import React, { useState, useEffect, useRef } from "react";
import { Link } from "@/lib/navigation";
import { RoughAnnotation } from "./RoughAnnotation";
import { useT } from "@/lib/i18n";

interface ScenarioSlide {
  id: string;
  title: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "URGENT";
  tagline: string;
  drillSlug: string;
  callerName: string;
  callerNumber: string;
  callerAvatar: string;
  chatMessages: {
    sender: "scammer" | "victim";
    time: string;
    content: React.ReactNode;
  }[];
  voiceTranscript: string;
  videoCaption: string;
  warrantRef: string;
}

export function InteractiveScammerShowcase() {
  const { t } = useT();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeModal, setActiveModal] = useState<"chat" | "voice" | "video">("chat");
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [callTimer, setCallTimer] = useState(14);
  const [videoPersona, setVideoPersona] = useState<"police" | "customs" | "other">("police");
  const [isVideoTalking, setIsVideoTalking] = useState(true);
  const [isVoiceoverPlaying, setIsVoiceoverPlaying] = useState(false);

  const talkingVideoRef = useRef<HTMLVideoElement | null>(null);
  const listeningVideoRef = useRef<HTMLVideoElement | null>(null);

  const PERSONA_VIDEOS = {
    police: {
      name: "CBI Cyber Interrogation Cell",
      agency: "CENTRAL BUREAU OF INVESTIGATION",
      casePrefix: "CBI/FIR-ND/2026/0891-B",
      talking: "/assets/video/Police-talking.mp4",
      listening: "/assets/video/Police-listening.mp4",
    },
    customs: {
      name: "Customs & Narcotics Interdiction",
      agency: "INDIAN CUSTOMS & NARCOTICS BUREAU",
      casePrefix: "CUSTOMS/NARCO/BOM-7741",
      talking: "/assets/video/Customs-talking.mp4",
      listening: "/assets/video/Customs-listening.mp4",
    },
    other: {
      name: "Utility & Department Verification",
      agency: "OFFICIAL VERIFICATION BUREAU",
      casePrefix: "DEPT/OFFICIAL/REF-44910",
      talking: "/assets/video/Man-talking.mp4",
      listening: "/assets/video/Man-listening.mp4",
    },
  };

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

  // Synchronize 2x speed for talking video loop, 1x for listening video loop
  // Videos are muted so simultaneous speech synthesis / voiceover audio plays clearly
  useEffect(() => {
    if (activeModal !== "video") return;
    const talkingEl = talkingVideoRef.current;
    const listeningEl = listeningVideoRef.current;

    if (isVideoTalking) {
      if (talkingEl) {
        talkingEl.playbackRate = 2.0;
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
  }, [isVideoTalking, videoPersona, activeModal]);

  // Voiceover playback using Web Speech API with automatic transition to listening video
  const toggleVoiceover = (textToSpeak: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isVoiceoverPlaying) {
      window.speechSynthesis.cancel();
      setIsVoiceoverPlaying(false);
      setIsVideoTalking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const inVoice = voices.find(
      (v) => v.lang.includes("en-IN") || v.name.toLowerCase().includes("india")
    );
    if (inVoice) utterance.voice = inVoice;

    utterance.onstart = () => {
      setIsVoiceoverPlaying(true);
      setIsVideoTalking(true);
    };

    utterance.onend = () => {
      setIsVoiceoverPlaying(false);
      setIsVideoTalking(false); // Once talking voiceover stops, seamlessly switch to listening video in loop!
    };

    utterance.onerror = () => {
      setIsVoiceoverPlaying(false);
      setIsVideoTalking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Clean up voiceover and auto-switch persona when changing modals or slides
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsVoiceoverPlaying(false);
    if (currentSlideIndex === 0) {
      setVideoPersona("police");
    } else {
      setVideoPersona("other");
    }
  }, [activeModal, currentSlideIndex]);

  // Auto increment call timer for voice/video
  useEffect(() => {
    const interval = setInterval(() => {
      setCallTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const SCENARIOS: ScenarioSlide[] = [
    {
      id: "digital-arrest",
      title: "Digital Arrest & Police Impersonation",
      category: "Extortion & Psychological Hostage",
      severity: "CRITICAL",
      tagline: "Scammers pose as CBI or Cyber Crime officers on video calls, keeping victims under virtual house arrest.",
      drillSlug: "digital_arrest_call",
      callerName: "CBI Cyber Cell · Sub-Insp. Arjun Rao",
      callerNumber: "+91 98712 43901 (Spoofed Delhi Landline)",
      callerAvatar: "👮‍♂️",
      chatMessages: [
        {
          sender: "scammer",
          time: "10:14 AM",
          content: (
            <span>
              This is Sub-Inspector Arjun Rao,{" "}
              {showAnnotations ? (
                <RoughAnnotation type="box" color="#3B82F6" strokeWidth={1.5}>
                  <strong className="text-blue-600 dark:text-blue-400">Badge #DL-8842-CY (Tilak Marg PS)</strong>
                </RoughAnnotation>
              ) : (
                <strong>Badge #DL-8842-CY (Tilak Marg PS)</strong>
              )}
              , CBI Cyber Crime Investigation Wing. An{" "}
              {showAnnotations ? (
                <RoughAnnotation type="box" color="#DC2626" strokeWidth={2}>
                  <strong className="text-red-600 dark:text-red-400">Immediate Non-Bailable Arrest Warrant</strong>
                </RoughAnnotation>
              ) : (
                <strong>Immediate Non-Bailable Arrest Warrant</strong>
              )}{" "}
              has been issued under your Aadhaar number for international money laundering of{" "}
              {showAnnotations ? (
                <RoughAnnotation type="circle" color="#EF4444" strokeWidth={2}>
                  <strong className="text-red-600 dark:text-red-400">₹7.8 Crore</strong>
                </RoughAnnotation>
              ) : (
                <strong>₹7.8 Crore</strong>
              )}.
            </span>
          ),
        },
        {
          sender: "scammer",
          time: "10:15 AM",
          content: (
            <span>
              Connect immediately to our official surveillance video call. Do not inform family or disconnect:{" "}
              {showAnnotations ? (
                <RoughAnnotation type="highlight" color="rgba(245, 158, 11, 0.45)" strokeWidth={1.5}>
                  <strong className="text-amber-800 dark:text-amber-300">You are under Digital Arrest</strong>
                </RoughAnnotation>
              ) : (
                <strong>You are under Digital Arrest</strong>
              )}{" "}
              under Section 420 IPC and Section 66D IT Act until forensic audit concludes.
            </span>
          ),
        },
        {
          sender: "scammer",
          time: "10:16 AM",
          content: (
            <span>
              Transfer your clearance bond of{" "}
              {showAnnotations ? (
                <RoughAnnotation type="circle" color="#EF4444" strokeWidth={2}>
                  <strong className="text-red-600 dark:text-red-400">₹2,50,000</strong>
                </RoughAnnotation>
              ) : (
                <strong>₹2,50,000</strong>
              )}{" "}
              to the Reserve Bank verification escrow{" "}
              {showAnnotations ? (
                <RoughAnnotation type="underline" color="#8B5CF6" strokeWidth={2}>
                  <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">rbi.clearing.desk@gmall.com</span>
                </RoughAnnotation>
              ) : (
                <span className="font-mono font-bold">rbi.clearing.desk@gmall.com</span>
              )}{" "}
              within{" "}
              {showAnnotations ? (
                <RoughAnnotation type="highlight" color="rgba(245, 158, 11, 0.45)" strokeWidth={1.5}>
                  <strong className="text-amber-800 dark:text-amber-300">30 minutes</strong>
                </RoughAnnotation>
              ) : (
                <strong>30 minutes</strong>
              )}{" "}
              to avoid immediate home raid.
            </span>
          ),
        },
      ],
      voiceTranscript:
        "Listen to me very carefully. You are currently in virtual custody under Section 420 IPC. I am Sub-Inspector Arjun Rao, Badge #DL-8842-CY. If you disconnect this phone or speak to anyone in your room, our armed patrol team at Tilak Marg Police Station will arrive at your door in 15 minutes.",
      videoCaption:
        "High-pressure interrogation setting with official insignia, legal seals, and fake police badges demanding screen-sharing or financial transfers.",
      warrantRef: "CBI/FIR-ND/2026/0891-B",
    },
    {
      id: "electricity-bill",
      title: "Midnight Electricity Bill Cutoff Notice",
      category: "Utility Phishing & Remote Access Trap",
      severity: "URGENT",
      tagline: "Panic-inducing SMS sent in late evening threatening to cut off family electricity in hours.",
      drillSlug: "electricity_bill",
      callerName: "BESCOM Substation · Lineman R. Gowda",
      callerNumber: "+91 97118 64235",
      callerAvatar: "⚡",
      chatMessages: [
        {
          sender: "scammer",
          time: "08:42 PM",
          content: (
            <span>
              Dear Consumer, Your{" "}
              {showAnnotations ? (
                <RoughAnnotation type="underline" color="#8B5CF6" strokeWidth={2}>
                  <span className="text-purple-700 dark:text-purple-300 font-bold">Electrisity Power Supply</span>
                </RoughAnnotation>
              ) : (
                <span className="font-bold">Electrisity Power Supply</span>
              )}{" "}
              will be disconnected{" "}
              {showAnnotations ? (
                <RoughAnnotation type="highlight" color="rgba(245, 158, 11, 0.45)" strokeWidth={1.5}>
                  <strong className="text-amber-800 dark:text-amber-300">Tonight at 9:30 PM</strong>
                </RoughAnnotation>
              ) : (
                <strong>Tonight at 9:30 PM</strong>
              )}{" "}
              from the electric office due to unpaid bill of{" "}
              {showAnnotations ? (
                <RoughAnnotation type="circle" color="#EF4444" strokeWidth={2}>
                  <strong className="text-red-600 dark:text-red-400">₹1,420</strong>
                </RoughAnnotation>
              ) : (
                <strong>₹1,420</strong>
              )}.
            </span>
          ),
        },
        {
          sender: "scammer",
          time: "08:43 PM",
          content: (
            <span>
              Immediately contact lineman{" "}
              {showAnnotations ? (
                <RoughAnnotation type="box" color="#3B82F6" strokeWidth={1.5}>
                  <strong className="text-blue-600 dark:text-blue-400">Rameshwar Gowda (Emp BES-44910)</strong>
                </RoughAnnotation>
              ) : (
                <strong>Rameshwar Gowda (Emp BES-44910)</strong>
              )}{" "}
              at{" "}
              {showAnnotations ? (
                <RoughAnnotation type="box" color="#EF4444" strokeWidth={1.5}>
                  <strong className="text-red-600 dark:text-red-400">+91 97118 64235</strong>
                </RoughAnnotation>
              ) : (
                <strong>+91 97118 64235</strong>
              )}{" "}
              or update bill payment at{" "}
              {showAnnotations ? (
                <RoughAnnotation type="underline" color="#8B5CF6" strokeWidth={2}>
                  <span className="text-purple-700 dark:text-purple-300 font-mono font-bold">http://bescom-billupdate.online/quickpay</span>
                </RoughAnnotation>
              ) : (
                <span className="font-mono font-bold">http://bescom-billupdate.online/quickpay</span>
              )}{" "}
              (UPI: <span className="font-mono">bescom.substation@gmall.com</span>).
            </span>
          ),
        },
      ],
      voiceTranscript:
        "Sir, your feeder switch is scheduled for cutoff in 20 minutes by BESCOM sub-division. Call lineman Rameshwar Gowda at +91 97118 64235 or approve payment to bescom.substation@gmall.com immediately so we can reverse the disconnection command from the substation server.",
      videoCaption:
        "Screen share session where scammers trick users into revealing UPI PINs under the guise of an officer's screen synchronization.",
      warrantRef: "BESCOM-DISCONNECT-#44910",
    },
    {
      id: "telegram-task",
      title: "Part-Time Task & Merchant Rating Trap",
      category: "Work-From-Home Greed Trap",
      severity: "HIGH",
      tagline: "Begins with legitimate small ₹150 payouts, then freezes lakhs in simulated merchant trading dashboards.",
      drillSlug: "job_offer_task",
      callerName: "Global Media WorkHub · Sarah Jenkins",
      callerNumber: "+91 91672 88419",
      callerAvatar: "💼",
      chatMessages: [
        {
          sender: "scammer",
          time: "02:15 PM",
          content: (
            <span>
              Congratulations! Your payout of{" "}
              {showAnnotations ? (
                <RoughAnnotation type="circle" color="#10B981" strokeWidth={2}>
                  <strong className="text-emerald-600 dark:text-emerald-400">₹300</strong>
                </RoughAnnotation>
              ) : (
                <strong className="text-emerald-600">₹300</strong>
              )}{" "}
              for liking 3 hotel listings has been credited to your UPI!
            </span>
          ),
        },
        {
          sender: "scammer",
          time: "02:18 PM",
          content: (
            <span>
              You qualify for our{" "}
              {showAnnotations ? (
                <RoughAnnotation type="highlight" color="rgba(245, 158, 11, 0.45)" strokeWidth={1.5}>
                  <strong className="text-amber-800 dark:text-amber-300">VIP Merchant Task #7</strong>
                </RoughAnnotation>
              ) : (
                <strong>VIP Merchant Task #7</strong>
              )}. Deposit{" "}
              {showAnnotations ? (
                <RoughAnnotation type="circle" color="#EF4444" strokeWidth={2}>
                  <strong className="text-red-600 dark:text-red-400">₹10,000</strong>
                </RoughAnnotation>
              ) : (
                <strong>₹10,000</strong>
              )}{" "}
              now to{" "}
              {showAnnotations ? (
                <RoughAnnotation type="underline" color="#8B5CF6" strokeWidth={2}>
                  <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">global.merchant.rating@gmall.com</span>
                </RoughAnnotation>
              ) : (
                <span className="font-mono font-bold">global.merchant.rating@gmall.com</span>
              )}{" "}
              to withdraw{" "}
              {showAnnotations ? (
                <RoughAnnotation type="circle" color="#10B981" strokeWidth={2}>
                  <strong className="text-emerald-600 dark:text-emerald-400">₹16,500</strong>
                </RoughAnnotation>
              ) : (
                <strong>₹16,500</strong>
              )}{" "}
              within 10 minutes on{" "}
              <span className="font-mono text-xs">http://merchant-vip-tasks.work/login</span>.
            </span>
          ),
        },
        {
          sender: "scammer",
          time: "02:22 PM",
          content: (
            <span>
              SYSTEM ALERT: Your merchant credit score has encountered a shortfall. Deposit{" "}
              {showAnnotations ? (
                <RoughAnnotation type="box" color="#EF4444" strokeWidth={2}>
                  <strong className="text-red-600 dark:text-red-400">₹50,000 more</strong>
                </RoughAnnotation>
              ) : (
                <strong>₹50,000 more</strong>
              )}{" "}
              to unfreeze your total balance of ₹76,500 by order of{" "}
              {showAnnotations ? (
                <RoughAnnotation type="box" color="#3B82F6" strokeWidth={1.5}>
                  <strong className="text-blue-600 dark:text-blue-400">Recruiter Sarah Jenkins (Partner ID TG-GLOBAL-84920)</strong>
                </RoughAnnotation>
              ) : (
                <strong>Recruiter Sarah Jenkins (Partner ID TG-GLOBAL-84920)</strong>
              )}{" "}
              or entire principal will be liquidated.
            </span>
          ),
        },
      ],
      voiceTranscript:
        "Sir, this is Sarah Jenkins, HR Coordinator. You have completed 90% of the VIP order batch. Please transfer the clearance deposit to global.merchant.rating@gmall.com right now, otherwise our automated finance system will freeze your entire withdrawal portfolio.",
      videoCaption:
        "Simulated trading portal displaying fake profits and countdown timers pressuring users into higher deposits.",
      warrantRef: "TASK-BATCH-TG-84920",
    },
    {
      id: "courier-customs",
      title: "FedEx Narcotics Parcel Extortion",
      category: "Customs Drug Trap",
      severity: "CRITICAL",
      tagline: "Automated IVR call claims your Aadhaar was used to ship MDMA drugs abroad, threatening immediate arrest.",
      drillSlug: "courier_customs",
      callerName: "Customs Narcotics · Supt. Vinod Deshmukh",
      callerNumber: "+91 80 4719 3280 (Interception Line)",
      callerAvatar: "📦",
      chatMessages: [
        {
          sender: "scammer",
          time: "11:02 AM",
          content: (
            <span>
              Your outbound international parcel #GEX-88491 held at Mumbai Airport Cargo Terminal contains{" "}
              {showAnnotations ? (
                <RoughAnnotation type="box" color="#EF4444" strokeWidth={2}>
                  <strong className="text-red-600 dark:text-red-400">140g MDMA & 5 Passports</strong>
                </RoughAnnotation>
              ) : (
                <strong>140g MDMA & 5 Passports</strong>
              )}{" "}
              registered under your Aadhaar number.
            </span>
          ),
        },
        {
          sender: "scammer",
          time: "11:04 AM",
          content: (
            <span>
              Case registered under NDPS Act Section 20 by{" "}
              {showAnnotations ? (
                <RoughAnnotation type="box" color="#3B82F6" strokeWidth={1.5}>
                  <strong className="text-blue-600 dark:text-blue-400">Superintendent Vinod M. Deshmukh (ID NCB-WZ-3094)</strong>
                </RoughAnnotation>
              ) : (
                <strong>Superintendent Vinod M. Deshmukh (ID NCB-WZ-3094)</strong>
              )}. Verify seizure report at{" "}
              {showAnnotations ? (
                <RoughAnnotation type="underline" color="#8B5CF6" strokeWidth={2}>
                  <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">http://customs-parcel-track.in/delhi/seizure</span>
                </RoughAnnotation>
              ) : (
                <span className="font-mono font-bold">http://customs-parcel-track.in/delhi/seizure</span>
              )}{" "}
              or transfer ₹35,000 security audit to{" "}
              {showAnnotations ? (
                <RoughAnnotation type="underline" color="#8B5CF6" strokeWidth={2}>
                  <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">customs.escrow.release@gmall.com</span>
                </RoughAnnotation>
              ) : (
                <span className="font-mono font-bold">customs.escrow.release@gmall.com</span>
              )}{" "}
              before police arrest team arrives.
            </span>
          ),
        },
      ],
      voiceTranscript:
        "This call is being recorded by the Narcotics Control Bureau, Western Zone. I am Superintendent Vinod Deshmukh, ID NCB-WZ-3094. A non-bailable arrest warrant has been drafted for your Aadhaar address. Confirm your identity or police teams will be dispatched.",
      videoCaption:
        "High-stress video interview where scammers showcase fake seizure memos and official customs stamps.",
      warrantRef: "NCB/MUM/NDPS-3094",
    },
  ];

  const current = SCENARIOS[currentSlideIndex];

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <section className="my-10 sm:my-14 p-4 sm:p-10 rounded-2xl sm:rounded-3xl bg-[var(--sf)] border border-[var(--line)] shadow-dojo">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--act)]/10 text-[var(--act)] border border-[var(--act)]/20 mb-3">
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>Adversarial Threat Simulator</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-[var(--ink)] tracking-tight">
            How The Trap Unfolds in Real-Time
          </h2>
          <p className="text-xs sm:text-base text-[var(--mut)] max-w-xl mt-1">
            Experience the identical psychological mechanics scammers deploy across Messaging, Phone Calls, and Video Interrogations.
          </p>
        </div>

        {/* Carousel Slide Controls */}
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 mr-2">
            {SCENARIOS.map((scen, idx) => (
              <button
                key={scen.id}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${currentSlideIndex === idx ? "w-8 bg-[var(--act)]" : "w-2.5 bg-[var(--line)] hover:bg-[var(--mut)]"
                  }`}
                title={`Go to ${scen.title}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => (prev === 0 ? SCENARIOS.length - 1 : prev - 1))}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--sf2)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--act)] hover:text-white transition-all cursor-pointer shadow-xs"
              title="Previous Scenario"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => (prev === SCENARIOS.length - 1 ? 0 : prev + 1))}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--sf2)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--act)] hover:text-white transition-all cursor-pointer shadow-xs"
              title="Next Scenario"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[var(--sf2)]/50 border border-[var(--line)] mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{current.callerAvatar}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-lg text-[var(--ink)]">
                {current.title}
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white">
                {current.severity}
              </span>
            </div>
            <span className="text-xs text-[var(--mut)] font-semibold">{current.category}</span>
          </div>
        </div>

        {/* Modal Switcher: Chat / Voice / Video */}
        <div className="flex items-center gap-1 bg-[var(--sf)] border border-[var(--line)] p-1 rounded-xl shadow-xs w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => setActiveModal("chat")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${activeModal === "chat" ? "bg-[var(--act)] text-white shadow-xs" : "text-[var(--mut)] hover:text-[var(--ink)]"
              }`}
          >
            <span className="material-symbols-outlined text-[15px]">chat</span>
            <span>{t("train.mode.chat")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModal("voice")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${activeModal === "voice" ? "bg-[var(--act)] text-white shadow-xs" : "text-[var(--mut)] hover:text-[var(--ink)]"
              }`}
          >
            <span className="material-symbols-outlined text-[15px]">call</span>
            <span>{t("train.mode.audio")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModal("video")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${activeModal === "video" ? "bg-[var(--act)] text-white shadow-xs" : "text-[var(--mut)] hover:text-[var(--ink)]"
              }`}
          >
            <span className="material-symbols-outlined text-[15px]">videocam</span>
            <span>{t("train.mode.video")}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Screen Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* The Device Frame (Center / Left) */}
        <div className="lg:col-span-8 bg-black/95 rounded-3xl border border-slate-800 shadow-2xl p-5 sm:p-6 overflow-hidden h-[540px] flex flex-col justify-between relative text-white">
          {/* 1. CHAT UI */}
          {activeModal === "chat" && (
            <div className="flex flex-col justify-between h-full overflow-hidden animate-in fade-in duration-300">
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl">
                    {current.callerAvatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{current.callerName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[11px] text-slate-400">{current.callerNumber}</span>
                  </div>
                </div>

                {/* Rough Notation Switch */}
                <button
                  type="button"
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${showAnnotations
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  title="Toggle Hand-drawn Red Flag Highlights"
                >
                  <span className="material-symbols-outlined text-[15px]">draw</span>
                  <span>{showAnnotations ? "Annotations: ON" : "Annotations: OFF"}</span>
                </button>
              </div>

              {/* Chat Messages */}
              <div className="space-y-2.5 my-auto overflow-y-auto py-1 max-h-[320px] sm:max-h-[360px] pr-1">
                {current.chatMessages.map((msg, i) => (
                  <div key={i} className="flex flex-col items-start max-w-[94%]">
                    <div className="bg-slate-900 border border-slate-800 text-slate-100 p-2.5 sm:p-3 rounded-2xl rounded-tl-xs text-xs sm:text-[13px] leading-relaxed shadow-sm">
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 pl-1">{msg.time} · Sent</span>
                  </div>
                ))}
              </div>

              {/* Red Flag Color Code Legend */}
              {showAnnotations && (
                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] flex flex-wrap items-center gap-3">
                  <span className="text-slate-400 font-bold">Red Flag Legend:</span>
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Red: Threat & Extortion
                  </span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Amber: Artificial Deadline
                  </span>
                  <span className="flex items-center gap-1 text-purple-300">
                    <span className="w-2 h-2 rounded-full bg-purple-400" /> Purple: Phishing Domain
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. VOICE CALL UI */}
          {activeModal === "voice" && (
            <div className="flex flex-col justify-between h-full py-2 space-y-3.5 animate-in fade-in duration-300 text-center overflow-hidden">
              {/* Top VOIP badge */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ENCRYPTED VOIP PRI
                </span>
                <span className="font-mono">{formatTimer(callTimer)}</span>
              </div>

              {/* Caller Card */}
              <div>
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-red-500/50 mx-auto flex items-center justify-center text-3xl shadow-xl animate-pulse">
                  {current.callerAvatar}
                </div>
                <h4 className="text-base font-bold text-white mt-2">{current.callerName}</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{current.callerNumber}</p>
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 mt-1.5">
                  Psychological Tension: 8/10
                </span>
              </div>

              {/* Live Audio Waveform Simulation */}
              <div className="py-1">
                <div className="flex items-center justify-center gap-1.5 h-10">
                  {[18, 36, 48, 24, 40, 52, 30, 44, 20, 48, 32, 16].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-gradient-to-t from-red-600 to-amber-400 animate-pulse"
                      style={{
                        height: `${h * 0.8}px`,
                        animationDelay: `${(i % 4) * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">Caller speaking with urgent coercive cadence...</span>
              </div>

              {/* Live Speech Transcript Box */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 italic leading-relaxed text-left">
                <span className="text-red-400 font-bold not-italic font-mono block text-[10px] uppercase mb-0.5">
                  🔴 Live Audio Intercept Transcript:
                </span>
                "{current.voiceTranscript}"
              </div>

              {/* Call Controls */}
              <div className="flex items-center justify-center gap-5 pt-1">
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">mic_off</span>
                </button>
                <button
                  type="button"
                  className="w-13 h-13 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-600/30 cursor-pointer"
                  title="Hang Up"
                >
                  <span className="material-symbols-outlined text-[24px]">call_end</span>
                </button>
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">volume_up</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. VIDEO CALL UI (INTERACTIVE SCAMMER VIDEO SIMULATION) */}
          {activeModal === "video" && (
            <div className="relative flex flex-col justify-between h-full rounded-2xl overflow-hidden border border-slate-800 animate-in fade-in duration-300 bg-black">
              {/* Talking Video (2x Speed Loop Mode, Muted so Voiceover Audio Plays Simultaneously) */}
              <video
                ref={talkingVideoRef}
                src={PERSONA_VIDEOS[videoPersona].talking}
                autoPlay
                loop
                muted
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isVideoTalking ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
              />

              {/* Listening Video (1x Speed Loop Mode, Muted, Plays until User Completes Speech) */}
              <video
                ref={listeningVideoRef}
                src={PERSONA_VIDEOS[videoPersona].listening}
                autoPlay
                loop
                muted
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${!isVideoTalking ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
              />

              {/* CCTV & Interrogation Overlay Grid */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 pointer-events-none z-15" />

              {/* Top CCTV Status Bar */}
              <div className="relative z-20 flex items-center justify-between p-3 text-[11px] font-mono text-slate-300 border-b border-white/10 bg-black/60 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="text-red-400 font-bold">REC 🔴 {formatTimer(callTimer)}</span>
                  <span className="text-slate-400 hidden sm:inline">FPS: 30.0</span>
                </div>

                {/* Persona Feed Selector */}
                <div className="flex items-center gap-1 bg-black/80 p-0.5 rounded-xl border border-white/15 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setVideoPersona("police")}
                    className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-bold ${videoPersona === "police"
                        ? "bg-blue-600 text-white font-black shadow-xs"
                        : "text-slate-400 hover:text-white"
                      }`}
                  >
                    👮 Police<span className="hidden sm:inline"> Feed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoPersona("customs")}
                    className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-bold ${videoPersona === "customs"
                        ? "bg-amber-600 text-white font-black shadow-xs"
                        : "text-slate-400 hover:text-white"
                      }`}
                  >
                    🛃 Customs<span className="hidden sm:inline"> Feed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoPersona("other")}
                    className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-bold ${videoPersona === "other"
                        ? "bg-purple-600 text-white font-black shadow-xs"
                        : "text-slate-400 hover:text-white"
                      }`}
                  >
                    🏢 Other<span className="hidden sm:inline"> Dept</span>
                  </button>
                </div>
              </div>

              {/* Center Insignia Watermark (Subtle Overlay) */}
              <div className="relative z-20 my-auto text-center pointer-events-none opacity-85">
                <div className="w-12 h-12 rounded-full bg-red-950/80 border-2 border-red-500/50 mx-auto flex items-center justify-center text-xl shadow-xl mb-1">
                  {videoPersona === "police" ? "👮‍♂️" : videoPersona === "customs" ? "🛃" : "🏢"}
                </div>
                <h4 className="text-xs font-black text-white tracking-widest uppercase drop-shadow-md">
                  {PERSONA_VIDEOS[videoPersona].agency}
                </h4>
                <p className="text-[10px] text-red-400 font-mono tracking-wider">
                  MANDATORY VIDEO INTERROGATION SUMMONS
                </p>
              </div>

              {/* Bottom Interactive Video Tactical Bar */}
              <div className="relative z-20 p-2.5 sm:p-3 bg-black/85 backdrop-blur-md border-t border-white/10 text-xs flex flex-col gap-2">
                {/* Mode Controller & Voiceover Playback Trigger */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 justify-between sm:justify-start">
                    {/* Talking vs Listening Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsVideoTalking(true)}
                      className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${isVideoTalking
                          ? "bg-rose-600 text-white shadow-xs font-black animate-pulse"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                        }`}
                      title="Play Talking Video in 2x Speed Loop"
                    >
                      <span>🗣️</span>
                      <span>Talking (2x Loop)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined" && "speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                        setIsVoiceoverPlaying(false);
                        setIsVideoTalking(false);
                      }}
                      className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${!isVideoTalking
                          ? "bg-emerald-600 text-white shadow-xs font-black animate-pulse"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                        }`}
                      title="Play Listening Video in Loop until speech completes"
                    >
                      <span>👂</span>
                      <span>Listening (Loop)</span>
                    </button>
                  </div>

                  {/* Simultaneous Voiceover Audio Button */}
                  <button
                    type="button"
                    onClick={() => toggleVoiceover(current.voiceTranscript)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${isVoiceoverPlaying
                        ? "bg-red-600 text-white animate-pulse"
                        : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                      }`}
                    title="Play voiceover simultaneously with 2x talking video loop"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isVoiceoverPlaying ? "volume_off" : "volume_up"}
                    </span>
                    <span>
                      {isVoiceoverPlaying ? "Stop Voiceover" : "🔊 Play Scammer Voiceover"}
                    </span>
                  </button>
                </div>

                {/* Subtitle Dialogue */}
                <p className="text-slate-200 text-[10px] sm:text-[11px] leading-relaxed italic border-t border-white/10 pt-1.5">
                  <span className="text-amber-400 font-bold not-italic font-mono mr-1">
                    {videoPersona === "police" ? "Officer:" : videoPersona === "customs" ? "Customs Agent:" : "Official:"}
                  </span>
                  "{current.voiceTranscript}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Forensic Anatomy & Direct Dojo Route */}
        <div className="lg:col-span-4 flex flex-col justify-between lg:h-[540px] h-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--sf2)]/30 border border-[var(--line)] gap-4 sm:gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--mut)] mb-1">
              Threat Vector Anatomy
            </div>
            <h4 className="text-xl font-bold font-display text-[var(--ink)] mb-2">
              {current.title}
            </h4>
            <p className="text-xs sm:text-sm text-[var(--mut)] leading-relaxed mb-4">
              {current.tagline}
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[var(--sf2)]/60 border border-[var(--line)]">
                <div className="text-[11px] font-bold text-[var(--bad)] uppercase mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">shield</span>
                  <span>Primary Coercion Tactic</span>
                </div>
                <p className="text-xs text-[var(--ink)] font-medium">
                  High-stakes urgency combined with fear of immediate legal action, social shame, and asset liquidation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--sf2)]/60 border border-[var(--line)]">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Defensive Counter Stance</span>
                </div>
                <p className="text-xs text-[var(--ink)] font-medium">
                  Hang up immediately. No police department conducts arrests via video calls. Directly dial 1930 or your local police station.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button: Train in Live Dojo */}
          <div className="pt-4 border-t border-[var(--line)]">
            <Link
              to="/train"
              className="dojo-btn w-full flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-md hover:scale-[1.02] transition-transform"
            >
              <span>🥋 Practice This Scenario in Dojo Arena</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            <span className="block text-center text-[11px] text-[var(--mut)] mt-2">
              Test your reflexes against our stateful Gemini adversary
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default InteractiveScammerShowcase;
