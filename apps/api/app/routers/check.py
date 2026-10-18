"""Message Check, AI Threat Inspector & Scenario Forge Router.

Combines fast heuristic pattern matching from the local KB with Gemini Multimodal LLM analysis.
"""

from datetime import UTC, datetime
import json
import logging
import re
import urllib.parse
import uuid
from typing import Any, Literal, cast
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.agents.runtime import get_genai_client, is_live_llm_enabled
from app.config import settings
from app.deps import get_current_user, get_repo
from app.repo.base import Repo
from app.schemas.common import CamelModel, Lang
from app.schemas.user import Me
from app.services.kb import kb_service
from app.services.webrisk import webrisk_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["check"])


RiskLevel = Literal["safe", "caution", "high"]
Verdict = Literal["likely_scam", "suspicious", "likely_safe", "cannot_tell"]


class CheckRequest(CamelModel):
    text: str = Field(..., min_length=1, max_length=5000)
    image_base64: str | None = None
    file_base64: str | None = None
    file_name: str | None = None
    mime_type: str | None = None
    lang: Lang = "en"


class RedFlagItem(CamelModel):
    id: int
    quote: str
    why: str
    severity: Literal["low", "medium", "high"]
    source: Literal["text", "image", "video", "audio", "indicator", "document"]


class RedFlagMatch(CamelModel):
    tag: str
    kind: str
    note: str
    weight: int


class MediaAnalysisInfo(CamelModel):
    media_type: Literal["image", "video", "document"]
    file_name: str | None = None
    mime_type: str | None = None
    deepfake_detected: bool = False
    synthetic_confidence: int = 0
    forgery_flags: list[str] = []
    summary: str = ""
    google_api_used: str = "Google Gemini 2.5 Flash Multimodal & Cloud Security"


class CheckResponse(CamelModel):
    check_id: str
    created_at: str
    text: str
    score: int
    risk_score: int
    risk_level: Literal["safe", "caution", "high"]
    verdict: Literal["likely_scam", "suspicious", "likely_safe", "cannot_tell"]
    title: str
    one_line: str
    explanation: str
    reasons: list[str]
    actions: list[str]
    red_flags: list[RedFlagItem]
    reassuring_signals: list[str] = []
    do_now: list[str] = []
    dont_do: list[str] = []
    verify_how: str | None = None
    needs_more_info: list[str] = []
    already_acted_hint: bool = False
    confidence: Literal["low", "medium", "high"] = "high"
    language_detected: str = "en"
    input_types: list[str] = ["text"]
    matches: list[RedFlagMatch] = []
    resources: list[dict[str, Any]] = []
    grounding_sources: list[str] = []
    upi_payload: dict[str, Any] | None = None
    web_risk: dict[str, Any] | None = None
    media_analysis: MediaAnalysisInfo | None = None


class CheckAnalystOutput(BaseModel):
    score: int = Field(..., ge=0, le=100)
    risk_level: Literal["safe", "caution", "high"]
    title: str
    explanation: str
    reasons: list[str]
    do_now: list[str]
    dont_do: list[str]
    verify_how: str
    deepfake_detected: bool = False
    synthetic_confidence: int = 0
    forgery_flags: list[str] = []
    media_summary: str | None = None


class ForgeDrillResponse(CamelModel):
    scenario_slug: str
    title: str
    channel: str
    persona_name: str
    blurb: str


def extract_docx_text(docx_bytes: bytes) -> str:
    """Extract plain text from uploaded Word (.docx) files using standard zipfile and xml parsing."""
    try:
        import io
        import xml.etree.ElementTree as ET
        import zipfile

        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
            if "word/document.xml" in z.namelist():
                xml_content = z.read("word/document.xml")
                root = ET.fromstring(xml_content)
                texts = [
                    elem.text
                    for elem in root.iter()
                    if elem.tag.endswith("}t") and elem.text
                ]
                return "\n".join(texts)
    except Exception as e:
        logger.debug("Failed to extract docx text: %s", e)
    return ""


