import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PressureMeter } from "@/components/train/PressureMeter";
import { StrikeMarker } from "@/components/train/StrikeMarker";
import { Belt } from "@/components/train/Belt";
import { ScoreNumeral } from "@/components/train/ScoreNumeral";
import { PiiNotice } from "@/components/train/PiiNotice";
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
});
