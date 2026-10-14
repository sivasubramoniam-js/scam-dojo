import { describe, it, expect } from "vitest";
import { scrubClientText, luhnChecksumValid, normalizeDevanagariDigits } from "@/lib/pii";

describe("Client-side PII scrubber", () => {
  it("normalizes devanagari digits", () => {
    expect(normalizeDevanagariDigits("०१२३४५६७८९")).toBe("0123456789");
  });

  it("validates Luhn credit card numbers", () => {
    // Standard test Visa card
    expect(luhnChecksumValid("4532015112830366")).toBe(true);
    // Invalid card
    expect(luhnChecksumValid("4532015112830367")).toBe(false);
  });

  it("scrubs OTP in context", () => {
    const res = scrubClientText("Your OTP is 849201 for verification");
    expect(res.text).toContain("[OTP]");
    expect(res.found).toContain("otp");
  });

  it("scrubs UPI PIN in context", () => {
    const res = scrubClientText("Enter your UPI PIN 4821 to receive money");
    expect(res.text).toContain("[PIN]");
    expect(res.found).toContain("pin");
  });

  it("scrubs CVV in context", () => {
    const res = scrubClientText("My cvv is 849");
    expect(res.text).toContain("[CVV]");
    expect(res.found).toContain("cvv");
  });

  it("scrubs valid credit card sequences", () => {
    const res = scrubClientText("My card is 4532 0151 1283 0366");
    expect(res.text).toContain("[CARD]");
    expect(res.found).toContain("card");
  });

  it("scrubs Aadhaar and PAN", () => {
    const res1 = scrubClientText("My aadhaar 2345 6789 0123");
    expect(res1.text).toContain("[AADHAAR]");
    expect(res1.found).toContain("aadhaar");

    const res2 = scrubClientText("PAN card ABCDE1234F");
    expect(res2.text).toContain("[PAN]");
    expect(res2.found).toContain("pan");
  });

  it("scrubs Indian mobile numbers and UPI addresses", () => {
    const res = scrubClientText("Call me at 9876543210 or pay rakesh@fakebank");
    expect(res.text).toContain("[PHONE]");
    expect(res.text).toContain("[UPI]");
    expect(res.found).toContain("phone");
    expect(res.found).toContain("upi");
  });
});
