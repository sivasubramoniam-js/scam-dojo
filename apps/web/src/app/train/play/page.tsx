"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { sse } from "@/lib/sse";
import { scrubClientText } from "@/lib/pii";
import {
  ChatMessage,
  TrainSessionDetail,
} from "@/lib/types";
import { ChannelSkin } from "@/components/train/ChannelSkin";
import { ChatBubble } from "@/components/train/ChatBubble";
import { Composer } from "@/components/train/Composer";
import { PressureMeter } from "@/components/train/PressureMeter";
import { QuickReplies } from "@/components/train/QuickReplies";
import { HangUpModal } from "@/components/train/HangUpModal";
import { PhoneOff, Loader2, ShieldCheck } from "lucide-react";

function TrainPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");

  const [session, setSession] = useState<TrainSessionDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tension, setTension] = useState<number>(0);
  const [pending, setPending] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [hangUpOpen, setHangUpOpen] = useState<boolean>(false);
  const [endingNotice, setEndingNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, endingNotice]);

  // Load session on mount
  useEffect(() => {
    if (!sid) {
      setError("No session ID provided in URL");
      setLoading(false);
      return;
    }

    let active = true;
    async function loadSession() {
      try {
        const data = await api<TrainSessionDetail>(`/v1/train/sessions/${sid}`);
        if (active) {
          setSession(data);
          setMessages(data.messages);
          setTension(data.tension);
          if (data.status === "ended") {
            router.replace(`/train/debrief?sid=${sid}`);
          }
        }
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load simulation session");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, [sid, router]);

  const handleSendMessage = async (text: string) => {
    if (!sid || pending) return;

    // Client-side scrub
    const scrubbed = scrubClientText(text);
    const clientMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const userMsg: ChatMessage = {
      i: messages.length + 1,
      role: "user",
      text: scrubbed.text,
      ts: new Date().toISOString(),
      piiRemoved: scrubbed.found,
    };

    setMessages((prev) => [...prev, userMsg]);
    setPending(true);
    setStreamingText("");

    try {
      let accumulatedText = "";
      for await (const ev of sse(`/v1/train/sessions/${sid}/messages`, {
        text: scrubbed.text,
        clientMsgId,
      })) {
        if (ev.event === "token") {
          accumulatedText += ev.data.delta || "";
          setStreamingText(accumulatedText);
        } else if (ev.event === "state") {
          setTension(ev.data.tension ?? 0);
        } else if (ev.event === "message_end") {
          const scammerMsg: ChatMessage = {
            i: ev.data.i,
            role: ev.data.role,
            text: ev.data.text || accumulatedText,
            ts: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, scammerMsg]);
          setStreamingText("");
        } else if (ev.event === "session_end") {
          const outcome = ev.data.outcome;
          setEndingNotice(`Sensei is reviewing... Outcome: ${outcome.replace("_", " ").toUpperCase()}`);
          setTimeout(() => {
            router.push(`/train/debrief?sid=${sid}`);
          }, 1200);
        }
      }
    } catch (err: any) {
      setError(err.message || "Connection to adversary interrupted");
    } finally {
      setPending(false);
      setStreamingText("");
    }
  };

  const handleHangUpConfirm = async () => {
    if (!sid) return;
    setHangUpOpen(false);
    setEndingNotice("Ending drill and preparing Sensei debrief...");
    try {
      await api(`/v1/train/sessions/${sid}/end`, {
        method: "POST",
        json: { reason: "walked_away" },
      });
      router.push(`/train/debrief?sid=${sid}`);
    } catch {
      router.push(`/train/debrief?sid=${sid}`);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        <p className="text-xs">Connecting to Tatami session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-4">
        <div className="text-rose-500 font-bold text-sm">Session Error</div>
        <p className="text-xs text-[var(--text-muted)]">{error || "Session not found."}</p>
        <button
          onClick={() => router.push("/train")}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold cursor-pointer"
        >
          Return to Scenario Picker
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] min-h-[500px]">
      {/* Top Session Bar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[var(--text)] line-clamp-1">
            {session.scenario.title}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">
            Diff {session.difficulty}/5
          </span>
        </div>

        <button
          onClick={() => setHangUpOpen(true)}
          disabled={pending}
          aria-label="Hang up or leave scenario"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--beni)] hover:bg-rose-500/10 border border-rose-500/20 cursor-pointer transition-colors shrink-0"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>Hang Up</span>
        </button>
      </div>

      {/* Pressure Meter */}
      <div className="mb-3">
        <PressureMeter tension={tension} />
      </div>

      {/* Main Channel Stage */}
      <ChannelSkin scenario={session.scenario} channel={session.scenario.channel}>
        {/* Messages Stream Container */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 overscroll-contain"
        >
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} message={msg} />
          ))}

          {/* Streaming token bubble */}
          {streamingText && (
            <ChatBubble
              message={{
                i: messages.length + 1,
                role: "scammer",
                text: streamingText,
                ts: "",
              }}
              streaming
            />
          )}

          {/* Pending adversary thinking state */}
          {pending && !streamingText && (
            <div className="flex items-center gap-2 p-3 text-xs text-[var(--text-muted)] italic">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
              <span>Adversary is calculating next pressure move...</span>
            </div>
          )}

          {/* Ending interstitial */}
          {endingNotice && (
            <div className="my-4 p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-center text-xs font-bold text-[var(--accent)] animate-pulse">
              {endingNotice}
            </div>
          )}
        </div>

        {/* Quick Replies chips */}
        <QuickReplies
          onSelect={(reply) => handleSendMessage(reply)}
          disabled={pending || Boolean(endingNotice)}
        />

        {/* Composer */}
        <Composer
          onSend={handleSendMessage}
          pending={pending}
          disabled={Boolean(endingNotice)}
        />
      </ChannelSkin>

      {/* Hang Up Confirmation Sheet */}
      <HangUpModal
        isOpen={hangUpOpen}
        onConfirm={handleHangUpConfirm}
        onCancel={() => setHangUpOpen(false)}
      />
    </div>
  );
}

export default function TrainPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <TrainPlayContent />
    </Suspense>
  );
}
