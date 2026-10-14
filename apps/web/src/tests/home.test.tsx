import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import { I18nProvider } from "@/lib/i18n";

describe("HomePage Component", () => {
  it("renders main headings, hero sms and mode tiles", () => {
    render(
      <I18nProvider>
        <HomePage />
      </I18nProvider>
    );

    // Headline
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

    // SMS from ORN-BNK
    expect(screen.getByText("ORN-BNK")).toBeInTheDocument();

    // Mode tiles: Train, Check, Recover
    expect(screen.getByRole("heading", { name: "Train" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recover" })).toBeInTheDocument();
  });
});