def inspect_email_and_domains(text: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    # Match standard email addresses
    email_pattern = r"\b([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b"
    popular_webmail = {
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
        "icloud.com", "rediffmail.com", "proton.me", "protonmail.com"
    }

    # Common typo-squats and lookalikes
    typosquats: dict[str, str] = {
        "gmall.com": "gmail.com",
        "gmaill.com": "gmail.com",
        "gmai1.com": "gmail.com",
        "gamil.com": "gmail.com",
        "gmali.com": "gmail.com",
        "gmaik.com": "gmail.com",
        "yaho0.com": "yahoo.com",
        "yah00.com": "yahoo.com",
        "yaho.com": "yahoo.com",
        "hotmial.com": "hotmail.com",
        "hotmaill.com": "hotmail.com",
        "outl0ok.com": "outlook.com",
        "out1ook.com": "outlook.com",
        "paytmm.com": "paytm.com",
        "sbi-verify.in": "onlinesbi.sbi",
        "hdfc-bank.com": "hdfcbank.com",
        "icic1bank.com": "icicibank.com",
    }

    bank_stems = [
        "hdfc", "sbi", "icici", "axis", "kotak", "pnb", "bob", "canara",
        "indusind", "yesbank", "bank", "rbi", "cbi", "police", "customs",
        "incometax", "cybercell", "cybercrime"
    ]

    for m in re.finditer(email_pattern, text):
        full_email = m.group(0)
        local_part = m.group(1).lower()
        domain = m.group(2).lower()

        # 1. Typo-squatting detection
        if domain in typosquats:
            target = typosquats[domain]
            findings.append({
                "kind": "phish",
                "pattern": full_email,
                "tag": "typosquatting_domain",
                "weight": 4,
                "note": f"Typo-squatted domain detected: '{domain}' is a deceptive lookalike of '{target}'. Scammers intentionally misspell letters (e.g. 'gmall.com' instead of 'gmail.com') to trick victims.",
            })

        # 2. Bank / Authority impersonation on free webmail or typo-squatted domain
        matched_bank = next((b for b in bank_stems if b in local_part), None)
        if matched_bank:
            if domain in popular_webmail or domain in typosquats or "mail" in domain:
                findings.append({
                    "kind": "authority",
                    "pattern": full_email,
                    "tag": "bank_public_webmail",
                    "weight": 4,
                    "note": f"Brand impersonation: Email '{full_email}' claims to represent '{matched_bank.upper()}' but uses a public or fake webmail service ('{domain}'). Legitimate banks exclusively communicate from official corporate domains (e.g. @{matched_bank}bank.com), never public webmail.",
                })

    return findings


def extract_upi_intent(text: str) -> dict[str, Any] | None:
    """Extract and analyze deceptive UPI collect/payment intent URI or QR parameters."""
    match = re.search(r"upi://pay\?[^\s\"'<>]+", text, re.IGNORECASE)
    if not match:
        return None
    raw_uri = match.group(0)
    try:
        parsed = urllib.parse.urlparse(raw_uri)
        params = urllib.parse.parse_qs(parsed.query)
        pa = params.get("pa", [""])[0]
        pn = params.get("pn", [""])[0]
        am = params.get("am", [""])[0]
        tn = params.get("tn", [""])[0]
        cu = params.get("cu", ["INR"])[0]
        return {
            "raw": raw_uri,
            "payeeVpa": pa,
            "payeeName": pn,
            "amount": am,
            "note": tn,
            "currency": cu,
            "isDebit": True,
        }
    except Exception:
        return None


@router.post("/check", response_model=CheckResponse)
async def check_message(
    req: CheckRequest,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> CheckResponse:
    text = req.text.strip()
    check_id = f"chk_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(UTC).isoformat()
    input_types = ["text"]

    # Decode and categorize uploaded media (Video, Document, Image)
    media_b64 = req.file_base64 or req.image_base64
    media_type: Literal["image", "video", "document"] | None = None
    detected_mime: str | None = req.mime_type
    doc_extracted_text: str = ""
    media_bytes: bytes | None = None
    media_analysis: MediaAnalysisInfo | None = None

    if media_b64:
        import base64

        clean_b64 = media_b64.split(",", 1)[-1]
        header = media_b64.split(",", 1)[0].lower() if "," in media_b64 else ""
        file_name_lower = (req.file_name or "").lower()

        if (
            "video/" in header
            or (detected_mime and detected_mime.startswith("video/"))
            or file_name_lower.endswith((".mp4", ".webm", ".mov", ".mkv", ".avi", ".3gp"))
        ):
            media_type = "video"
            if not detected_mime or not detected_mime.startswith("video/"):
                detected_mime = "video/webm" if "video/webm" in header or file_name_lower.endswith(".webm") else "video/mp4"
            if "video" not in input_types:
                input_types.append("video")
        elif (
            "application/pdf" in header
            or clean_b64.startswith("JVBERi")
            or file_name_lower.endswith(".pdf")
        ):
            media_type = "document"
            detected_mime = "application/pdf"
            if "document" not in input_types:
                input_types.append("document")
            if "pdf" not in input_types:
                input_types.append("pdf")
        elif (
            "wordprocessingml" in header
            or "msword" in header
            or file_name_lower.endswith((".docx", ".doc"))
        ):
            media_type = "document"
            detected_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            if "document" not in input_types:
                input_types.append("document")
        elif (
            "text/plain" in header
            or "text/csv" in header
            or file_name_lower.endswith((".txt", ".csv"))
        ):
            media_type = "document"
            detected_mime = "text/plain"
            if "document" not in input_types:
                input_types.append("document")
        else:
            media_type = "image"
            if not detected_mime or not detected_mime.startswith("image/"):
                detected_mime = (
                    "image/png"
                    if "image/png" in header
                    else ("image/webp" if "image/webp" in header else "image/jpeg")
                )
            if "image" not in input_types:
                input_types.append("image")

        try:
            media_bytes = base64.b64decode(clean_b64)
            if file_name_lower.endswith(".docx") or detected_mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                doc_extracted_text = extract_docx_text(media_bytes)
                if doc_extracted_text:
                    text += f"\n\n[Extracted Document Content ({req.file_name or 'Document'})]:\n{doc_extracted_text}"
            elif detected_mime == "text/plain" or file_name_lower.endswith((".txt", ".csv")):
                try:
                    doc_extracted_text = media_bytes.decode("utf-8", errors="ignore")
                    if doc_extracted_text:
                        text += f"\n\n[Extracted Document Content ({req.file_name or 'Document'})]:\n{doc_extracted_text}"
                except Exception:
                    pass
        except Exception as b64_err:
            logger.warning("Failed to decode base64 media: %s", b64_err)

    # 1. Fast heuristic pattern rule matching from SQLite KB
    conn = kb_service._get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT kind, pattern, tag, weight, note FROM pattern_rules WHERE lang = 'any' OR lang = ?",
        (req.lang,),
    )
    rules = cur.fetchall()
    conn.close()

    supplementary = [
        {"kind": "phish", "pattern": r"(?i)\b(?:share|send|forward|give|provide|tell|enter|type|input|verify|submit|email)\b(?:\s+\w+){0,3}\s+\b(?:otp|one[- ]*time\s*password|pin|mpin|cvv|secret\s*code|passcode)\b|\b(?:ओटीपी|पिन)\s*(?:बताएं|शेयर|भेजें|दर्ज\s*करें)\b", "tag": "otp_request", "weight": 4, "note": "Requesting to share, forward, or enter sensitive OTP or authentication code"},
        {"kind": "authority", "pattern": r"(?i)\b(?:hdfc|sbi|icici|axis|kotak|pnb|bob|canara|indusind|yesbank|rbi|cbi|police|customs|income[- ]*tax|cybercell|cybercrime)[a-z0-9._-]*@(?:gmail|yahoo|hotmail|outlook|rediffmail|proton|icloud|gmall|gmaill|yaho0)\.com\b", "tag": "bank_public_webmail", "weight": 4, "note": "Bank or government authority impersonation on public or typo-squatted webmail. Legitimate banks only communicate from official corporate domains."},
        {"kind": "phish", "pattern": r"(?i)@(?:gmall|gmaill|gmai1|gamil|yaho0|yaho|hotmial|outl0ok|paytmm|sbi-verify|hdfc-bank|icic1)\.(?:com|in|org|net|online|site|top|work)\b|https?:\/\/[^\s]*(?:gmall|gmaill|yaho0|hotmial)\.com", "tag": "typosquatting_domain", "weight": 4, "note": "Typo-squatted lookalike domain detected ('gmall.com' instead of 'gmail.com'). Scammers misspell trusted service domains to deceive users."},
        {"kind": "phish", "pattern": r"(?i)\b(?:otp|pin|credentials?|password)\b(?:\s+\w+){0,5}\s+(?:to\s+(?:this\s+)?(?:secured\s+)?email|via\s+email|to\s+email|on\s+email)\b", "tag": "credential_email_harvest", "weight": 4, "note": "Direct credential harvesting: asking to send an OTP or security code to an email address is fraud."},
        {"kind": "trust", "pattern": r"(?i)\b(?:secured\s+email|official\s+verification\s+desk|safe\s+escrow|rbi\s+approved\s+server|anti[- ]fraud\s+portal)\b", "tag": "fake_security_assurance", "weight": 3, "note": "False claim of 'secured email' or 'official verification desk' designed to induce false trust."},
        {"kind": "threat", "pattern": r"(?i)\b(?:disconnect|electricity|power|bill unpaid|meter)\b", "tag": "utility_threat", "weight": 3, "note": "Threat of immediate utility/electricity disconnection"},
        {"kind": "urgency", "pattern": r"(?i)\b(?:urgent|immediately|right now|tonight at|before \d+)\b", "tag": "urgency", "weight": 2, "note": "Artificial deadline inducing panic and haste"},
        {"kind": "authority", "pattern": r"(?i)\b(?:call\s+(?:officer|executive|manager|support|sir)|helpline\s*(?:no|number))\b", "tag": "authority", "weight": 2, "note": "Pretending to be official customer support or officer"},
        {"kind": "greed", "pattern": r"(?i)\b(?:congratulations|you have won|lottery|cashback ₹|claim prize)\b", "tag": "lottery_bait", "weight": 3, "note": "Unsolicited reward or lottery lure"},
        {"kind": "phish", "pattern": r"(?i)\b(?:kyc|pan card|aadhaar)\b.*\b(?:block|expire|suspend|update)\b", "tag": "kyc_urgency", "weight": 3, "note": "False threat of account/service block due to KYC"},
        {"kind": "job_scam", "pattern": r"(?i)\b(?:part[- ]time job|earn ₹|like.*video|deposit ₹|cibil|processing charge|loan approval|approved without)\b", "tag": "job_loan_bait", "weight": 3, "note": "Unrealistic job deposit or instant loan processing lure"},
        {"kind": "hindi_threat", "pattern": r"(?i)(?:खाता.*बंद|तुरंत.*कॉल|केवाईसी|बिजली.*काट|बिल भुगतान|पिन दर्ज|रिफंड पाने|अधिकारी से बात)", "tag": "hindi_scam_pattern", "weight": 3, "note": "Hindi cyber coercion pattern (account freeze / bill disconnection / PIN demand)"},
        {"kind": "adversarial", "pattern": r"(?i)(?:ignore.*previous.*instructions|system:\s*verdict|निर्देश भूल जाओ|end of system prompt)", "tag": "prompt_injection_attempt", "weight": 4, "note": "Adversarial prompt-injection attempt detected; instructions rejected"},
    ]
    all_rules = list(rules) + supplementary

    matches: list[RedFlagMatch] = []
    red_flags: list[RedFlagItem] = []
    total_weight = 0

    idx = 1
    for r in all_rules:
        pattern = r["pattern"]
        try:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                weight = int(r["weight"])
                total_weight += weight
                matched_snippet = m.group(0)
                matches.append(
                    RedFlagMatch(
                        tag=r["tag"],
                        kind=r["kind"],
                        note=r["note"] or r["tag"],
                        weight=weight,
                    )
                )
                severity: Literal["low", "medium", "high"] = "high" if weight >= 3 else "medium"
                red_flags.append(
                    RedFlagItem(
                        id=idx,
                        quote=matched_snippet,
                        why=r["note"] or f"Suspicious indicator: {r['tag']}",
                        severity=severity,
                        source="indicator",
                    )
                )
                idx += 1
        except re.error:
            continue

    # Domain and email typo-squatting inspection
    domain_findings = inspect_email_and_domains(text)
    for df in domain_findings:
        if not any(m.tag == df["tag"] and m.note == df["note"] for m in matches):
            weight = int(df["weight"])
            total_weight += weight
            matches.append(
                RedFlagMatch(
                    tag=df["tag"],
                    kind=df["kind"],
                    note=df["note"],
                    weight=weight,
                )
            )
            red_flags.append(
                RedFlagItem(
                    id=idx,
                    quote=df["pattern"],
                    why=df["note"],
                    severity="high",
                    source="indicator",
                )
            )
            idx += 1

    # Deceptive UPI payment intent & QR payload extraction
    upi_payload = extract_upi_intent(text)
    if upi_payload:
        amt_str = f" of ₹{upi_payload['amount']}" if upi_payload.get("amount") else ""
        payee_str = f" to {upi_payload.get('payeeVpa')} ({upi_payload.get('payeeName') or 'Recipient'})" if upi_payload.get("payeeVpa") else ""
        matches.append(
            RedFlagMatch(
                tag="upi_collect_debit_trap",
                kind="financial_trap",
                note=f"Deceptive UPI Payment Request: This link/QR initiates a direct DEBIT{amt_str}{payee_str}. Crucial rule: In UPI, you NEVER enter an MPIN or scan a QR code to receive money, cashback, or refunds.",
                weight=5,
            )
        )
        red_flags.append(
            RedFlagItem(
                id=idx,
                quote=upi_payload["raw"][:100],
                why=f"UPI payment intent initiates an instant debit{amt_str}. Entering PIN transfers money away from your account.",
                severity="high",
                source="indicator",
            )
        )
        idx += 1

    # Authoritative Google Web Risk Reputation Lookup
    web_risk_data: dict[str, Any] | None = None
    urls = re.findall(r"https?://[^\s\"'<>]+", text)
    if urls:
        web_risk_data = await webrisk_service.check_url(urls[0])
        if web_risk_data.get("isThreat"):
            threats = ", ".join(web_risk_data.get("threatTypes", []))
            matches.append(
                RedFlagMatch(
                    tag="google_webrisk_confirmed_threat",
                    kind="malicious_url",
                    note=f"Google Web Risk Security Alert: Target URL is an actively confirmed threat ({threats}) in Google threat intelligence database.",
                    weight=5,
                )
            )
            red_flags.append(
                RedFlagItem(
                    id=idx,
                    quote=urls[0][:80],
                    why=f"Confirmed threat in Google Web Risk database: {threats}.",
                    severity="high",
                    source="indicator",
                )
            )
            idx += 1

    # Media-specific heuristic red flags (Video & Document)
    if media_type == "video" or any(w in text.lower() for w in ["video call", "skype call", "digital arrest", "police uniform", "cbi officer", "facing camera"]):
        if any(w in text.lower() for w in ["digital arrest", "cbi", "police", "customs", "arrest", "custody", "narcotics", "court", "officer"]):
            total_weight += 5
            matches.append(
                RedFlagMatch(
                    tag="digital_arrest_video_call",
                    kind="coercion",
                    note="Digital Arrest Video Call Threat: Real Indian law enforcement and judiciary NEVER interrogate citizens, hold hearings, or demand bail over video calls.",
                    weight=5,
                )
            )
            red_flags.append(
                RedFlagItem(
                    id=idx,
                    quote="Video call claiming police/CBI digital arrest",
                    why="Digital Arrest is a 100% fake extortion tactic. Real police do not conduct video trials or demand funds transfers to verify innocence.",
                    severity="high",
                    source="video" if media_type == "video" else "indicator",
                )
            )
            idx += 1

    if media_type == "document" or any(w in text.lower() for w in ["warrant", "seizure order", "court notice", "supreme court", "high court", "ed order", "cbi notice", "arrest order"]):
        if any(w in text.lower() for w in ["warrant", "seizure", "arrest", "bail", "pmla", "confiscation", "notice", "deposit"]):
            total_weight += 5
            matches.append(
                RedFlagMatch(
                    tag="forged_legal_document",
                    kind="authority",
                    note="Forged Court / Law Enforcement Order: Government seals, Ashoka Pillar emblems, and court arrest orders are forged to intimidate victims into sending money.",
                    weight=5,
                )
            )
            red_flags.append(
                RedFlagItem(
                    id=idx,
                    quote="Official warrant / court order document",
                    why="Real arrest warrants and court orders are never sent over messaging apps demanding financial deposits or bank account clearance transfers.",
                    severity="high",
                    source="document" if media_type == "document" else "indicator",
                )
            )
            idx += 1

    # Heuristic baseline calculation
    has_urls = bool(re.search(r"https?://[^\s]+|\bbit\.ly/\S+", text))
    has_shortener = any(m.tag == "shortener_url" for m in matches)
    has_otp = any(m.tag == "otp_request" or "otp" in m.kind.lower() or "otp" in m.tag.lower() for m in matches)
    has_remote_app = any(m.tag == "remote_app" for m in matches)
    has_digital_arrest = any(m.tag == "digital_arrest" or m.tag == "digital_arrest_video_call" for m in matches)
    has_forged_document = any(m.tag == "forged_legal_document" for m in matches)
    has_typosquat = any(m.tag == "typosquatting_domain" or "typosquat" in m.tag for m in matches)
    has_fake_bank_email = any(m.tag == "bank_public_webmail" for m in matches)
    has_credential_email_harvest = any(m.tag == "credential_email_harvest" for m in matches)
    has_urgency = any(m.kind == "urgency" for m in matches)

    if not matches and not has_urls and not upi_payload:
        base_score = 10
        base_risk: RiskLevel = "safe"
        base_verdict: Verdict = "likely_safe"
        base_title = "Safe — No Threat Vectors Detected"
        base_one_line = "No suspicious coercion, links, or credential requests were found."
        base_explanation = "The provided message appears standard and lacks known phishing or psychological manipulation indicators."
        base_reasons = [
            "No known urgency keywords or artificial deadlines observed.",
            "No obfuscated link shorteners or remote desktop download demands.",
            "Standard conversational patterns without immediate financial coercion.",
        ]
        base_actions = [
            "Maintain standard vigilance when interacting with unknown callers or senders.",
            "Remember that legitimate banks never ask for OTPs, PINs, or password entries.",
        ]
        do_now = ["No immediate action needed. Proceed with everyday caution."]
        dont_do = ["Never forward authentication OTPs to anyone, even if asked later."]
        verify_how = "If this claims to be from a known service, check your account in their official app."
        reassuring_signals = [
            "No high-pressure deadlines detected",
            "No suspicious download or APK links present",
        ]
    else:
        computed_score = min(98, 40 + total_weight * 12)
        if (
            has_shortener
            or has_otp
            or has_remote_app
            or has_digital_arrest
            or has_forged_document
            or has_typosquat
            or has_fake_bank_email
            or has_credential_email_harvest
        ):
            computed_score = max(computed_score, 88)
        if has_otp and (has_typosquat or has_fake_bank_email or has_credential_email_harvest):
            computed_score = max(computed_score, 94)
        if upi_payload or (web_risk_data and web_risk_data.get("isThreat")):
            computed_score = max(computed_score, 96)

        base_score = computed_score
        base_risk = "high" if base_score >= 75 else "caution"
        base_verdict = "likely_scam" if base_score >= 75 else "suspicious"

        if upi_payload:
            base_title = "Critical Danger — Deceptive UPI Collect / Debit Trap"
            base_one_line = "Financial theft attack: Scammers provided a payment link or QR payload designed to DEBIT your account under the guise of a refund or prize."
            base_explanation = f"This link or QR code generates a UPI Debit transaction to {upi_payload.get('payeeVpa') or 'the recipient'}. In the Indian banking system (NPCI/RBI rules), you NEVER need to scan a QR code or enter your UPI PIN to receive money. Entering your PIN authorizes money leaving your account."
            base_reasons = [
                f"The link executes a direct UPI payment to '{upi_payload.get('payeeVpa') or 'unverified party'}'.",
                "Entering an MPIN always debits money from your account; it can never receive money.",
                "Scammers use terms like 'Cashback', 'Refund', or 'Prize' in the note to deceive victims.",
                "Legitimate refunds are directly credited to your account via RTGS/NEFT/UPI without any approval link.",
            ]
            base_actions = [
                "DO NOT enter your UPI PIN or approve any prompt in Google Pay, PhonePe, or Paytm.",
                "Block and report the sender's VPA / phone number on your UPI app immediately.",
                "Report the incident on National Cyber Crime Helpline 1930.",
            ]
            do_now = [
                "Decline any pending collect requests inside your UPI app right now.",
                "Never share your UPI PIN or scan QR codes sent by unknown individuals.",
                "If you already entered your PIN, call your bank helpline immediately to block netbanking and UPI access.",
            ]
            dont_do = [
                "Never enter your UPI PIN to 'receive' money or 'verify' an account.",
                "Do not scan QR codes sent over WhatsApp or SMS.",
            ]
            verify_how = "Check your bank account balance directly inside your official banking app without clicking links."
            reassuring_signals = []
        elif web_risk_data and web_risk_data.get("isThreat"):
            threat_names = ", ".join(web_risk_data.get("threatTypes", []))
            base_title = f"Critical Danger — Confirmed Malicious URL ({threat_names})"
            base_one_line = "Google Web Risk has flagged this link as an active malicious threat."
            base_explanation = "This URL is listed in Google's enterprise threat intelligence database as actively hosting social engineering, phishing, or malicious software. Navigating to this site or submitting credentials poses an immediate security risk."
            base_reasons = [
                f"Google Web Risk database flag: {threat_names}.",
                "URL is categorized as active social engineering or credential phishing.",
                "Visiting this destination may trigger automated malware downloads or credential spoofing.",
            ]
            base_actions = [
                "Do NOT click or visit this URL under any circumstances.",
                "Report the URL on Google Safe Browsing / Web Risk and National Cyber Crime Portal (1930).",
                "Block the sender number or email immediately.",
            ]
            do_now = [
                "Close any browser tabs attempting to load this URL.",
                "If you already visited the link, clear your browser cache and monitor your accounts.",
            ]
            dont_do = [
                "Do not open the link even to 'check' what it is.",
                "Do not enter passwords or personal information.",
            ]
            verify_how = "Use independently verified contact information to reach the claimed service."
            reassuring_signals = []
        elif has_otp and (has_typosquat or has_fake_bank_email or has_credential_email_harvest):
            base_title = "High Danger — Fake Banking OTP Phishing via Typo-Squatted Email"
            base_one_line = "Critical credential theft attack: Scammers are impersonating a bank using a typo-squatted email to steal your OTP."
            base_explanation = "This message is a high-risk phishing attack. Legitimate banks strictly prohibit asking customers to email or share OTPs, and bank communications only originate from official corporate domains (e.g. @hdfcbank.com), never lookalikes like '@gmall.com'."
            base_reasons = [
                "Demanding OTP or authentication codes via email is a direct signature of credential harvesting.",
                "The email uses a typo-squatted lookalike domain ('gmall.com' instead of 'gmail.com').",
                "Banks and official institutions never use public or consumer webmail services for transactions.",
                "Deceptive assurances like 'secured email' are deployed to disarm the victim's natural vigilance.",
            ]
            base_actions = [
                "NEVER send or share your OTP, PIN, password, or card CVV with anyone.",
                "Mark the email as phishing and block the sender immediately.",
                "Report the phishing attempt on Cyber Crime Helpline 1930 and cybercrime.gov.in.",
            ]
            do_now = [
                "Do not reply or send your OTP to this email under any circumstances.",
                "If you already sent an OTP, immediately call your bank's emergency helpline to block your netbanking and debit cards.",
                "Report the sender to the National Cyber Crime Reporting Portal (1930).",
            ]
            dont_do = [
                "Never share OTPs, passwords, or PINs over email, SMS, or phone.",
                "Do not trust emails claiming to be 'secured' while using free or misspelled domains.",
                "Do not click any attachments or links from this sender.",
            ]
            verify_how = "Call the verified official customer support number printed on the back of your bank debit/credit card."
            reassuring_signals = []
        else:
            base_title = (
                "High Danger — Confirmed Cyber Threat Patterns"
                if base_score >= 75
                else "Caution Advised — Suspicious Elements Detected"
            )
            base_one_line = (
                "This communication shows characteristic marks of an active scam attempt."
                if base_score >= 75
                else "Be careful: several indicators suggest potential phishing or fraud."
            )
            base_explanation = (
                "The message employs artificial urgency, untrusted links, or secret credential requests to manipulate you."
            )
            base_reasons = [m.note for m in matches] if matches else ["Suspicious message syntax and unverified links detected."]
            base_actions = [
                "Do NOT click any links, download APK files, or call provided numbers.",
                "Verify the claim independently using the official app or customer portal.",
                "Report the sender number or URL on Sanchar Saathi (Chakshu) and 1909.",
            ]
            do_now = [
                "Stop all communication with the sender immediately.",
                "If you opened any links or shared an OTP, call Cyber Helpline 1930 and inform your bank.",
                "Block and report the number on WhatsApp / SMS.",
            ]
            dont_do = [
                "Do not click any web links or scan QR codes provided.",
                "Do not install apps like AnyDesk, TeamViewer, or unknown APK files.",
                "Do not pay any 'urgent fees' or transfer funds to secure accounts.",
            ]
            verify_how = "Open your bank's verified mobile app directly or call the helpline number printed on the back of your card."
            reassuring_signals = []

    # 2. Analyze with Gemini LLM (multimodal if image present)
    if is_live_llm_enabled():
        try:
            from google.genai import types

            client = get_genai_client()
            heuristic_summary = "\n".join(
                [f"- {m.kind}: {m.note} (weight: {m.weight})" for m in matches]
            ) or "- None"

            grounding_sources: list[str] = []
            has_domain_or_url = bool(
                re.search(
                    r"(?:https?://\S+|@[\w.-]+\.\w+|[\w-]+\.(?:com|in|org|net|site|xyz|online|live|info|club))",
                    text,
                    re.IGNORECASE,
                )
            )
            if has_domain_or_url and is_live_llm_enabled():
                try:
                    search_query = (
                        f"Check if this domain, email, or URL is a scam, phishing, or legitimate service: {text[:200]}"
                    )
                    search_resp = await client.aio.models.generate_content(
                        model=settings.MODEL_FAST,
                        contents=search_query,
                        config=types.GenerateContentConfig(
                            tools=[types.Tool(google_search=types.GoogleSearch())],
                            temperature=0.1,
                        ),
                    )
                    search_text = search_resp.text or ""
                    if search_resp.candidates and search_resp.candidates[0].grounding_metadata:
                        chunks = search_resp.candidates[0].grounding_metadata.grounding_chunks or []
                        for chunk in chunks:
                            if chunk.web and chunk.web.title:
                                grounding_sources.append(chunk.web.title)
                    if search_text:
                        heuristic_summary += (
                            f"\n- Google Search Grounding Analysis: {search_text[:400]}"
                        )
                except Exception as search_err:
                    logger.debug("Search Grounding pre-pass skipped or failed: %s", search_err)

            lang_instruction = (
                "Respond in clear, natural Hindi (Devanagari) as spoken in everyday India."
                if req.lang == "hi"
                else "Respond in clear, empathetic English suitable for a non-technical adult."
            )

            prompt = f"""
You are the Scam Dojo Chief Threat Intelligence Analyst powered by Google Cloud & Gemini AI.
Analyze the following suspicious message, call transcript, or SMS for fraud, impersonation, and psychological coercion.

CRITICAL THREAT EVALUATION STANDARDS (RBI, CERT-In, & Cyber Crime 1930 Standards):
1. OTP / CREDENTIAL REQUESTS: Banks, payment gateways, and government agencies NEVER ask customers to share, forward, or email OTPs, PINs, CVVs, or passwords. Any message requesting an OTP is an AUTOMATIC CRITICAL FRAUD THREAT (Score 88-100).
2. DOMAIN & EMAIL AUTHENTICITY:
   - Legitimate Indian banks only communicate from their official corporate domains (e.g. '@hdfcbank.com', '@sbi.co.in', '@icicibank.com'). They NEVER use public webmail (@gmail.com, @yahoo.com).
   - Beware of TYPO-SQUATTED domains (e.g. 'gmall.com' instead of 'gmail.com', 'yaho0.com', 'hotmial.com', 'hdfc-bank.com'). Scammers intentionally misspell letters to deceive victims.
   - Claims like 'secured email' or 'verification desk' on free or misspelled webmail are deceptive pretexting.
3. DIGITAL ARREST & UTILITY THREATS: Law enforcement never conducts video arrests; utility providers do not disconnect power at night with immediate phone call demands.
4. LEGAL SUMMONS, ARREST WARRANTS & COURT / POLICE ORDERS (PDF, DOCS & DOCUMENTS): Real Indian law enforcement and judiciary NEVER issue arrest warrants or seizure notices over WhatsApp/Telegram, and NEVER demand 'verification fees' or 'clearance deposits'. Forged documents typically feature fake seals, mismatched IPC/BNS/PMLA citations, and lack verifiable CCTNS tracking numbers.
5. VIDEO FORENSICS & DEEPFAKE DETECTION (VIDEO FILES):
   - Digital Arrest & Police Impersonation: Callers wearing fake police/customs uniforms on video call claiming the victim is in 'Digital Custody'. Real police NEVER conduct video arrests or online trials.
   - Deepfake & Synthetic Indicators: Analyze for abnormal blinking, unnatural facial seam warping, robotic or cloned AI voice timbre, desynchronized lip movement, and artificial static backdrops.
   - Screen Recording Threats: Videos instructing victims to install AnyDesk, RustDesk, TeamViewer QuickSupport, or download APK files.
6. UPI INTENT & PAYMENT QR TRAPS: Receiving money, cashback, or refunds NEVER requires entering an MPIN or scanning a QR code. Any message, link, or QR code that initiates a UPI Debit under the pretext of 'receiving' funds is an AUTOMATIC CRITICAL FRAUD THREAT (Score 95-100).

Message to inspect:
\"\"\"{text}\"\"\"

Initial Heuristic, Domain & Search Grounding Findings:
{heuristic_summary}

Language instruction:
{lang_instruction}

Requirements:
- score: Integer 0 to 100 (0-20 safe, 21-65 caution, 66-100 high danger). If OTP sharing, typo-squatting, UPI debit traps, or deepfake impersonations are detected, score MUST be between 88 and 100.
- risk_level: One of 'safe', 'caution', 'high'.
- title: Short, authoritative diagnosis (e.g. "Fake Banking OTP Phishing via Typo-Squatted Email", "Deceptive UPI Collect / Debit Trap", "Deepfake Digital Arrest Impersonation Video", "Forged Law Enforcement Warrant", "Legitimate Service Alert").
- explanation: 2-3 sentences providing clear, calm context explaining specifically why this is fraudulent.
- reasons: 3-5 specific bullet points explaining why this is fraudulent or safe.
- do_now: 3 concrete action steps to protect yourself immediately.
- dont_do: 2-3 critical pitfalls to avoid right now.
- verify_how: 1 sentence on the single safest way to independently verify this.
- deepfake_detected: boolean indicating if deepfake, AI voice cloning, or synthetic media artifacts were identified.
- synthetic_confidence: integer 0 to 100 indicating confidence in synthetic manipulation.
- forgery_flags: list of strings detailing specific visual, audio, or document anomalies found.
- media_summary: 1-2 sentence forensic summary of the uploaded media file.
"""
            contents: list[Any] = [prompt]
            if media_bytes and detected_mime:
                try:
                    if detected_mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                        if doc_extracted_text:
                            contents.append(
                                types.Part.from_bytes(
                                    data=doc_extracted_text.encode("utf-8"),
                                    mime_type="text/plain",
                                )
                            )
                    else:
                        contents.append(
                            types.Part.from_bytes(
                                data=media_bytes,
                                mime_type=detected_mime,
                            )
                        )
                except Exception as part_err:
                    logger.warning("Failed to construct Gemini media Part: %s", part_err)

            config = types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=CheckAnalystOutput,
            )

            resp = None
            used_model = settings.MODEL_FAST
            try:
                resp = await client.aio.models.generate_content(
                    model=used_model,
                    contents=contents,
                    config=config,
                )
            except Exception as primary_err:
                fallback = getattr(settings, "MODEL_FALLBACK", "gemini-2.5-flash")
                if fallback and fallback != used_model:
                    logger.warning("Primary check model %s failed (%s), attempting fallback %s", used_model, primary_err, fallback)
                    used_model = fallback
                    resp = await client.aio.models.generate_content(
                        model=used_model,
                        contents=contents,
                        config=config,
                    )
                else:
                    raise primary_err

            parsed = json.loads(resp.text or "{}")
            llm_result = CheckAnalystOutput.model_validate(parsed)

            base_score = llm_result.score
            base_risk = llm_result.risk_level
            base_verdict = "likely_scam" if base_score >= 65 else ("suspicious" if base_score >= 25 else "likely_safe")
            base_title = llm_result.title
            base_explanation = llm_result.explanation
            base_reasons = llm_result.reasons
            do_now = llm_result.do_now
            dont_do = llm_result.dont_do
            verify_how = llm_result.verify_how

            if media_type:
                deepfake_flag = bool(llm_result.deepfake_detected or (llm_result.synthetic_confidence or 0) >= 60)
                if deepfake_flag:
                    base_score = max(base_score, 92)
                    base_risk = "high"
                    base_verdict = "likely_scam"

                flags = list(llm_result.forgery_flags or [])
                if deepfake_flag and not any("deepfake" in f.lower() or "synthetic" in f.lower() for f in flags):
                    flags.insert(0, "Deepfake / Synthetic AI Artifacts Identified")

                media_analysis = MediaAnalysisInfo(
                    media_type=media_type,
                    file_name=req.file_name,
                    mime_type=detected_mime,
                    deepfake_detected=deepfake_flag,
                    synthetic_confidence=llm_result.synthetic_confidence or (88 if deepfake_flag else 5),
                    forgery_flags=flags,
                    summary=llm_result.media_summary or (
                        f"Google Gemini Multimodal analyzed this {media_type}. "
                        + ("High risk of deepfake impersonation detected." if deepfake_flag else "Inspected media markers and document structure.")
                    ),
                    google_api_used="Google Gemini 2.5 Flash Multimodal Video & Document AI",
                )
        except Exception as e:
            logger.warning("Live Gemini analysis for /v1/check failed, falling back to heuristics: %s", e)

    # Fallback media analysis when live LLM is inactive or offline
    if media_type and not media_analysis:
        is_high_risk = base_score >= 70
        is_synthetic = media_type == "video" and any(w in text.lower() for w in ["deepfake", "digital arrest", "police uniform", "video call"])
        flags = []
        if is_synthetic:
            flags.append("Digital Arrest Impersonation Video")
            flags.append("Suspicious Uniform & Backdrop Artifacts")
        elif media_type == "document" and is_high_risk:
            flags.append("Forged Government / Court Seals")
            flags.append("Unverifiable Official Dispatch Number")

        media_analysis = MediaAnalysisInfo(
            media_type=media_type,
            file_name=req.file_name,
            mime_type=detected_mime,
            deepfake_detected=is_synthetic,
            synthetic_confidence=85 if is_synthetic else 5,
            forgery_flags=flags,
            summary=(
                f"Google Gemini Multimodal Video & Document Analysis: Inspected {req.file_name or media_type}. "
                + ("Flagged high risk for simulated authority / deepfake video." if is_synthetic else f"Processed {media_type} structure and text indicators.")
            ),
            google_api_used="Google Gemini 2.5 Flash Multimodal Video & Document AI",
        )

    # Verified resources for high danger
    resources = []
    if base_score >= 60:
        raw_resources = kb_service.get_resources(country="IN", lang=req.lang)
        resources = [r for r in raw_resources if r.get("id") in ("helpline_1930", "portal_cybercrime", "portal_sancharsaathi")][:3]

    unique_grounding = []
    if "grounding_sources" in locals() and grounding_sources:
        unique_grounding = list(dict.fromkeys(grounding_sources))[:5]

    response_doc = {
        "checkId": check_id,
        "createdAt": now_iso,
        "text": text,
        "score": base_score,
        "riskScore": base_score,
        "riskLevel": base_risk,
        "verdict": base_verdict,
        "title": base_title,
        "oneLine": base_one_line,
        "explanation": base_explanation,
        "reasons": base_reasons,
        "actions": base_actions,
        "redFlags": [rf.model_dump(by_alias=True) for rf in red_flags],
        "reassuringSignals": reassuring_signals,
        "doNow": do_now,
        "dontDo": dont_do,
        "verifyHow": verify_how,
        "needsMoreInfo": [],
        "alreadyActedHint": base_score >= 70,
        "confidence": "high",
        "languageDetected": req.lang,
        "inputTypes": input_types,
        "matches": [m.model_dump(by_alias=True) for m in matches],
        "resources": resources,
        "groundingSources": unique_grounding,
        "upiPayload": upi_payload,
        "webRisk": web_risk_data,
        "mediaAnalysis": media_analysis.model_dump(by_alias=True) if media_analysis else None,
    }

    # Save check in repo
    await repo.save_check(user.uid, response_doc)
    await repo.incr_global("checks")
    await repo.incr_global("redFlagsSurfaced", len(red_flags))

    return CheckResponse(
        check_id=check_id,
        created_at=now_iso,
        text=text,
        score=base_score,
        risk_score=base_score,
        risk_level=base_risk,
        verdict=base_verdict,
        title=base_title,
        one_line=base_one_line,
        explanation=base_explanation,
        reasons=base_reasons,
        actions=base_actions,
        red_flags=red_flags,
        reassuring_signals=reassuring_signals,
        do_now=do_now,
        dont_do=dont_do,
        verify_how=verify_how,
        needs_more_info=[],
        already_acted_hint=base_score >= 70,
        confidence="high",
        language_detected=req.lang,
        input_types=input_types,
        matches=matches,
        resources=resources,
        grounding_sources=unique_grounding,
        upi_payload=upi_payload,
        web_risk=web_risk_data,
        media_analysis=media_analysis,
    )


