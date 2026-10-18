"""Unit tests for safety distress detection and scammer output filtering."""

from app.services.safety import detect_distress, validate_scammer_output


def test_distress_detection() -> None:
    # English distress phrases
    assert detect_distress("I am really scared right now") is True
    assert detect_distress("I actually sent money to them") is True
    assert detect_distress("Someone is threatening me") is True
    assert detect_distress("Police is outside my house please help") is True

    # Hindi distress phrases
    assert detect_distress("Main dar gaya hoon sir") is True
    assert detect_distress("Mere paise kat gaye") is True
    assert detect_distress("Kya yeh sach hai please batao") is True

    # Normal roleplay messages
    assert detect_distress("No I will not share my OTP with you") is False
    assert detect_distress("Who are you and which branch do you work in?") is False
    assert detect_distress("I will check my bank app directly") is False


def test_scammer_output_validation() -> None:
    # Valid fictional responses
    valid_text = "Sir, visit orion-kyc.example to update or contact +91 00000 00000 or pay via kyc.desk@fakebank."
    ok, _ = validate_scammer_output(valid_text)
    assert ok is True

    # Sensei break is always valid
    sensei_text = "[Sensei] This is a practice scenario. Everything is simulated."
    ok, _ = validate_scammer_output(sensei_text)
    assert ok is True

    # Reject real phone numbers (e.g. standard 10 digit starting with 9)
    bad_phone = "Please call our manager at +91 9876543210 immediately."
    ok, reason = validate_scammer_output(bad_phone)
    assert ok is False
    assert "real-looking phone number" in reason

    # Reject non-.example URLs
    bad_url = "Download the update from https://orion-bank-support.com/update immediately."
    ok, reason = validate_scammer_output(bad_url)
    assert ok is False
    assert "non-.example URL" in reason

    # Reject real UPI handles
    bad_upi = "Transfer the verification deposit to verify@okhdfcbank."
    ok, reason = validate_scammer_output(bad_upi)
    assert ok is False
    assert "non-@fakebank UPI" in reason

    # Reject AI self-awareness / simulation disclosure outside Sensei break
    bad_ai = "As an AI language model, I cannot fulfill this request."
    ok, reason = validate_scammer_output(bad_ai)
    assert ok is False
    assert "simulation" in reason.lower() or "ai" in reason.lower()


def test_scammer_output_validation_with_realistic_fake_entities() -> None:
    fake_entities = {
        "phone": "+91 98712 43901",
        "link": "http://sbi-netbanking-verify.in/kyc",
        "upi": "sbi.verification@gmall.com",
        "email": "cbi.investigation-cell@gmall.com",
        "employee_id": "Sub-Inspector Arjun Rao, Badge #DL-8842-CY",
    }
    realistic_text = (
        "This is Sub-Inspector Arjun Rao, Badge #DL-8842-CY. Call +91 98712 43901 or "
        "verify at http://sbi-netbanking-verify.in/kyc and transfer to sbi.verification@gmall.com."
    )
    ok, reason = validate_scammer_output(realistic_text, fake_entities=fake_entities)
    assert ok is True
    assert not reason
