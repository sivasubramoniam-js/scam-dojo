/**
 * API client for Scam Dojo.
 * Supports token auth, X-Dev-User fallback, and localized error envelopes.
 */

export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "";

import { addTraceEntry } from "./traceStore";

export class ApiError extends Error {
  code: string;
  messageKey?: string;
  retryable: boolean;
  status: number;

  constructor(message: string, code = "error", status = 500, retryable = false, messageKey?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.messageKey = messageKey;
  }
}

export function getLanguage(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("dojo_lang") || "en";
  }
  return "en";
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const lang = getLanguage();
  const headers: Record<string, string> = {
    "Accept-Language": lang,
    "X-Dev-User": "guest",
    ...(init.headers as Record<string, string>),
  };

  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  if (!res.ok) {
    let errJson: any = null;
    try {
      errJson = await res.json();
    } catch {
      // non-JSON response
    }
    const err = errJson?.error;
    throw new ApiError(
      err?.message || `Request failed with status ${res.status}`,
      err?.code || "internal",
      res.status,
      err?.retryable ?? false,
      err?.messageKey
    );
  }

  return (await res.json()) as T;
}

// ==========================================
// Typed Live Backend Services & Schemas
// ==========================================

export interface UserProfile {
  uid: string;
  belt: string;
  resilienceScore: number;
  streakDays: number;
  displayName: string;
  language: string;
}

export interface ScenarioItem {
  slug: string;
  title: string;
  blurb: string;
  scamType: string;
  channel: string;
  difficultyRange: [number, number];
  estMinutes: number;
  minBelt: string;
  locked: boolean;
  lockedReason?: string;
  bestScore?: number;
  timesCompleted: number;
  recommended?: boolean;
  custom?: boolean;
}

export interface ResourceItem {
  id: string;
  name: string;
  category: string;
  contactType: "phone" | "url" | "none";
  contactValue?: string | null;
  description: string;
  whenToUse: string;
  verifiedOn?: string | null;
  sourceUrl: string;
}

export interface RedFlagItem {
  id: number;
  quote: string;
  why: string;
  severity: "low" | "medium" | "high";
  source: string;
}

export interface ScamScoreBreakdown {
  coercion: number;
  financialRisk: number;
  senderSpoof: number;
  remoteAccess: number;
}

export interface UpiPayloadInfo {
  raw: string;
  payeeVpa: string;
  payeeName?: string;
  amount?: string;
  note?: string;
  currency?: string;
  isDebit?: boolean;
}

export interface WebRiskInfo {
  checked: boolean;
  isThreat: boolean;
  threatTypes: string[];
  summary: string;
}

export interface MediaAnalysisInfo {
  mediaType: "image" | "video" | "document";
  fileName?: string;
  mimeType?: string;
  deepfakeDetected?: boolean;
  syntheticConfidence?: number;
  forgeryFlags?: string[];
  summary?: string;
  googleApiUsed?: string;
}

export interface CheckResult {
  checkId: string;
  createdAt: string;
  text: string;
  score: number;
  riskScore: number;
  riskLevel: "safe" | "caution" | "high";
  verdict: "likely_scam" | "suspicious" | "likely_safe" | "cannot_tell";
  title: string;
  oneLine: string;
  explanation: string;
  reasons: string[];
  actions: string[];
  redFlags: RedFlagItem[];
  reassuringSignals: string[];
  doNow: string[];
  dontDo: string[];
  verifyHow?: string;
  alreadyActedHint?: boolean;
  inputTypes: string[];
  resources: ResourceItem[];
  groundingSources?: string[];
  scoreBreakdown?: ScamScoreBreakdown;
  vectorBadges?: string[];
  upiPayload?: UpiPayloadInfo;
  webRisk?: WebRiskInfo;
  mediaAnalysis?: MediaAnalysisInfo;
}

export interface ForgeDrillResult {
  scenarioSlug: string;
  title: string;
  channel: string;
  personaName: string;
  blurb: string;
}

export interface PlanStep {
  id: string;
  phase: "now" | "today" | "this_week" | "protect_next";
  title: string;
  why: string;
  how: string[];
  resources: ResourceItem[];
  draftText?: string;
  draftLabel?: string;
  timeCritical: boolean;
  done: boolean;
}

export interface PlanResult {
  planId: string;
  createdAt: string;
  urgency: "critical" | "high" | "moderate" | "low";
  summary: string;
  steps: PlanStep[];
  whatToExpect: string[];
  evidenceChecklist: string[];
  protectNext: string[];
  suggestedDrill?: { slug: string; title: string };
  disclaimer: string;
  resourcesVerifiedOn: string;
  chat?: Array<{ role: "user" | "assistant"; text: string; ts: string }>;
}

export interface CreatePlanRequest {
  incident: string[];
  timeSince: "just_now" | "within_1h" | "today" | "1_3_days" | "longer";
  moneyLost: boolean;
  amountBand?: string;
  paymentMethod?: string;
  bank?: string;
  notes?: string;
  lang?: string;
}

