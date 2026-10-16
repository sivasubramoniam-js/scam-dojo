"""Safety filters, distress detection, and scammer output sanitization.

Follows specifications in docs/3.backend.md §5.4.
"""

import re
from typing import Any

DISTRESS_PATTERNS = [
    r"\b(?:scared|terrified|crying|suicidal|hopeless)\b",
    r"\bthis\s+is\s+real\b",
    r"\b(?:actually\s+)?sent\s+(?:money|cash|all\s+my\s+savings|rupees|rs\.?|₹)\b",
    r"\b(?:really\s+)?threatening\s+me\b",
    r"\bpolice\s+(?:is|are)\s+outside\b",
    r"\bplease\s+help\s+me\s+i\s+lost\s+money\b",
    r"\bmain\s+(?:dar\s+gaya|dar\s+raha\s+hoon)\b",
    r"\bmere\s+paise\s+(?:chale\s+gaye|kat\s+gaye|doob\s+gaye)\b",
    r"\bkya\s+yeh\s+sach\s+hai\b",
    r"\bmujhe\s+bachao\b",
]

# Patterns for output filter
REAL_PHONE_PATTERN = re.compile(r"(?:\+91|91)?[6-9]\d{9}\b")
REAL_URL_PATTERN = re.compile(r"https?://(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:/[^\s]*)?")
REAL_UPI_PATTERN = re.compile(r"[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z]{2,}")
AI_SELF_AWARE_PATTERN = re.compile(
    r"\b(?:i\s+am\s+(?:an?\s+)?ai|as\s+an\s+ai|large\s+language\s+model|system\s+prompt|i\s+am\s+a\s+simulation)\b",
    re.IGNORECASE,
)


def detect_distress(text: str) -> bool:
    """Check if the user text indicates genuine distress or confusion with reality."""
    lower = text.lower()
    return any(re.search(pat, lower, re.IGNORECASE) for pat in DISTRESS_PATTERNS)


def validate_scammer_output(text: str, fake_entities: Any = None) -> tuple[bool, str]:
    """Validate scammer text against safety rules.
    
    Allows realistic typo-squatted emails (e.g. @gmall.com), deceptive URLs,
    and scenario-defined contact details when fake_entities is provided.
    Returns (is_valid, reason).
    """
    if text.startswith("[Sensei]"):
        return True, ""

    if AI_SELF_AWARE_PATTERN.search(text):
        return False, "Contains AI self-awareness / simulation disclosure"

    # When running within a live scenario (fake_entities provided), allow realistic deceptive details
    if fake_entities:
        return True, ""

    # Check for real phone numbers (allow fictional +91 00000 00000)
    for match in REAL_PHONE_PATTERN.finditer(text):
        num = match.group(0)
        if "0000000000" not in num and not num.endswith("0000000000"):
            return False, f"Contains real-looking phone number: {num}"

    # Check for URLs: must end with .example
    for match in REAL_URL_PATTERN.finditer(text):
        url = match.group(0).lower()
        domain_part = url.split("://", 1)[1].split("/", 1)[0].split("?", 1)[0]
        if not domain_part.endswith(".example"):
            return False, f"Contains non-.example URL: {url}"

    # Check for UPI IDs: must end with @fakebank
    for match in REAL_UPI_PATTERN.finditer(text):
        upi = match.group(0).lower()
        if not upi.endswith("@fakebank"):
            return False, f"Contains non-@fakebank UPI: {upi}"

    return True, ""
