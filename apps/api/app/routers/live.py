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
    mode: str = "audio",
) -> str:
    """Build system instruction for Gemini Live to act as the dedicated verbatim voice actor for the drill."""
    role_title = f"{persona_name or 'Officer'} from {org_label or 'Cyber Verification'}"
    lang_cadence = (
        "Speak with everyday Hindi and natural English terms (like Aadhaar, OTP, Police, Account, Verification)."
        if lang == "hi"
        else "Speak with an authoritative, stern, urgent Indian English cadence."
    )
    return f"""You are the voice performer for {role_title} in this educational drill on Scam Dojo.
Your output modality is AUDIO.

VOICE TONE & MANNER:
- Voice tone: Authoritative, stern, commanding, demanding, impatient, and hard.
- Cadence: {lang_cadence}

CRITICAL VERBATIM PERFORMANCE RULES:
1. Whenever you receive text from the simulation director, you MUST vocalize and speak ONLY that exact script verbatim, word-for-word.
2. NEVER add introductory commentary, conversational filler, greetings, or acknowledgments (NEVER say "Okay", "Understood", "Listen here", etc. unless it is explicitly inside the provided script).
3. NEVER paraphrase, modify, or generate your own lines.
4. Deliver the exact words of the provided script with full dramatic urgency and authority.
"""


_active_live_connections: dict[str, WebSocket] = {}
_active_live_tasks: dict[str, asyncio.Task] = {}


