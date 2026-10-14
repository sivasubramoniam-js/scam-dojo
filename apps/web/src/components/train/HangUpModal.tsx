"use client";

import React from "react";
import { PhoneOff, Shield, X } from "lucide-react";

interface HangUpModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HangUpModal({ isOpen, onConfirm, onCancel }: HangUpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl text-left">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <PhoneOff className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-[var(--text)] mb-2">
          Hang Up & End Drill?
        </h3>

        <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-xs text-[var(--text-muted)] leading-relaxed mb-6">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--matcha)] mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Walking away is a winning tactic</span>
          </div>
          In real-world fraud, abruptly disengaging deprives the scammer of momentum and urgency. Ending now will take you to your Sensei debrief.
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-muted)] cursor-pointer transition-colors"
          >
            Stay in Drill
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--beni)] text-white hover:opacity-90 cursor-pointer shadow-xs transition-opacity"
          >
            Hang Up & See Debrief
          </button>
        </div>
      </div>
    </div>
  );
}
