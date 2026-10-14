"use client";

import React from "react";
import { ChatMessage } from "@/lib/types";
import { Shield, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ChatBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
}

export function ChatBubble({ message, streaming = false }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isSensei = message.role === "sensei";

  // Sensei Safety Intervention Card
  if (isSensei || message.text.startsWith("[Sensei]")) {
    const cleanText = message.text.replace(/^\[Sensei\]\s*/, "");
    return (
      <div className="my-4 mx-auto max-w-md p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shadow-xs">
        <div className="flex items-center gap-2 mb-2 font-bold text-amber-800 dark:text-amber-100">
          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Sensei Safety Break</span>
        </div>
        <p className="leading-relaxed mb-3">{cleanText}</p>
        <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-[11px]">
          <span className="opacity-80">Dealing with a real fraud incident?</span>
          <Link
            href="/recover"
            className="font-bold underline hover:opacity-80 text-amber-700 dark:text-amber-300"
          >
            Open Recover Mode &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full my-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        {/* Bubble container */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
            isUser
              ? "bg-[var(--accent)] text-white rounded-tr-xs"
              : "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-tl-xs"
          }`}
        >
          {message.text}
          {streaming && (
            <span className="inline-block w-1.5 h-3.5 ml-1 bg-current animate-pulse align-middle" />
          )}
        </div>

        {/* PII Redaction Tags & Timestamp */}
        <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-[var(--text-muted)]">
          {message.piiRemoved && message.piiRemoved.length > 0 && (
            <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-muted)] text-[var(--matcha)] border border-[var(--border)]">
              <Shield className="w-2.5 h-2.5" />
              Masked: {message.piiRemoved.join(", ")}
            </span>
          )}
          {message.ts && (
            <span className="opacity-70 text-[10px]">
              {new Date(message.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
