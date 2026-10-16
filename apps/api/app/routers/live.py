"""Gemini Multimodal Live API WebSocket router for real-time voice and video simulation.

Enables bidirectional audio and video streaming with Gemini 3.8 Live over WebSockets.
Follows docs/4.agents.md and Google GenAI Live API specifications.
"""

import asyncio
import base64
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.genai import types

from app.agents.runtime import get_genai_client, is_live_llm_enabled
from app.config import settings
from app.deps import _local_repo
from app.services.kb import kb_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/train/live", tags=["live"])

LIVE_MODEL = "gemini-3.8-live"


def build_system_instruction(
    scenario_info: dict[str, Any],
    persona_name: str,
    org_label: str,
    lang: str = "en",
    video_persona: str = "police",
) -> str:
    """Build high-pressure adversarial system prompt for real-time Live call."""
    if video_persona == "customs":
        role_desc = (
            f"You are {persona_name or 'Assistant Commissioner Rajesh Nair'} from {org_label or 'Customs & Narcotics Interdiction, Mumbai Airport'}. "
            "You are conducting an urgent video call. You allege that an international parcel containing narcotics (MDMA) and fake passports "
            "was intercepted with the user's name and Aadhaar details. You demand immediate financial declaration and clearance."
        )
    else:
        role_desc = (
            f"You are {persona_name or 'Inspector D.A. Togav'} from {org_label or 'CBI Cyber Crime Cell, New Delhi'}. "
            "You are conducting a strict, official video/audio call under simulated 'Digital Arrest'. "
            "You allege that the user's Aadhaar was used in 23 money laundering bank accounts in Canara Bank / PNB. "
            "You demand that they stay in an isolated room, look at the camera, and verify their identity."
        )

    lang_note = (
        "Speak in everyday Hindi with natural English words (like Aadhaar, OTP, Police, Account, Court Order, Verification)."
        if lang == "hi"
        else "Speak in authoritative, urgent Indian English with realistic law-enforcement cadence."
    )

    return f"""You are acting as an adversarial scammer in a simulated educational training drill on Scam Dojo (an anti-scam awareness app).
{role_desc}

OBJECTIVES & BEHAVIOR RULES:
1. This is a practice drill to train citizens to recognize urgency, intimidation, and isolation tactics.
2. Speak in short, punchy, conversational turns (1 to 2 sentences at a time). Never monologue.
3. You will receive real-time audio and webcam video frames from the user.
4. If you see the user's video feed or screen, react to it naturally (e.g., 'Citizen, why are you smiling? This is a national security matter! Stay on screen.').
5. Create psychological pressure using:
   - Urgency: Threaten imminent arrest, frozen accounts, or court warrants within 15 minutes.
   - Isolation: Demand that they not speak to family or consult local police.
   - Credential extraction: Press them to confirm their bank name, account balance, or OTP verification code.
6. If the user cites the law (e.g., 'Digital arrest is not legal' or 'I will verify at my local police station'), escalate your authority and threaten obstruction of justice, or test their conviction.
7. {lang_note}
8. Maintain the roleplay throughout the call. Do not break character unless explicitly asked to exit.
"""


