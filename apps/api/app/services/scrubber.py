"""Authoritative PII scrubber for user inputs."""

import re
from dataclasses import dataclass
from typing import Literal

DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


@dataclass
class ScrubResult:
    text: str
    found: list[str]
    redactions: int

    @property
    def found_types(self) -> list[str]:
        return self.found


def luhn_checksum_valid(card_number_str: str) -> bool:
    digits = [int(c) for c in card_number_str if c.isdigit()]
    if not (13 <= len(digits) <= 19):
        return False
    # Luhn algorithm
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = d * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += d
    return checksum % 10 == 0


class PiiScrubber:
    # Patterns
    AADHAAR_REGEX = re.compile(r"\b([2-9]\d{3}\s?\d{4}\s?\d{4})\b")
    PAN_REGEX = re.compile(r"\b([A-Z]{5}\d{4}[A-Z])\b")
    PHONE_REGEX = re.compile(r"\b(?:\+?91[\s-]?)?([6-9]\d{9})\b")
    # Email detection (used to avoid confusing UPI with email)
    EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
    # UPI IDs: user@bankhandle (e.g. name@okaxis, user@fakebank) where handle does NOT have a dot
    UPI_REGEX = re.compile(r"\b([A-Za-z0-9._\-]{2,}@(?!(?:gmail|yahoo|hotmail|outlook)\b)[A-Za-z]{2,})\b")

    # Potential credit/debit card sequences (13 to 19 digits)
    CARD_CANDIDATE_REGEX = re.compile(r"\b(?:\d[ -]?){13,19}\b")

    # Sensitive Contextual Numbers: OTP, PIN, CVV
    # Matches keyword + up to 40 chars + number, replaces number with placeholder
    OTP_CONTEXT_REGEX = re.compile(
        r"(?i)((?:\b(?:otp|code|one[- ]time[- ]password)\b|ओटीपी|कोड).{1,40}?)\b(\d{4,8})\b"
    )
    PIN_CONTEXT_REGEX = re.compile(
        r"(?i)((?:\b(?:upi[- ]pin|mpin|atm[- ]pin|security[- ]pin|pin)\b|पिन).{1,40}?)\b(\d{4,6})\b"
    )
    CVV_CONTEXT_REGEX = re.compile(
        r"(?i)(\b(?:cvv|cvc|security[- ]code)\b.{1,40}?)\b(\d{3,4})\b"
    )

    @classmethod
    def normalize_digits(cls, text: str) -> str:
        return text.translate(DEVANAGARI_DIGITS)

    @classmethod
    def scrub(
        cls,
        text: str,
        *,
        mode: Literal["train", "store"] = "train",
    ) -> ScrubResult:
        if not text:
            return ScrubResult(text="", found=[], redactions=0)

        normalized = cls.normalize_digits(text)
        found: set[str] = set()
        redactions = 0

        # 1. Check CVV
        def replace_cvv(match: re.Match[str]) -> str:
            nonlocal redactions
            found.add("cvv")
            redactions += 1
            return match.group(1) + "[CVV]"

        normalized = cls.CVV_CONTEXT_REGEX.sub(replace_cvv, normalized)

        # 2. Check PIN
        def replace_pin(match: re.Match[str]) -> str:
            nonlocal redactions
            found.add("pin")
            redactions += 1
            return match.group(1) + "[PIN]"

        normalized = cls.PIN_CONTEXT_REGEX.sub(replace_pin, normalized)

        # 3. Check OTP
        def replace_otp(match: re.Match[str]) -> str:
            nonlocal redactions
            found.add("otp")
            redactions += 1
            return match.group(1) + "[OTP]"

        normalized = cls.OTP_CONTEXT_REGEX.sub(replace_otp, normalized)

        # 4. Check Cards (with Luhn validation to avoid false positives like order IDs or amounts)
        def replace_card(match: re.Match[str]) -> str:
            nonlocal redactions
            candidate = match.group(0).replace(" ", "").replace("-", "")
            if luhn_checksum_valid(candidate):
                found.add("card")
                redactions += 1
                return "[CARD]"
            return match.group(0)

        normalized = cls.CARD_CANDIDATE_REGEX.sub(replace_card, normalized)

        # 5. Check Aadhaar
        def replace_aadhaar(match: re.Match[str]) -> str:
            nonlocal redactions
            found.add("aadhaar")
            redactions += 1
            return "[AADHAAR]"

        normalized = cls.AADHAAR_REGEX.sub(replace_aadhaar, normalized)

        # 6. Check PAN
        def replace_pan(match: re.Match[str]) -> str:
            nonlocal redactions
            found.add("pan")
            redactions += 1
            return "[PAN]"

        normalized = cls.PAN_REGEX.sub(replace_pan, normalized)

        # 7. Check Indian Mobile Phones
        def replace_phone(match: re.Match[str]) -> str:
            nonlocal redactions
            found.add("phone")
            redactions += 1
            return "[PHONE]"

        normalized = cls.PHONE_REGEX.sub(replace_phone, normalized)

        # 8. Check Emails if in store mode
        if mode == "store":
            def replace_email(match: re.Match[str]) -> str:
                nonlocal redactions
                found.add("email")
                redactions += 1
                return "[EMAIL]"

            normalized = cls.EMAIL_REGEX.sub(replace_email, normalized)

        # 9. Check UPI IDs
        def replace_upi(match: re.Match[str]) -> str:
            nonlocal redactions
            found.add("upi")
            redactions += 1
            return "[UPI]"

        normalized = cls.UPI_REGEX.sub(replace_upi, normalized)

        # In store mode, truncate preview to 500 chars
        if mode == "store" and len(normalized) > 500:
            normalized = normalized[:500] + "..."

        return ScrubResult(
            text=normalized,
            found=sorted(found),
            redactions=redactions,
        )


scrubber = PiiScrubber()
