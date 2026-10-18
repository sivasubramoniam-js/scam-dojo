import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { ScrollToTop } from "@/components/common/ScrollToTop";

function TestNavigationComponent() {
  const navigate = useNavigate();
  return (
    <div>
      <button onClick={() => navigate("/train")}>Go to Train</button>
      <button onClick={() => navigate("/recover")}>Go to Recover</button>
    </div>
  );
}

describe("ScrollToTop component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    document.documentElement.scrollTop = 500;
    document.body.scrollTop = 500;
  });

  it("calls window.scrollTo and resets scrollTop to 0 on initial mount", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollToTop />
      </MemoryRouter>
    );

    expect(window.scrollTo).toHaveBeenCalled();
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  it("calls window.scrollTo(0, 0) whenever route pathname changes", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollToTop />
        <TestNavigationComponent />
      </MemoryRouter>
    );

    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    act(() => {
      getByText("Go to Train").click();
    });

    expect(window.scrollTo).toHaveBeenCalledTimes(2);

    act(() => {
      getByText("Go to Recover").click();
    });

    expect(window.scrollTo).toHaveBeenCalledTimes(3);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });
});
