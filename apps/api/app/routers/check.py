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
                severity: Literal["low", "medium", "high"] = "high" if weight >= 25 else "medium"
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

    # Heuristic baseline calculation
    has_urls = bool(re.search(r"https?://[^\s]+|\bbit\.ly/\S+", text))
    has_shortener = any(m.tag == "shortener_url" for m in matches)
    has_otp = any(m.tag == "otp_request" or "otp" in m.kind.lower() for m in matches)
    has_remote_app = any(m.tag == "remote_app" for m in matches)
    has_digital_arrest = any(m.tag == "digital_arrest" for m in matches)
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
        if has_shortener or has_otp or has_remote_app or has_digital_arrest:
            computed_score = max(computed_score, 88)

        base_score = computed_score
        base_risk = "high" if base_score >= 75 else "caution"
        base_verdict = "likely_scam" if base_score >= 75 else "suspicious"
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

            lang_instruction = (
                "Respond in clear, natural Hindi (Devanagari) as spoken in everyday India."
                if req.lang == "hi"
                else "Respond in clear, empathetic English suitable for a non-technical adult."
            )

            prompt = f"""
You are the Scam Dojo Chief Threat Intelligence Analyst.
Analyze the following suspicious message, call transcript, or SMS.
Finalize the threat assessment, evaluate psychological manipulation tactics (Urgency, Fear, Authority, Isolation, Greed), and provide precise defensive advice mapped to RBI, CERT-In, and Cyber Crime Helpline 1930 guidelines.

Message to inspect:
\"\"\"{text}\"\"\"

Initial Heuristic Scan Findings:
{heuristic_summary}

Language instruction:
{lang_instruction}

Requirements:
- score: Integer 0 to 100 (0-20 safe, 21-65 caution, 66-100 high danger).
- risk_level: One of 'safe', 'caution', 'high'.
- title: Short, authoritative diagnosis (e.g. "Fake Banking KYC Phishing Trap", "Electricity Disconnection Extortion", "Legitimate Service Alert").
- explanation: 2-3 sentences providing clear, calm context.
- reasons: 3-5 specific bullet points explaining why this is fraudulent or safe.
- do_now: 3 concrete action steps to protect yourself immediately.
- dont_do: 2-3 critical pitfalls to avoid right now.
- verify_how: 1 sentence on the single safest way to independently verify this.
"""
            contents: list[Any] = [prompt]
            if req.image_base64:
                input_types.append("image")
                clean_b64 = req.image_base64.split(",", 1)[-1]
                contents.append(
                    types.Part.from_bytes(
                        data=clean_b64.encode("utf-8"),
                        mime_type="image/jpeg",
                    )
                )

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
            "phone": "+91 00000 00000",
            "link": "https://secure-verify.example",
            "upi": "desk@fakebank",
            "employee_id": "EMP-001",
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