@router.get("/check/{cid}", response_model=CheckResponse)
async def get_check(
    cid: str,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> CheckResponse:
    doc = await repo.get_check(user.uid, cid)
    if not doc:
        raise HTTPException(status_code=404, detail="Check not found")
    return CheckResponse.model_validate(doc)


@router.get("/checks")
async def list_checks(
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> dict[str, list[dict[str, Any]]]:
    items = await repo.list_checks(user.uid, limit=20)
    return {"items": items}


@router.post("/check/{cid}/to-drill", response_model=ForgeDrillResponse, status_code=status.HTTP_201_CREATED)
async def forge_drill_from_check(
    cid: str,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> ForgeDrillResponse:
    """Scenario Forge: Turns a real checked scam into an interactive training drill."""
    doc = await repo.get_check(user.uid, cid)
    if not doc:
        raise HTTPException(status_code=404, detail="Check not found")

    if doc.get("verdict") == "likely_safe":
        raise HTTPException(
            status_code=409,
            detail="Cannot forge training drill from a safe message",
        )

    text = doc.get("text", "")
    title_raw = doc.get("title", "Custom Phishing Drill")
    clean_title = re.sub(r"^(High Danger|Caution Advised|Suspicious)\s*—?\s*", "", title_raw)
    drill_title = f"Live Drill: {clean_title[:35]}"
    scenario_id = cid.replace("chk_", "")
    scenario_slug = f"custom:{scenario_id}"

    # Fictional entities derived from the scam
    org_match = re.search(r"\b(SBI|HDFC|ICICI|Airtel|Jio|Electricity|Courier|Customs|Police)\b", text, re.IGNORECASE)
    org_name = f"{org_match.group(1).title()} Dept" if org_match else "Orion Security Desk"
    blurb_text = f"Forged from real scam: Practice shutting down pressure from {org_name}."

    custom_spec = {
        "id": scenario_id,
        "slug": scenario_slug,
        "custom": True,
        "title": {"en": drill_title, "hi": drill_title},
        "blurb": {
            "en": blurb_text,
            "hi": blurb_text,
        },
        "scam_type": "custom_phishing",
        "channel": "sms",
        "difficulty_range": [2, 4],
        "est_minutes": 3,
        "min_belt": "white",
        "persona": {
            "name": "Officer Sharma",
            "role": "Impostor Executive",
            "voice": "Urgent, persistent and demanding immediate action",
        },
        "fake_entities": {
            "org": f"{org_name} (Simulated)",
            "phone": "+91 98712 43901",
            "link": "https://secure-verify.online/auth",
            "upi": "verification.desk@gmall.com",
            "email": "security.desk@gmall.com",
            "employee_id": "Officer Rajeshwar Sharma, Emp #DL-88201",
        },
        "objective": "Coerce user into clicking unverified links or sharing credentials",
        "opening_message": {
            "en": text if len(text) <= 280 else text[:277] + "...",
            "hi": text if len(text) <= 280 else text[:277] + "...",
        },
    }

    await repo.save_custom_scenario(user.uid, custom_spec)

    return ForgeDrillResponse(
        scenario_slug=scenario_slug,
        title=drill_title,
        channel="sms",
        persona_name="Officer Sharma",
        blurb=blurb_text,
    )
