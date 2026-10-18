"""Comprehensive unit tests for the PII scrubber."""

from app.services.scrubber import PiiScrubber, luhn_checksum_valid


def test_luhn_algorithm() -> None:
    # Valid Visa card numbers
    assert luhn_checksum_valid("4532015112830366") is True
    # Invalid card number
    assert luhn_checksum_valid("4532015112830367") is False
    # Not enough digits
    assert luhn_checksum_valid("12345") is False


def test_scrub_aadhaar() -> None:
    text = "My Aadhaar number is 5489 1234 5678, please verify."
    res = PiiScrubber.scrub(text, mode="train")
    assert "[AADHAAR]" in res.text
    assert "5489 1234 5678" not in res.text
    assert "aadhaar" in res.found
    assert res.redactions == 1


def test_scrub_pan() -> None:
    text = "Here is my PAN card ABCDE1234F for taxation."
    res = PiiScrubber.scrub(text, mode="train")
    assert "[PAN]" in res.text
    assert "ABCDE1234F" not in res.text
    assert "pan" in res.found


def test_scrub_phone() -> None:
    text = "Call me at +91 9876543210 or 8765432109 tomorrow."
    res = PiiScrubber.scrub(text, mode="train")
    assert "[PHONE]" in res.text
    assert "9876543210" not in res.text
    assert "8765432109" not in res.text
    assert "phone" in res.found
    assert res.redactions == 2


def test_scrub_upi() -> None:
    text = "Send refund to rohit.sharma@okaxis or priya@fakebank."
    res = PiiScrubber.scrub(text, mode="train")
    assert "[UPI]" in res.text
    assert "rohit.sharma@okaxis" not in res.text
    assert "priya@fakebank" not in res.text
    assert "upi" in res.found


def test_scrub_otp_with_keywords() -> None:
    text = "Your OTP is 482190 to complete login."
    res = PiiScrubber.scrub(text, mode="train")
    assert "[OTP]" in res.text
    assert "482190" not in res.text
    assert "otp" in res.found


def test_scrub_pin_with_keywords() -> None:
    text = "Enter your UPI PIN: 654321 now."
    res = PiiScrubber.scrub(text, mode="train")
    assert "[PIN]" in res.text
    assert "654321" not in res.text
    assert "pin" in res.found


def test_scrub_cvv() -> None:
    text = "Card cvv is 982 on the back."
    res = PiiScrubber.scrub(text, mode="train")
    assert "[CVV]" in res.text
    assert "982" not in res.text
    assert "cvv" in res.found


def test_scrub_hindi_and_devanagari_digits() -> None:
    text = "आपका ओटीपी है ४८२१९०"
    res = PiiScrubber.scrub(text, mode="train")
    assert "[OTP]" in res.text
    assert "४८२१९०" not in res.text
    assert "otp" in res.found


def test_no_false_positive_on_amounts_and_years() -> None:
    text = "I ordered 2 items worth ₹2,500 in the year 2026."
    res = PiiScrubber.scrub(text, mode="train")
    assert "₹2,500" in res.text
    assert "2026" in res.text
    assert res.redactions == 0
    assert len(res.found) == 0


def test_scrub_store_mode_email_and_truncation() -> None:
    text = "Contact support@example.com for further inquiries."
    res = PiiScrubber.scrub(text, mode="store")
    assert "[EMAIL]" in res.text
    assert "support@example.com" not in res.text
    assert "email" in res.found


def test_valid_credit_card() -> None:
    # Valid test card that passes Luhn
    text = "Payment details 4532 0151 1283 0366 submitted"
    res = PiiScrubber.scrub(text, mode="train")
    assert "[CARD]" in res.text
    assert "4532 0151 1283 0366" not in res.text
    assert "card" in res.found