export interface DashboardResponse {
  me: any;
  trend: Array<{ date: string; score: number; resilience: number; sessionId: string }>;
  tactics: Array<{ tactic: string; label: string; weakness: number }>;
  recommendedDrill?: { slug: string; title: string; reason: string };
  history: Array<{ type: "train" | "check" | "recover"; id: string; ts: string; title: string; badge: string }>;
  checks: { total: number; likelyScam: number };
  recoveries: { total: number; openSteps: number };
}

// ==========================================
// API Operations
// ==========================================

export async function fetchMe(): Promise<UserProfile> {
  const data = await api<any>("/v1/me");
  return {
    uid: data.uid || "guest",
    belt: data.belt || "white",
    resilienceScore: typeof data.resilience === "number" ? data.resilience : (data.resilienceScore ?? 0),
    streakDays: data.streak?.current ?? (data.streakDays ?? 0),
    displayName: data.displayName || "Dojo Student",
    language: data.language || "en",
  };
}

export async function fetchScenarios(lang: string = "en"): Promise<{ items: ScenarioItem[] }> {
  return api<{ items: ScenarioItem[] }>(`/v1/scenarios?lang=${lang}`);
}

export async function fetchResources(
  country: string = "IN",
  category?: string,
  lang: string = "en"
): Promise<{ items: ResourceItem[] }> {
  const q = new URLSearchParams({ country, lang });
  if (category) q.set("category", category);
  return api<{ items: ResourceItem[] }>(`/v1/resources?${q.toString()}`);
}

export async function checkMessage(
  text: string,
  imageBase64?: string,
  lang: string = "en",
  fileName?: string,
  mimeType?: string
): Promise<CheckResult> {
  const res = await api<CheckResult>("/v1/check", {
    method: "POST",
    json: {
      text,
      imageBase64,
      fileBase64: imageBase64,
      fileName,
      mimeType,
      lang,
    },
  });
  addTraceEntry({
    agent: "Threat Analyst",
    model: "gemini-2.5-flash",
    action: "Multimodal Threat Inspection",
    details: `Scanned content. Verdict: **${res.verdict.toUpperCase()}** (Risk score: ${res.riskScore}/100, Level: ${res.riskLevel}) · ${res.title}${res.vectorBadges?.length ? ` · Vectors: ${res.vectorBadges.join(", ")}` : ""}`,
    kind: "output",
  });
  return res;
}

export async function forgeDrillFromCheck(checkId: string): Promise<ForgeDrillResult> {
  const res = await api<ForgeDrillResult>(`/v1/check/${checkId}/to-drill`, {
    method: "POST",
  });
  addTraceEntry({
    agent: "Scenario Forge",
    model: "gemini-2.5-flash",
    action: "Custom Drill Forged",
    details: `Extracted attack patterns into new drill scenario: **${res.title}** (${res.channel.toUpperCase()})`,
    kind: "output",
  });
  return res;
}

export async function createRecoveryPlan(intake: CreatePlanRequest): Promise<PlanResult> {
  const res = await api<PlanResult>("/v1/recover/plans", {
    method: "POST",
    json: intake,
  });
  addTraceEntry({
    agent: "Recovery Planner",
    model: "gemini-2.5-flash",
    action: "Grounded Resource Synthesis",
    details: `Synthesized **${res.urgency.toUpperCase()}** golden-hour plan with ${res.steps?.length || 0} verified actions grounded in Helpline 1930 & RBI rules.`,
    kind: "output",
  });
  return res;
}

export async function getRecoveryPlan(planId: string): Promise<PlanResult> {
  return api<PlanResult>(`/v1/recover/plans/${planId}`);
}

export async function toggleRecoveryStep(planId: string, stepId: string, done: boolean): Promise<any> {
  return api(`/v1/recover/plans/${planId}/steps/${stepId}`, {
    method: "PATCH",
    json: { done },
  });
}

export async function sendRecoveryChatMessage(planId: string | undefined, text: string): Promise<any> {
  const endpoint =
    planId && planId !== "rec_local_fallback" && planId !== "general"
      ? `/v1/recover/plans/${planId}/chat`
      : `/v1/recover/chat`;
  return api(endpoint, {
    method: "POST",
    json: { text },
  });
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  return api<DashboardResponse>("/v1/dashboard");
}

export async function createTrainSession(scenarioSlug: string): Promise<any> {
  const res = await api<any>("/v1/train/sessions", {
    method: "POST",
    json: { scenarioSlug },
  });
  addTraceEntry({
    agent: "Scenario Forge",
    model: "gemini-2.5-flash",
    action: "Drill Initialized",
    details: `Seeded drill session for **${res.scenario?.title || scenarioSlug}** (${res.scenario?.channel?.toUpperCase() || "SIM"}) at ${res.scenario?.belt?.toUpperCase() || "WHITE"} belt.`,
    kind: "start",
  });
  return res;
}