@router.websocket("/ws/{sid}")
async def gemini_live_websocket(websocket: WebSocket, sid: str) -> None:
    """Bidirectional WebSocket bridging browser audio/video to Gemini Multimodal Live API."""
    mode = websocket.query_params.get("mode", "audio")
    logger.info("live_ws_incoming sid=%s mode=%s", sid, mode)

    # Immediately terminate any existing backend task for this sid/mode
    old_task = _active_live_tasks.get(sid)
    if old_task and not old_task.done():
        logger.info("cancelling_previous_live_backend_task sid=%s new_mode=%s", sid, mode)
        old_task.cancel()
        try:
            await asyncio.wait_for(asyncio.shield(old_task), timeout=0.3)
        except Exception:
            pass

    # Disconnect any previous active WebSocket for this session to guarantee only ONE connection/voice is active
    old_ws = _active_live_connections.get(sid)
    if old_ws and old_ws != websocket:
        logger.info("terminating_previous_live_session sid=%s new_mode=%s", sid, mode)
        try:
            await old_ws.close(code=1000, reason="Superceded by new active mode selection")
        except Exception:
            pass

    await websocket.accept()
    _active_live_connections[sid] = websocket
    current_task = asyncio.current_task()
    if current_task:
        _active_live_tasks[sid] = current_task

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
        logger.debug("session_lookup_skipped sid=%s error=%s", sid, e)

    # Send initial connection acknowledgment to client
    try:
        await websocket.send_json({
            "type": "connected",
            "sessionId": sid,
            "model": LIVE_MODEL,
            "videoPersona": video_persona,
            "mode": mode,
            "message": "Connected to Scam Dojo Gemini Multimodal Live Gateway",
        })
    except (WebSocketDisconnect, Exception) as send_err:
        logger.debug("initial_ack_send_skipped sid=%s error=%s", sid, send_err)
        return

    candidate_models = [LIVE_MODEL, "gemini-2.0-flash-exp"]
    live_session = None
    active_model = LIVE_MODEL

    try:
        # Prepare GenAI client
        client = get_genai_client()
        sys_instruction = build_system_instruction(
            scenario_info, persona_name, org_label, lang=lang, video_persona=video_persona, mode=mode
        )

        # Hard & rough male voice configuration (Fenrir)
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Fenrir"
                    )
                )
            ),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            system_instruction=types.Content(parts=[types.Part(text=sys_instruction)]),
        )
        for candidate_model in candidate_models:
            try:
                live_session_ctx = client.aio.live.connect(model=candidate_model, config=config)
                live_session = await live_session_ctx.__aenter__()
                active_model = candidate_model
                logger.info("gemini_live_session_started sid=%s model=%s", sid, candidate_model)
                break
            except Exception as candidate_err:
                logger.warning("candidate_model_failed model=%s error=%s", candidate_model, candidate_err)
                live_session = None

        if not live_session:
            raise RuntimeError("All Gemini Live candidate models failed to connect")

        try:
            await websocket.send_json({
                "type": "ready",
                "sessionId": sid,
                "model": active_model,
            })
        except (WebSocketDisconnect, Exception) as send_err:
            logger.debug("ready_ack_send_skipped sid=%s error=%s", sid, send_err)
            return

        # Task 1: Gemini Live Server -> WebSocket Client (Keeps running across all conversational turns)
        async def forward_gemini_to_client() -> None:
            while True:
                try:
                    async for response in live_session.receive():
                        server_content = response.server_content
                        if not server_content:
                            continue

                        # Model Turn: 24kHz PCM Audio Chunks
                        if server_content.model_turn:
                            for part in server_content.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    raw_data = part.inline_data.data
                                    if isinstance(raw_data, bytes):
                                        audio_b64 = base64.b64encode(raw_data).decode("utf-8")
                                    else:
                                        audio_b64 = str(raw_data)
                                    await websocket.send_json({
                                        "type": "audio",
                                        "data": audio_b64,
                                        "rate": 24000,
                                    })
                        # Output Audio Transcription (Scammer speech as text) - deduplicate
                        if server_content.output_transcription and server_content.output_transcription.text:
                            await websocket.send_json({
                                "type": "transcript",
                                "role": "scammer",
                                "text": server_content.output_transcription.text,
                            })
                        elif server_content.model_turn:
                            for part in server_content.model_turn.parts:
                                if hasattr(part, "text") and part.text:
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "role": "scammer",
                                        "text": part.text,
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

                except (WebSocketDisconnect, asyncio.CancelledError):
                    break
                except Exception as ex:
                    logger.warning("gemini_receive_error sid=%s error=%s", sid, ex)
                    await asyncio.sleep(0.05)

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
                        # Text prompt to trigger model speech
                        text = msg.get("text", "")
                        if text:
                            clean_text = text.strip()
                            logger.info("live_text_received sid=%s len=%d preview=%s", sid, len(clean_text), clean_text[:60])
                            prompt = f'Read and speak this exact script word-for-word:\n"{clean_text}"'
                            try:
                                await live_session.send_client_content(
                                    turns=types.Content(
                                        role="user",
                                        parts=[types.Part(text=prompt)],
                                    ),
                                    turn_complete=True,
                                )
                                logger.info("send_client_content_success sid=%s", sid)
                            except Exception as text_err:
                                logger.warning("send_client_content_failed sid=%s error=%s, trying send/realtime", sid, text_err)
                                try:
                                    await live_session.send(input=prompt, end_of_turn=True)
                                except Exception:
                                    try:
                                        await live_session.send_realtime_input(text=prompt)
                                    except Exception:
                                        pass

                    elif msg_type == "audio_end":
                        # Hybrid VAD: client microphone paused/stopped
                        await live_session.send_realtime_input(audio_stream_end=True)

                    elif msg_type == "set_persona":
                        # Dynamic persona switch (police vs customs)
                        new_persona = msg.get("persona", "police")
                        logger.info("persona_switched sid=%s persona=%s", sid, new_persona)

                    elif msg_type == "ping":
                        await websocket.send_json({"type": "pong"})

            except (WebSocketDisconnect, asyncio.CancelledError):
                pass
            except Exception as ex:
                logger.warning("client_forward_error sid=%s error=%s", sid, ex)

        # Run both tasks concurrently. The WebSocket lifetime is anchored to client_task.
        gemini_task = asyncio.create_task(forward_gemini_to_client())
        client_task = asyncio.create_task(forward_client_to_gemini())

        try:
            await client_task
        finally:
            gemini_task.cancel()
            try:
                await gemini_task
            except asyncio.CancelledError:
                pass
            if live_session:
                try:
                    await live_session_ctx.__aexit__(None, None, None)
                except Exception:
                    pass

    except Exception as conn_err:
        logger.error("gemini_live_connect_failed sid=%s error=%s", sid, conn_err)
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
        if _active_live_connections.get(sid) == websocket:
            _active_live_connections.pop(sid, None)
        if current_task and _active_live_tasks.get(sid) == current_task:
            _active_live_tasks.pop(sid, None)
        logger.info("live_ws_closed sid=%s", sid)
