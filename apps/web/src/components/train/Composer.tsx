"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Shield, Lock } from "lucide-react";
import { scrubClientText } from "@/lib/pii";

interface ComposerProps {
  onSend: (text: string) => void;
  pending: boolean;
  disabled?: boolean;
}

export function Composer({ onSend, pending, disabled = false }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live PII scrub preview
  const scrubResult = scrubClientText(text);
  const hasSensitiveData = scrubResult.found.length > 0;

  const handleSend = () => {
    if (!text.trim() || pending || disabled) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-expand textarea height up to 120px
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
  };

  return (
    <div className="p-3 bg-[var(--surface)] border-t border-[var(--border)]">
      {/* Live PII Notice Pill */}
      {hasSensitiveData && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--matcha)] bg-[var(--surface-muted)] border border-[var(--border)] px-2.5 py-1 rounded-lg">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>
            Privacy shield detected: <strong>{scrubResult.found.join(", ")}</strong>. Will be masked safely.
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 bg-[var(--canvas)] border border-[var(--border)] focus-within:border-[var(--accent)] rounded-2xl p-1.5 transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Session ended" : pending ? "Waiting for reply..." : "Type your reply... (Enter to send)"}
          disabled={disabled || pending}
          maxLength={500}
          rows={1}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-hidden resize-none max-h-28 leading-relaxed"
        />

        <div className="flex items-center gap-1.5 pb-1 pr-1">
          <span className="text-[10px] text-[var(--text-muted)] opacity-60 font-mono">
            {text.length}/500
          </span>
          <button
            onClick={handleSend}
            disabled={!text.trim() || pending || disabled}
            aria-label="Send message"
            className="p-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-30 disabled:hover:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
