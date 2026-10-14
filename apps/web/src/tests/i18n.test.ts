import { describe, it, expect } from "vitest";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

describe("i18n Key Parity", () => {
  it("en.json and hi.json have identical key sets", () => {
    const enKeys = Object.keys(en).sort();
    const hiKeys = Object.keys(hi).sort();

    expect(enKeys).toEqual(hiKeys);
  });

  it("no translations are empty strings", () => {
    for (const [key, val] of Object.entries(en)) {
      expect(val.trim().length, `Empty English value for key: ${key}`).toBeGreaterThan(0);
    }
    for (const [key, val] of Object.entries(hi)) {
      expect(val.trim().length, `Empty Hindi value for key: ${key}`).toBeGreaterThan(0);
    }
  });
});
