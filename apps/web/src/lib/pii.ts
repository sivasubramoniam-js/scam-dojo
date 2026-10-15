/**
 * Client-side PII scrubber.
 * Mirrors server logic for immediate UI masking and privacy awareness.
 * Follows docs/2.frontend.md §6.
 */

export function luhnChecksumValid(numStr: string): boolean {
  const digits = numStr.replace(/\D/g, "").split("").map(Number);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  const reversed = [...digits].reverse();
  for (let i = 0; i < reversed.length; i++) {
    let d = reversed[i];
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

export function normalizeDevanagariDigits(text: string): string {
  return text.replace(/[०-९]/g, (match) => DEVANAGARI_DIGITS[match] || match);
}

export interface ClientScrubResult {
  text: string;
  found: string[];
}

export function scrubClientText(rawText: string): ClientScrubResult {
  if (!rawText) return { text: "", found: [] };

  let text = normalizeDevanagariDigits(rawText);
  const found = new Set<string>();

  // 1. CVV context
  text = text.replace(
    /((?:\b(?:cvv|cvc|security[- ]code)\b).{1,40}?)\b(\d{3,4})\b/gi,
    (_, prefix) => {
      found.add("cvv");
      return `${prefix}[CVV]`;
    }
  );

  // 2. PIN context
  text = text.replace(
    /((?:\b(?:upi[- ]pin|mpin|atm[- ]pin|pin)\b|पिन).{1,40}?)\b(\d{4,6})\b/gi,
    (_, prefix) => {
      found.add("pin");
      return `${prefix}[PIN]`;
    }
  );

  // 3. OTP context
  text = text.replace(
    /((?:\b(?:otp|code|one[- ]time[- ]password)\b|ओटीपी|कोड).{1,40}?)\b(\d{4,8})\b/gi,
    (_, prefix) => {
      found.add("otp");
      return `${prefix}[OTP]`;
    }
  );

  // 4. Cards passing Luhn
  text = text.replace(/\b(?:\d[ -]?){13,19}\b/g, (match) => {
    const clean = match.replace(/[\s-]/g, "");
    if (luhnChecksumValid(clean)) {
      found.add("card");
      return "[CARD]";
    }
    return match;
  });

  // 5. Aadhaar
  text = text.replace(/\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g, () => {
    found.add("aadhaar");
    return "[AADHAAR]";
  });

  // 6. PAN
  text = text.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, () => {
    found.add("pan");
    return "[PAN]";
  });

  // 7. UPI (excluding standard email domains)
  text = text.replace(
    /\b([a-zA-Z0-9._\-]{2,}@(?!(?:gmail|yahoo|hotmail|outlook)\b)[a-zA-Z]{2,})\b/g,
    () => {
      found.add("upi");
      return "[UPI]";
    }
  );

  // 8. Phone
  text = text.replace(/\b(?:\+?91[\s-]?)?([6-9]\d{9})\b/g, () => {
    found.add("phone");
    return "[PHONE]";
  });

  return {
    text,
    found: Array.from(found),
  };
}

export const scrubPii = scrubClientText;

