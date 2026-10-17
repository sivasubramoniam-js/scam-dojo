import { describe, it, expect, vi, beforeEach } from "vitest";
import { ringtoneEngine } from "@/lib/ringtone";

describe("Web Audio Ringtone Engine", () => {
  beforeEach(() => {
    ringtoneEngine.stop();
  });

  it("handles startIncomingRingtone and stop gracefully", () => {
    ringtoneEngine.startIncomingRingtone(1.0);
    expect(ringtoneEngine.getIsPlaying()).toBe(true);

    ringtoneEngine.stop();
    expect(ringtoneEngine.getIsPlaying()).toBe(false);
  });

  it("supports muting and unmuting", () => {
    ringtoneEngine.setMuted(true);
    expect(ringtoneEngine.getIsMuted()).toBe(true);

    ringtoneEngine.setMuted(false);
    expect(ringtoneEngine.getIsMuted()).toBe(false);
  });

  it("triggers playPowerDownSound and playAirplaneModeSound safely", () => {
    expect(() => ringtoneEngine.playPowerDownSound()).not.toThrow();
    expect(() => ringtoneEngine.playAirplaneModeSound()).not.toThrow();
    expect(() => ringtoneEngine.playDisconnectTone()).not.toThrow();
  });
});
