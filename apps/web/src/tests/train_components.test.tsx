import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PressureMeter } from "@/components/train/PressureMeter";
import { StrikeMarker } from "@/components/train/StrikeMarker";
import { Belt } from "@/components/train/Belt";
import { ScoreNumeral } from "@/components/train/ScoreNumeral";
import { PiiNotice } from "@/components/train/PiiNotice";
import { AudioCallStage } from "@/components/train/AudioCallStage";
import { VideoCallStage } from "@/components/train/VideoCallStage";
import { EmergencyCountermeasures } from "@/components/train/EmergencyCountermeasures";
import { IncomingCallOverlay } from "@/components/train/IncomingCallOverlay";
import { I18nProvider } from "@/lib/i18n";

describe("Train Mode UI Components", () => {
  it("renders PressureMeter with accessibility attributes", () => {
    const { rerender } = render(<PressureMeter tension={2} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByText(/Low/i)).toBeInTheDocument();

    rerender(<PressureMeter tension={5} />);
    expect(meter).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();

    rerender(<PressureMeter tension={8} />);
    expect(meter).toHaveAttribute("aria-valuenow", "8");
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
  });

  it("renders StrikeMarker with icon and text labels", () => {
    const { rerender } = render(<StrikeMarker result="blocked" />);
    expect(screen.getByText("Blocked")).toBeInTheDocument();

    rerender(<StrikeMarker result="landed" />);
    expect(screen.getByText("Landed")).toBeInTheDocument();

    rerender(<StrikeMarker result="neutral" />);
    expect(screen.getByText("Neutral")).toBeInTheDocument();
  });

  it("renders Belt component with knot and progression bar", () => {
    render(<Belt belt="yellow" progress={0.65} />);
    expect(screen.getByText(/yellow Belt/i)).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("renders ScoreNumeral with final value", () => {
    render(<ScoreNumeral value={88} label="Resilience Score" />);
    expect(screen.getByText("Resilience Score")).toBeInTheDocument();
  });

  it("renders PiiNotice banner", () => {
    render(
      <I18nProvider>
        <PiiNotice />
      </I18nProvider>
    );
    expect(screen.getByText(/Privacy Shield Active/i)).toBeInTheDocument();
  });

  it("renders AudioCallStage with caller profile, waveform, and controls", () => {
    render(
      <I18nProvider>
        <AudioCallStage
          callerName="Rakesh Verma"
          callerOrg="Orion Bank Fraud Dept"
          tension={5}
          isSpeaking={false}
          isListening={false}
          isTyping={false}
          aiStatus={null}
          lastScammerText="Please confirm your card number immediately."
          onSendMessage={() => {}}
          onHangUp={() => {}}
          onToggleMic={() => {}}
          isDone={false}
        />
      </I18nProvider>
    );

    expect(screen.getByText("Rakesh Verma")).toBeInTheDocument();
    expect(screen.getByText("Orion Bank Fraud Dept")).toBeInTheDocument();
    expect(screen.getByText(/VOIP PRI ENCRYPTED/i)).toBeInTheDocument();
    expect(screen.getByText(/Hang Up/i)).toBeInTheDocument();
  });

  it("renders VideoCallStage with officer persona, REC badge, and user PiP", () => {
    render(
      <I18nProvider>
        <VideoCallStage
          callerName="Inspector D.A. Togav"
          callerOrg="CBI Cyber Crime Cell"
          tension={8}
          isSpeaking={false}
          isListening={false}
          isTyping={false}
          aiStatus={null}
          lastScammerText="This is a legal summons for immediate digital arrest."
          onSendMessage={() => {}}
          onHangUp={() => {}}
          onToggleMic={() => {}}
          isDone={false}
        />
      </I18nProvider>
    );

    expect(screen.getByText("Inspector D.A. Togav")).toBeInTheDocument();
    expect(screen.getByText("CBI Cyber Crime Cell")).toBeInTheDocument();
    expect(screen.getAllByText(/REC/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Camera Off/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Hang Up/i)).toBeInTheDocument();
  });

  it("selects matching video versions: Police, Customs, or Other (Man) department", () => {
    // 1. Other department (e.g. Electricity Dept) -> Man videos
    const { container: containerOther } = render(
      <I18nProvider>
        <VideoCallStage
          callerName="Officer Rajeshwar Sharma"
          callerOrg="Electricity Dept (simulated)"
          drillSlug="electricity_bill"
          scenarioTitle="Urgent Electricity Bill Disconnection"
          tension={5}
          isSpeaking={false}
          isListening={false}
          isTyping={false}
          aiStatus={null}
          lastScammerText="Your meter payment is pending tonight."
          onSendMessage={() => {}}
          onHangUp={() => {}}
          onToggleMic={() => {}}
          isDone={false}
        />
      </I18nProvider>
    );

    const otherVideos = containerOther.querySelectorAll("video");
    const otherSrcs = Array.from(otherVideos).map((v) => v.getAttribute("src"));
    expect(otherSrcs).toContain("/assets/video/Man-talking.mp4");
    expect(otherSrcs).toContain("/assets/video/Man-listening.mp4");

    // 2. Customs department -> Customs videos
    const { container: containerCustoms } = render(
      <I18nProvider>
        <VideoCallStage
          callerName="Customs Officer K. Mehta"
          callerOrg="Indian Customs Bureau"
          drillSlug="courier_customs"
          scenarioTitle="Customs & Drug Parcel Threat"
          tension={5}
          isSpeaking={false}
          isListening={false}
          isTyping={false}
          aiStatus={null}
          lastScammerText="Contraband found in your FedEx parcel."
          onSendMessage={() => {}}
          onHangUp={() => {}}
          onToggleMic={() => {}}
          isDone={false}
        />
      </I18nProvider>
    );

    const customsVideos = containerCustoms.querySelectorAll("video");
    const customsSrcs = Array.from(customsVideos).map((v) => v.getAttribute("src"));
    expect(customsSrcs).toContain("/assets/video/Customs-talking.mp4");
    expect(customsSrcs).toContain("/assets/video/Customs-listening.mp4");

    // 3. Police department -> Police videos
    const { container: containerPolice } = render(
      <I18nProvider>
        <VideoCallStage
          callerName="Inspector D.A. Togav"
          callerOrg="CBI Cyber Crime Cell"
          drillSlug="digital_arrest_call"
          scenarioTitle="Digital Arrest Video Call"
          tension={7}
          isSpeaking={false}
          isListening={false}
          isTyping={false}
          aiStatus={null}
          lastScammerText="You are under CBI digital arrest."
          onSendMessage={() => {}}
          onHangUp={() => {}}
          onToggleMic={() => {}}
          isDone={false}
        />
      </I18nProvider>
    );

    const policeVideos = containerPolice.querySelectorAll("video");
    const policeSrcs = Array.from(policeVideos).map((v) => v.getAttribute("src"));
    expect(policeSrcs).toContain("/assets/video/Police-talking.mp4");
    expect(policeSrcs).toContain("/assets/video/Police-listening.mp4");
  });

  it("renders EmergencyCountermeasures with Power Off, Airplane Mode, 1930, and Reality Check", () => {
    render(
      <I18nProvider>
        <EmergencyCountermeasures
          onPowerOff={() => {}}
          onAirplaneMode={() => {}}
          onDial1930={() => {}}
          onBlockNumber={() => {}}
          callerName="Inspector Vikram"
          callerOrg="Cyber Crime Wing"
        />
      </I18nProvider>
    );

    expect(screen.getByText("Emergency Panic Neutralizers")).toBeInTheDocument();
    expect(screen.getByText("Power Off Mobile")).toBeInTheDocument();
    expect(screen.getByText("Airplane Mode")).toBeInTheDocument();
    expect(screen.getByText("Dial 1930 Helpline")).toBeInTheDocument();
    expect(screen.getByText("Reality Check")).toBeInTheDocument();
  });

  it("renders IncomingCallOverlay with repeated redialing badge and Answer/Decline buttons", () => {
    render(
      <I18nProvider>
        <IncomingCallOverlay
          callerName="Officer Vikram Rao"
          callerOrg="CBI Investigation Branch"
          callType="video"
          attempt={2}
          onAccept={() => {}}
          onDecline={() => {}}
          onPowerOff={() => {}}
          onAirplaneMode={() => {}}
          onDial1930={() => {}}
          onBlockNumber={() => {}}
        />
      </I18nProvider>
    );

    expect(screen.getByText("Officer Vikram Rao")).toBeInTheDocument();
    expect(screen.getByText("CBI Investigation Branch")).toBeInTheDocument();
    expect(screen.getByText(/RELENTLESS REDIAL · ATTEMPT 2 OF 3/i)).toBeInTheDocument();
    expect(screen.getByText("Accept & Answer")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });
});

