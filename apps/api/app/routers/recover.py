"""Recover Mode Router: Personalized Golden-Hour Action Plans & Guided Recovery Chat.

Assists victims who have faced scams with verified Indian authorities (1930, cybercrime.gov.in,
RBI, Sanchar Saathi) and step-by-step dispute drafts.
"""

from datetime import UTC, datetime
import json
import logging
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

router = APIRouter(prefix="/v1/recover", tags=["recover"])

IncidentType = Literal[
    "upi_payment",
    "card_details_shared",
    "otp_shared",
    "bank_transfer",
    "remote_app_installed",
    "link_clicked",
    "aadhaar_pan_shared",
    "purchase_scam",
    "investment_or_job",
    "threatened",
    "other",
]

TimeSince = Literal["just_now", "within_1h", "today", "1_3_days", "longer"]
AmountBand = Literal["lt_1k", "1k_10k", "10k_50k", "50k_2l", "gt_2l", "unknown"]
PaymentMethod = Literal["upi", "card", "net_banking", "wallet", "cash", "crypto", "other"]


class CreatePlanRequest(CamelModel):
    incident: list[IncidentType] = Field(..., min_length=1)
    time_since: TimeSince = "just_now"
    money_lost: bool = False
    amount_band: AmountBand | None = None
    payment_method: PaymentMethod | None = None
    bank: str | None = None
    notes: str | None = Field(default=None, max_length=1000)
    from_check_id: str | None = None
    lang: Lang = "en"


class PlanStep(CamelModel):
    id: str
    phase: Literal["now", "today", "this_week", "protect_next"]
    title: str
    why: str
    how: list[str]
    resources: list[dict[str, Any]] = []
    draft_text: str | None = None
    draft_label: str | None = None
    time_critical: bool = False
    done: bool = False


class PlanResult(CamelModel):
    plan_id: str
    created_at: str
    urgency: Literal["critical", "high", "moderate", "low"]
    summary: str
    steps: list[PlanStep]
    what_to_expect: list[str]
    evidence_checklist: list[str]
    protect_next: list[str]
    suggested_drill: dict[str, str] | None = None
    degraded: bool = False
    disclaimer: str
    resources_verified_on: str
    chat: list[dict[str, Any]] = []


class ToggleStepRequest(CamelModel):
    done: bool


class StepProgress(CamelModel):
    done: int
    total: int


class ToggleStepResponse(CamelModel):
    step_id: str
    done: bool
    progress: StepProgress


class ChatMessageRequest(CamelModel):
    text: str = Field(..., min_length=1, max_length=1000)


class ChatMessageResponse(CamelModel):
    role: Literal["user", "assistant"]
    text: str
    ts: str