@router.websocket("/ws/{sid}")
async def gemini_live_websocket(websocket: WebSocket, sid: str) -> None:
    """Bidirectional WebSocket bridging browser audio/video to Gemini Multimodal Live API."""
    await websocket.accept()
    logger.info("live_ws_connected", sid=sid)

    # Initial session context resolution
    scenario_info: dict[str, Any] = {}
    lang = "en"
    video_persona = "police"
    persona_name = "Inspector D.A. Togav"
    org_label = "CBI Cyber Crime Cell"

    try:
        # Attempt to load session details if available in local SQLite repo
        sess = await _local_repo.get_train_session("dev_user", sid)
        if sess:
            scenario_info = sess.get("scenario", {})
            lang = sess.get("lang", "en")
            scen_slug = scenario_info.get("slug", "")
            if "customs" in scen_slug or "parcel" in scen_slug:
                video_persona = "customs"
            persona_name = scenario_info.get("personaName", persona_name)
            org_label = scenario_info.get("orgLabel", org_label)
    except Exception as e:
        logger.debug("session_lookup_skipped", sid=sid, error=str(e))

    # Send initial connection acknowledgment to client
    await websocket.send_json({
        "type": "connected",
        "sessionId": sid,
        "model": LIVE_MODEL,
        "videoPersona": video_persona,
        "message": "Connected to Scam Dojo Gemini Multimodal Live Gateway",
    })

    # Prepare GenAI client
    client = get_genai_client()
    sys_instruction = build_system_instruction(
        scenario_info, persona_name, org_label, lang=lang, video_persona=video_persona
    )

    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        output_audio_transcription=types.AudioTranscriptionConfig(),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        system_instruction=types.Content(parts=[types.Part(text=sys_instruction)]),
    )

    try:
        async with client.aio.live.connect(model=LIVE_MODEL, config=config) as live_session:
            logger.info("gemini_live_session_started", sid=sid, model=LIVE_MODEL)
            await websocket.send_json({
                "type": "ready",
                "sessionId": sid,
                "model": LIVE_MODEL,
            })

            # Task 1: Gemini Live Server -> WebSocket Client
            async def forward_gemini_to_client() -> None:
                try:
                    async for response in live_session.receive():
                        server_content = response.server_content
                        if not server_content:
                            continue

                        # Model Turn: 24kHz PCM Audio Chunks
                        if server_content.model_turn:
                            for part in server_content.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                    await websocket.send_json({
                                        "type": "audio",
                                        "data": audio_b64,
                                        "rate": 24000,
                                    })

                        # Output Audio Transcription (Scammer speech as text)
                        if server_content.output_transcription and server_content.output_transcription.text:
                            await websocket.send_json({
                                "type": "transcript",
                                "role": "scammer",
                                "text": server_content.output_transcription.text,
                            })

                        # Input Audio Transcription (User speech recognized by Gemini Live)
                        if server_content.input_transcription and server_content.input_transcription.text:
                            await websocket.send_json({
                                "type": "user_transcript",
                                "role": "user",
                                "text": server_content.input_transcription.text,
                            })

                        # Interruption Signal: User spoke while scammer was talking
                        if server_content.interrupted:
                            await websocket.send_json({"type": "interrupted"})

                        # Turn completion
                        if server_content.turn_complete:
                            await websocket.send_json({"type": "turn_complete"})

                except asyncio.CancelledError:
                    pass
                except Exception as ex:
                    logger.warning("gemini_receive_error", error=str(ex))
                    await websocket.send_json({"type": "error", "message": str(ex)})

            # Task 2: WebSocket Client -> Gemini Live Server
            async def forward_client_to_gemini() -> None:
                try:
                    while True:
                        raw_data = await websocket.receive_text()
                        msg = json.loads(raw_data)
                        msg_type = msg.get("type")

                        if msg_type == "audio":
                            # PCM 16kHz mono audio chunk
                            chunk_b64 = msg.get("data", "")
                            if chunk_b64:
                                pcm_bytes = base64.b64decode(chunk_b64)
                                await live_session.send_realtime_input(
                                    audio=types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
                                )

                        elif msg_type == "video":
                            # User webcam JPEG frame
                            frame_b64 = msg.get("data", "")
                            if frame_b64:
                                # Strip data URL prefix if present
                                if "," in frame_b64:
                                    frame_b64 = frame_b64.split(",", 1)[1]
                                frame_bytes = base64.b64decode(frame_b64)
                                await live_session.send_realtime_input(
                                    video=types.Blob(data=frame_bytes, mime_type="image/jpeg")
                                )

                        elif msg_type == "text":
                            # Text prompt / verbal defense
                            text = msg.get("text", "")
                            if text:
                                await live_session.send_realtime_input(text=text)

                        elif msg_type == "audio_end":
                            # Hybrid VAD: client microphone paused/stopped
                            await live_session.send_realtime_input(audio_stream_end=True)

                        elif msg_type == "set_persona":
                            # Dynamic persona switch (police vs customs)
                            new_persona = msg.get("persona", "police")
                            logger.info("persona_switched", sid=sid, persona=new_persona)

                        elif msg_type == "ping":
                            await websocket.send_json({"type": "pong"})

                except (WebSocketDisconnect, asyncio.CancelledError):
                    pass
                except Exception as ex:
                    logger.warning("client_forward_error", error=str(ex))

            # Run both loops concurrently
            gemini_task = asyncio.create_task(forward_gemini_to_client())
            client_task = asyncio.create_task(forward_client_to_gemini())

            done, pending = await asyncio.wait(
                [gemini_task, client_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for t in pending:
                t.cancel()

    except Exception as conn_err:
        logger.error("gemini_live_connect_failed", error=str(conn_err))
        # Graceful fallback: notify client of simulated mode
        await websocket.send_json({
            "type": "fallback_mode",
            "message": f"Gemini Live direct streaming fell back: {conn_err}",
        })
        # Keep socket open to receive text/audio fallback
        try:
            while True:
                msg_raw = await websocket.receive_text()
                msg = json.loads(msg_raw)
                if msg.get("type") == "text":
                    text = msg.get("text", "")
                    await websocket.send_json({
                        "type": "transcript",
                        "role": "scammer",
                        "text": f"This is {persona_name}. You must stay on line and answer my questions immediately!",
                    })
                    await websocket.send_json({"type": "turn_complete"})
                elif msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            pass
    finally:
        logger.info("live_ws_closed", sid=sid)
