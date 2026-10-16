"""Message Check, AI Threat Inspector & Scenario Forge Router.

Combines fast heuristic pattern matching from the local KB with Gemini Multimodal LLM analysis.
"""

from datetime import UTC, datetime
import json
import logging
import re
import uuid
from typing import Any, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.agents.runtime import get_genai_client, is_live_llm_enabled
from app.config import settings
from app.deps import get_current_user, get_repo
from app.repo.base import Repo
from app.schemas.common import CamelModel, Lang
from app.schemas.user import Me
from app.services.kb import kb_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["check"])


class CheckRequest(CamelModel):
    text: str = Field(..., min_length=1, max_length=5000)
    image_base64: str | None = None
    lang: Lang = "en"


class RedFlagItem(CamelModel):
    id: int
    quote: str
    why: str
    severity: Literal["low", "medium", "high"]
    source: Literal["text", "image", "video", "audio", "indicator"]


class RedFlagMatch(CamelModel):
    tag: str
    kind: str
    note: str
    weight: int


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


class CheckAnalystOutput(BaseModel):
    score: int = Field(..., ge=0, le=100)
    risk_level: Literal["safe", "caution", "high"]
    title: str
    explanation: str
    reasons: list[str]
    do_now: list[str]
    dont_do: list[str]
    verify_how: str


class ForgeDrillResponse(CamelModel):
    scenario_slug: str
    title: str
    channel: str
    persona_name: str
    blurb: str


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

    # Heuristic baseline calculation
    has_urls = bool(re.search(r"https?://[^\s]+|\bbit\.ly/\S+", text))
    has_shortener = any(m.tag == "shortener_url" for m in matches)
    has_otp = any(m.tag == "otp_request" or "otp" in m.kind.lower() or "otp" in m.tag.lower() for m in matches)
    has_remote_app = any(m.tag == "remote_app" for m in matches)
    has_digital_arrest = any(m.tag == "digital_arrest" for m in matches)
    has_typosquat = any(m.tag == "typosquatting_domain" or "typosquat" in m.tag for m in matches)
    has_fake_bank_email = any(m.tag == "bank_public_webmail" for m in matches)
    has_credential_email_harvest = any(m.tag == "credential_email_harvest" for m in matches)
    has_urgency = any(m.kind == "urgency" for m in matches)

    if not matches and not has_urls:
        base_score = 10
        base_risk = "safe"
        base_verdict = "likely_safe"
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
        if has_shortener or has_otp or has_remote_app or has_digital_arrest or has_typosquat or has_fake_bank_email or has_credential_email_harvest:
            computed_score = max(computed_score, 88)
        if has_otp and (has_typosquat or has_fake_bank_email or has_credential_email_harvest):
            computed_score = max(computed_score, 94)

        base_score = computed_score
        base_risk = "high" if base_score >= 75 else "caution"
        base_verdict = "likely_scam" if base_score >= 75 else "suspicious"

        if has_otp and (has_typosquat or has_fake_bank_email or has_credential_email_harvest):
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

Message to inspect:
\"\"\"{text}\"\"\"

Initial Heuristic, Domain & Search Grounding Findings:
{heuristic_summary}

Language instruction:
{lang_instruction}

Requirements:
- score: Integer 0 to 100 (0-20 safe, 21-65 caution, 66-100 high danger). If OTP sharing or typo-squatting is detected, score MUST be between 88 and 100.
- risk_level: One of 'safe', 'caution', 'high'.
- title: Short, authoritative diagnosis (e.g. "Fake Banking OTP Phishing via Typo-Squatted Email", "Electricity Disconnection Extortion", "Legitimate Service Alert").
- explanation: 2-3 sentences providing clear, calm context explaining specifically why this is fraudulent.
- reasons: 3-5 specific bullet points explaining why this is fraudulent or safe.
- do_now: 3 concrete action steps to protect yourself immediately.
- dont_do: 2-3 critical pitfalls to avoid right now.
- verify_how: 1 sentence on the single safest way to independently verify this.
"""
            contents: list[Any] = [prompt]
            if req.image_base64:
                import base64

                input_types.append("image")
                mime_type = "image/jpeg"
                if "data:image/png" in req.image_base64:
                    mime_type = "image/png"
                elif "data:image/webp" in req.image_base64:
                    mime_type = "image/webp"
                clean_b64 = req.image_base64.split(",", 1)[-1]
                try:
                    img_bytes = base64.b64decode(clean_b64)
                    contents.append(
                        types.Part.from_bytes(
                            data=img_bytes,
                            mime_type=mime_type,
                        )
                    )
                except Exception as b64_err:
                    logger.warning("Failed to decode base64 image: %s", b64_err)

            config = types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=CheckAnalystOutput,
            )

            resp = await client.aio.models.generate_content(
                model=settings.MODEL_FAST,
                contents=contents,
                config=config,
            )
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
        except Exception as e:
            logger.warning("Live Gemini analysis for /v1/check failed, falling back to heuristics: %s", e)

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

    custom_spec = {
        "id": scenario_id,
        "slug": scenario_slug,
        "custom": True,
        "title": {"en": drill_title, "hi": drill_title},
        "blurb": {
            "en": f"Forged from real scam: Practice shutting down pressure from {org_name}.",
            "hi": f"Forged from real scam: Practice shutting down pressure from {org_name}.",
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
        blurb=custom_spec["blurb"]["en"],
    )