@router.post("/plans", response_model=PlanResult, status_code=status.HTTP_201_CREATED)
async def create_recovery_plan(
    req: CreatePlanRequest,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> PlanResult:
    pid = f"rec_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(UTC).isoformat()

    # Load verified resources from SQLite KB
    all_resources = kb_service.get_resources(country="IN", lang=req.lang)
    res_map = {r["id"]: r for r in all_resources}

    r_1930 = res_map.get("helpline_1930")
    r_cyber = res_map.get("portal_cybercrime")
    r_telemanas = res_map.get("helpline_telemanas")
    r_sanchar = res_map.get("portal_sancharsaathi")
    r_rbi = res_map.get("portal_rbi_cms")

    is_golden_hour = req.time_since in ("just_now", "within_1h")
    urgency: Literal["critical", "high", "moderate", "low"] = (
        "critical" if req.money_lost and is_golden_hour else ("high" if req.money_lost else "moderate")
    )

    bank_name = req.bank.strip() if req.bank else "your bank"
    steps: list[PlanStep] = []

    # 1. Immediate / Golden Hour steps
    if req.money_lost and is_golden_hour:
        steps.append(
            PlanStep(
                id="step_1930",
                phase="now",
                title="Call 1930 National Cyber Fraud Helpline immediately",
                why="The Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS) can freeze funds in beneficiary bank accounts before cash is withdrawn.",
                how=[
                    "Dial 1930 from your phone.",
                    "Provide your name, phone number, bank name, transaction ID / UTR, and debit time.",
                    "Save the acknowledgment reference number provided by the operator.",
                ],
                resources=[r_1930] if r_1930 else [],
                time_critical=True,
                done=False,
            )
        )

    if req.money_lost or "upi_payment" in req.incident or "card_details_shared" in req.incident or "bank_transfer" in req.incident:
        dispute_draft = (
            f"Subject: Urgent: Unauthorized Fraud Dispute & Account Freeze Request\n\n"
            f"Dear {bank_name} Fraud Control Desk,\n"
            f"I was victimized by an online financial fraud on {datetime.now(UTC).strftime('%d-%b-%Y')}.\n"
            f"Payment Method: {req.payment_method or 'UPI / NetBanking'}\n"
            f"Please immediately:\n"
            f"1. Freeze fraudulent outgoing transfers and initiate a interbank recall/lien.\n"
            f"2. Block compromised cards and UPI IDs linked to my account.\n"
            f"3. Register an official dispute complaint and provide the Ticket/URN number.\n\n"
            f"Thank you,\nAccount Holder"
        )
        steps.append(
            PlanStep(
                id="step_bank_freeze",
                phase="now",
                title=f"Instruct {bank_name} to freeze debits and dispute transactions",
                why="Under RBI customer protection directives, reporting within 3 days limits your financial liability for unauthorized electronic transactions.",
                how=[
                    f"Call the official phone number on the back of your debit/credit card, or open {bank_name}'s official mobile app.",
                    "Request an immediate freeze on netbanking and card credentials.",
                    "Insist on an official Complaint Reference Number.",
                ],
                draft_text=dispute_draft,
                draft_label=f"Copy {bank_name} Dispute Email / Message",
                resources=[],
                time_critical=True,
                done=False,
            )
        )

    if "remote_app_installed" in req.incident:
        steps.append(
            PlanStep(
                id="step_remove_apps",
                phase="now",
                title="Disconnect Wi-Fi/Mobile data and uninstall remote access apps",
                why="Apps like AnyDesk, TeamViewer, or RustDesk give attackers full control over your screen, OTPs, and banking credentials.",
                how=[
                    "Turn on Airplane Mode immediately.",
                    "Go to Settings -> Apps and uninstall AnyDesk, QuickSupport, TeamViewer, or any APK you recently downloaded.",
                    "Reboot your phone before reconnecting to the internet.",
                ],
                time_critical=True,
                done=False,
            )
        )

    # 2. Today steps
    steps.append(
        PlanStep(
            id="step_cybercrime_portal",
            phase="today",
            title="File a formal complaint at cybercrime.gov.in",
            why="An official Cyber Crime acknowledgment is legally required for bank chargeback processes and police investigation.",
            how=[
                "Visit cybercrime.gov.in and click 'Report Financial Fraud'.",
                "Upload transaction screenshots, bank statements, and the scammer's phone number or UPI handle.",
                "Download the PDF acknowledgment copy for your bank submission.",
            ],
            resources=[r_cyber] if r_cyber else [],
            time_critical=False,
            done=False,
        )
    )

    if "aadhaar_pan_shared" in req.incident or "otp_shared" in req.incident:
        steps.append(
            PlanStep(
                id="step_secure_identity",
                phase="today",
                title="Lock Aadhaar biometrics and change all critical passwords",
                why="Prevents fraudsters from using your identity documents for fraudulent SIM cards, microloans, or wallet registrations.",
                how=[
                    "Open the mAadhaar app or myaadhaar.uidai.gov.in and enable 'Biometric Lock'.",
                    "Change your primary email and netbanking passwords from a safe device.",
                ],
                resources=[],
                time_critical=False,
                done=False,
            )
        )

    # 3. This week steps
    steps.append(
        PlanStep(
            id="step_sanchar_saathi",
            phase="this_week",
            title="Report fraud communication on DoT Sanchar Saathi (Chakshu)",
            why="Helps telecommunication authorities blacklist the scammer's mobile number, IMEI device, and WhatsApp accounts.",
            how=[
                "Open sancharsaathi.gov.in and select the Chakshu facility.",
                "Submit the scammer's phone number, SMS sender header, or fraudulent link.",
            ],
            resources=[r_sanchar] if r_sanchar else [],
            time_critical=False,
            done=False,
        )
    )

    steps.append(
        PlanStep(
            id="step_rbi_ombudsman",
            phase="this_week",
            title=f"Escalate to RBI Ombudsman if {bank_name} does not resolve in 30 days",
            why="If the bank fails to act on timely fraud reports or denies dispute resolution without valid grounds, RBI Ombudsman provides binding redressal.",
            how=[
                "Keep all dispute emails, complaint reference numbers, and acknowledgment receipts organized.",
                "If no satisfactory response is received within 30 days, file an online appeal at cms.rbi.org.in or call 14448.",
            ],
            resources=[r_rbi] if r_rbi else [],
            time_critical=False,
            done=False,
        )
    )

    # 4. Protect Next
    steps.append(
        PlanStep(
            id="step_recovery_scam_warning",
            phase="protect_next",
            title="NEVER pay anyone claiming they can 'recover' or 'hack back' your funds",
            why="Secondary recovery scams target victims on Telegram, Instagram, and forums pretending to be ethical hackers or lawyers. Nobody can legally retrieve funds outside of official banking and police channels.",
            how=[
                "Ignore all DMs offering recovery services for a commission or processing fee.",
                "Only deal directly with your bank branch and cybercrime.gov.in.",
            ],
            resources=[],
            time_critical=False,
            done=False,
        )
    )

    what_to_expect = [
        "Your bank will temporarily freeze impacted payment instruments for your protection.",
        "Helpline 1930 will attempt to place an interbank lien if reported within the golden hour.",
        "You will receive an SMS from the Cyber Crime portal with a 15-digit complaint tracking ID.",
    ]

    evidence_checklist = [
        "Bank transaction statement highlighting fraudulent debit UTR / Reference IDs",
        "Full screenshots of chat conversations, SMS messages, or fraudulent web links",
        "Phone numbers, email addresses, or UPI IDs used by the fraudster",
        "Written dispute acknowledgment number from your bank branch or customer support",
    ]

    protect_next = [
        "Enable transaction limits and disable international transactions on all debit/credit cards.",
        "Never approve collect requests on Google Pay, PhonePe, or Paytm from unknown individuals.",
        "Remember: UPI PIN is ONLY needed for sending money, never for receiving money or refunds.",
    ]

    # Map to drill recommendation
    suggested_drill = {
        "slug": "fake_kyc" if "card_details_shared" in req.incident or "otp_shared" in req.incident else "upi_collect",
        "title": "Practice Defending Against Similar Phishing Drills",
    }

    summary = (
        f"Critical recovery roadmap for {bank_name} fraud: Golden hour actions prioritized to freeze unauthorized fund outflows."
        if urgency == "critical"
        else f"Comprehensive protection checklist to secure your accounts and file official complaints against the scam."
    )

    plan_doc = {
        "planId": pid,
        "createdAt": now_iso,
        "updatedAt": now_iso,
        "urgency": urgency,
        "summary": summary,
        "steps": [s.model_dump(by_alias=True) for s in steps],
        "stepStatus": {},
        "whatToExpect": what_to_expect,
        "evidenceChecklist": evidence_checklist,
        "protectNext": protect_next,
        "suggestedDrill": suggested_drill,
        "degraded": False,
        "disclaimer": "This guidance is for informational and educational triage purposes based on official RBI, CERT-In, and I4C procedures. Please consult law enforcement authorities and your bank branch.",
        "resourcesVerifiedOn": "2026-10-14",
        "intake": req.model_dump(by_alias=True),
        "chat": [],
    }

    await repo.save_plan(user.uid, plan_doc)
    await repo.incr_global("recoveryPlans")

    return PlanResult(
        plan_id=pid,
        created_at=now_iso,
        urgency=urgency,
        summary=summary,
        steps=steps,
        what_to_expect=what_to_expect,
        evidence_checklist=evidence_checklist,
        protect_next=protect_next,
        suggested_drill=suggested_drill,
        degraded=False,
        disclaimer=str(plan_doc["disclaimer"]),
        resources_verified_on="2026-10-14",
        chat=[],
    )


@router.get("/plans/{pid}", response_model=PlanResult)
async def get_recovery_plan(
    pid: str,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> PlanResult:
    doc = await repo.get_plan(user.uid, pid)
    if not doc:
        raise HTTPException(status_code=404, detail="Recovery plan not found")

    step_status = doc.get("stepStatus", {})
    steps_data = doc.get("steps", [])
    for s in steps_data:
        s_id = s.get("id")
        if s_id in step_status:
            s["done"] = step_status[s_id].get("done", False)

    doc["steps"] = steps_data
    return PlanResult.model_validate(doc)


@router.get("/plans")
async def list_recovery_plans(
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> dict[str, list[dict[str, Any]]]:
    items = await repo.list_plans(user.uid, limit=10)
    summaries = []
    for item in items:
        steps = item.get("steps", [])
        status_map = item.get("stepStatus", {})
        done_count = sum(1 for s in steps if status_map.get(s.get("id"), {}).get("done", False))
        summaries.append({
            "planId": item.get("planId"),
            "createdAt": item.get("createdAt"),
            "urgency": item.get("urgency"),
            "summary": item.get("summary"),
            "progress": {"done": done_count, "total": len(steps)},
        })
    return {"items": summaries}


@router.patch("/plans/{pid}/steps/{step_id}", response_model=ToggleStepResponse)
async def toggle_step_done(
    pid: str,
    step_id: str,
    req: ToggleStepRequest,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> ToggleStepResponse:
    doc = await repo.get_plan(user.uid, pid)
    if not doc:
        raise HTTPException(status_code=404, detail="Recovery plan not found")

    await repo.set_step_done(user.uid, pid, step_id, req.done)

    # Re-read to compute progress
    updated = await repo.get_plan(user.uid, pid) or doc
    step_status = updated.get("stepStatus", {})
    steps = updated.get("steps", [])
    done_count = sum(1 for s in steps if step_status.get(s.get("id"), {}).get("done", False))

    return ToggleStepResponse(
        step_id=step_id,
        done=req.done,
        progress=StepProgress(done=done_count, total=len(steps)),
    )


@router.post("/chat", response_model=ChatMessageResponse)
@router.post("/plans/{pid}/chat", response_model=ChatMessageResponse)
async def recovery_chat(
    req: ChatMessageRequest,
    pid: str = "general",
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> ChatMessageResponse:
    doc = None
    if pid and pid not in ("general", "default", "rec_general", "rec_local_fallback"):
        doc = await repo.get_plan(user.uid, pid)
        if not doc:
            raise HTTPException(status_code=404, detail="Recovery plan not found")

    if not doc:
        doc = {
            "urgency": "critical",
            "summary": "Urgent financial fraud triage and official recovery steps.",
        }

    now_iso = datetime.now(UTC).isoformat()
    user_msg = {"role": "user", "text": req.text, "ts": now_iso}

    answer_text = (
        "• Stay calm and act quickly: Call the National Cyber Crime Helpline at 1930 immediately to place an interbank lien on fraudulent accounts.\n"
        "• File an official written dispute at your home bank branch within 3 days to preserve zero/limited liability under RBI rules.\n"
        "• Caution: Police and banks will never ask for fees to recover money. Never trust third-party 'recovery agents' on Telegram or social media."
    )

    if is_live_llm_enabled():
        try:
            from google.genai import types

            client = get_genai_client()
            prompt = f"""You are the Scam Dojo Compassionate Recovery Advisor helping an Indian cybercrime victim.
A victim who suffered a scam is asking a follow-up question.
Provide calm, empathetic, crisp, and legally sound advice strictly aligned with Indian law, RBI guidelines, and Cyber Helpline 1930.

Plan context:
- Urgency: {doc.get('urgency')}
- Summary: {doc.get('summary')}

User's question:
\"\"\"{req.text}\"\"\"

MANDATORY RESPONSE FORMAT & LENGTH (STRICT):
1. STRICT LENGTH LIMIT: Under 90 words total. Do NOT write long essays or walls of text.
2. Structure your reply in 2 to 3 concise, bullet-pointed action items (or 2-3 short, clean sentences).
3. First point: Empathetic, calm reassurance acknowledging their situation.
4. Next points: Concrete, practical official steps (e.g. Call 1930, bank written grievance quoting RBI circular, cybercrime.gov.in).
5. Explicitly warn against fake recovery agents on Telegram, Instagram, or WhatsApp.
6. If the user mentions extreme distress or self-harm, immediately provide the Tele-MANAS toll-free helpline (14416 / 1800-891-4416).
"""
            config = types.GenerateContentConfig(
                max_output_tokens=500,
                temperature=0.3,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            )
            candidate_models = [settings.MODEL_FAST, settings.MODEL_FALLBACK]
            resp = None
            for candidate_model in candidate_models:
                try:
                    resp = await client.aio.models.generate_content(
                        model=candidate_model,
                        contents=prompt,
                        config=config,
                    )
                    if resp and resp.text:
                        answer_text = resp.text.strip()
                        break
                except Exception as model_err:
                    logger.warning("Recovery chat candidate model %s failed: %s", candidate_model, model_err)
        except Exception as e:
            logger.warning("Recovery chat Gemini call failed: %s", e)

    bot_msg = {"role": "assistant", "text": answer_text, "ts": datetime.now(UTC).isoformat()}
    if pid and pid not in ("general", "default", "rec_general", "rec_local_fallback"):
        await repo.append_plan_chat(user.uid, pid, [user_msg, bot_msg])

    return ChatMessageResponse(role="assistant", text=answer_text, ts=bot_msg["ts"])