export async function sendTrainMessage(sessionId: string, text: string): Promise<any> {
  return api(`/v1/train/sessions/${sessionId}/messages?stream=false`, {
    method: "POST",
    json: { text },
  });
}

export interface TrainStreamCallbacks {
  onAck?: (ack: { i: number; text: string; piiRemoved: string[] }) => void;
  onTrace?: (trace: { agent?: string; model?: string; summary?: string; kind?: string; latencyMs?: number; payload?: any }) => void;
  onState?: (state: { turn: number; tension: number; stage: string; status: string }) => void;
  onToken?: (delta: string) => void;
  onMessageEnd?: (msg: { i: number; text: string; role: string }) => void;
  onSessionEnd?: (end: { outcome: string; reason?: string }) => void;
  onError?: (err: Error) => void;
}

export async function streamTrainMessage(
  sessionId: string,
  text: string,
  callbacks: TrainStreamCallbacks
): Promise<void> {
  const lang = getLanguage();
  const res = await fetch(`${API_BASE}/v1/train/sessions/${sessionId}/messages?stream=true&trace=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": lang,
      "X-Dev-User": "guest",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    let errJson: any = null;
    try {
      errJson = await res.json();
    } catch {}
    const msg = errJson?.error?.message || `Request failed with status ${res.status}`;
    throw new ApiError(msg, errJson?.error?.code || "internal", res.status);
  }

  if (!res.body) {
    throw new ApiError("Streaming unsupported by browser", "unsupported", 500);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const block of lines) {
      if (!block.trim()) continue;
      const blockLines = block.split("\n");
      let eventType = "message";
      let dataStr = "";

      for (const line of blockLines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          dataStr = line.slice(6).trim();
        }
      }

      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        handleLiveStreamEvent(eventType, parsed, callbacks);
      } catch (e) {
        console.warn("Failed to parse SSE event data:", dataStr, e);
      }
    }
  }

  // Process any trailing block left in buffer
  if (buffer.trim()) {
    const blockLines = buffer.split("\n");
    let eventType = "message";
    let dataStr = "";

    for (const line of blockLines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataStr = line.slice(6).trim();
      }
    }

    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        handleLiveStreamEvent(eventType, parsed, callbacks);
      } catch (e) {
        console.warn("Failed to parse trailing SSE event data:", dataStr, e);
      }
    }
  }
}

function handleLiveStreamEvent(
  eventType: string,
  parsed: any,
  callbacks: TrainStreamCallbacks
): void {
  if (eventType === "ack") {
    callbacks.onAck?.(parsed);
  } else if (eventType === "trace") {
    const tr = parsed;
    const agentName =
      tr.agent === "observer_agent"
        ? "Observer Referee"
        : tr.agent === "scammer_persona"
        ? "Scammer Persona"
        : tr.agent || "Observer Agent";
    addTraceEntry({
      agent: agentName,
      model: tr.model || "gemini-2.5-flash-lite",
      action:
        tr.kind === "output"
          ? "Turn Assessment"
          : tr.kind === "start"
          ? "Turn Analysis Started"
          : tr.summary?.slice(0, 35) || "Agent Action",
      details: tr.summary || JSON.stringify(tr.payload || {}),
      latencyMs: tr.latencyMs,
      kind: tr.kind,
    });
    callbacks.onTrace?.(parsed);
  } else if (eventType === "state") {
    addTraceEntry({
      agent: "Session Runtime",
      model: "gemini-2.5-flash",
      action: `Turn ${parsed.turn} Coercion State`,
      details: `Stage: **${parsed.stage}** · Psychological Tension: **${parsed.tension}/10** · Status: ${parsed.status}`,
      kind: "info",
    });
    callbacks.onState?.(parsed);
  } else if (eventType === "token") {
    callbacks.onToken?.(parsed.delta || "");
  } else if (eventType === "message_end") {
    callbacks.onMessageEnd?.(parsed);
  } else if (eventType === "session_end") {
    addTraceEntry({
      agent: "Observer Referee",
      model: "gemini-2.5-flash",
      action: "Drill Concluded",
      details: `Session Outcome: **${parsed.outcome?.toUpperCase() || "FINALIZED"}**${parsed.reason ? ` — ${parsed.reason}` : ""}`,
      kind: "end",
    });
    callbacks.onSessionEnd?.(parsed);
  }
}

export async function endTrainSession(sessionId: string, outcome: string = "walked_away"): Promise<any> {
  const res = await api<any>(`/v1/train/sessions/${sessionId}/end`, {
    method: "POST",
    json: { outcome },
  });
  addTraceEntry({
    agent: "Observer Referee",
    model: "gemini-2.5-flash",
    action: "Drill Completed",
    details: `Session finalized. Outcome: **${outcome.toUpperCase()}**${res?.score !== undefined ? ` · Score: **${res.score}/100**` : ""}.`,
    kind: "end",
  });
  return res;
}

export async function fetchTrainSessions(): Promise<{ items: any[] }> {
  return api<{ items: any[] }>("/v1/train/sessions");
}
