/**
 * Type definitions for Scam Dojo frontend.
 * Matches API contract in docs/6.api-contract.md.
 */

export type Lang = "en" | "hi";
export type Belt = "white" | "yellow" | "orange" | "green" | "blue" | "brown" | "black";
export type Tactic = "urgency" | "authority" | "fear" | "greed" | "trust" | "isolation";
export type Channel = "sms" | "chat" | "phone_sms" | "email" | "call";

export interface Scenario {
  slug: string;
  custom: boolean;
  title: string;
  blurb: string;
  scamType: string;
  channel: Channel;
  difficultyRange: [number, number];
  estMinutes: number;
  minBelt: Belt;
  locked: boolean;
  lockedReason?: string;
  bestScore?: number;
  timesCompleted: number;
  recommended?: boolean;
}

export interface ChatMessage {
  i: number;
  role: "scammer" | "user" | "sensei";
  text: string;
  ts: string;
  piiRemoved?: string[];
}

export interface ScenarioInfo {
  slug: string;
  title: string;
  channel: Channel;
  personaName: string;
  orgLabel: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  scenario: ScenarioInfo;
  difficulty: number;
  maxUserTurns: number;
  tension: number;
  stage: string;
  messages: ChatMessage[];
  startedAt: string;
}

export interface StateData {
  turn: number;
  tension: number;
  stage: string;
  status: "active" | "ending";
}

export interface AckData {
  i: number;
  text: string;
  piiRemoved: string[];
}

export interface MessageEndData {
  i: number;
  text: string;
  role: "scammer" | "sensei";
}

export interface SessionEndData {
  outcome: "user_won" | "user_fell" | "max_turns" | "walked_away";
  reason: string;
}

export interface ReplayMoment {
  turnIndex: number;
  scammerLine: string;
  userLine?: string | null;
  result: "landed" | "blocked" | "neutral";
  tactic: Tactic;
  whatHappened: string;
  betterReply?: string | null;
}

export interface Debrief {
  headline: string;
  summary: string;
  moments: ReplayMoment[];
  tacticsFelt: Partial<Record<Tactic, number>>;
  lessons: string[];
  nextDrillSlug: string;
  nextDrillReason: string;
  scoreAdjustment: number;
  adjustmentReason?: string | null;
}

export interface ScoreBreakdown {
  final: number;
  outcomePoints: number;
  flagPoints: number;
  verifyPoints: number;
  dataPoints: number;
  coachAdj: number;
}

export interface EndSessionResponse {
  sessionId: string;
  outcome: "user_won" | "user_fell" | "walked_away" | "max_turns";
  score: ScoreBreakdown;
  resilience: { before: number; after: number };
  belt: { before: Belt; after: Belt; changed: boolean; progress: number };
  debrief: Debrief;
  degraded: boolean;
  nextDrill: { slug: string; reason: string };
  streak: { current: number; best: number };
}

export interface TrainSessionDetail {
  sessionId: string;
  scenario: ScenarioInfo;
  status: "active" | "ended";
  difficulty: number;
  tension: number;
  stage: string;
  turnCount: number;
  messages: ChatMessage[];
  outcome?: string;
  end?: EndSessionResponse;
}
