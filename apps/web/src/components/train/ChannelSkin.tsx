"use client";

import React from "react";
import { Channel, ScenarioInfo } from "@/lib/types";
import {
  Wifi,
  Battery,
  ShieldAlert,
  PhoneCall,
  User,
  MoreVertical,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface ChannelSkinProps {
  scenario: ScenarioInfo;
  channel: Channel;
  children: React.ReactNode;
}

export function ChannelSkin({ scenario, channel, children }: ChannelSkinProps) {
  const renderHeader = () => {
    switch (channel) {
      case "chat":
        return (
          <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  {scenario.personaName.charAt(0)}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--surface)]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5 leading-tight">
                  {scenario.personaName}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 leading-tight mt-0.5">
                  <span>{scenario.orgLabel}</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active now</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[var(--text-muted)]">
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-muted)] flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Encrypted
              </span>
            </div>
          </div>
        );

      case "email":
        return (
          <div className="bg-[var(--surface)] border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--text)]">From:</span>
                <span>{scenario.personaName} &lt;support@orion-kyc.example&gt;</span>
              </div>
              <span className="text-[11px] opacity-75">Today, 11:24 AM</span>
            </div>
            <div className="text-sm font-bold text-[var(--text)] mb-2.5">
              Urgent: Immediate action required on your account
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>External Sender: Verify sender identity before taking action or opening links.</span>
            </div>
          </div>
        );

      case "call":
        return (
          <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center animate-pulse">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text)]">{scenario.personaName}</h4>
                <p className="text-[11px] text-rose-600 font-semibold tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                  Voice Call Active (Simulated)
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)] px-2 py-1 bg-[var(--surface-muted)] rounded">
              01:42
            </span>
          </div>
        );

      default: // phone_sms
        return (
          <div className="bg-[var(--surface)] border-b border-[var(--border)]">
            {/* Phone status bar */}
            <div className="px-4 py-1.5 flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] opacity-80 border-b border-[var(--border)]/50">
              <span>DOJO 5G</span>
              <div className="flex items-center gap-2">
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* SMS contact header */}
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text)] leading-tight">
                    {scenario.personaName}
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                    {scenario.orgLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert className="w-3 h-3" />
                <span>Simulated SMS</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[var(--canvas)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-xs">
      {renderHeader()}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
