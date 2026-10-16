"""Tests for Gemini Multimodal Live WebSocket router."""

from fastapi.testclient import TestClient

from app.main import app


def test_live_websocket_connect_and_ping():
    client = TestClient(app)
    with client.websocket_connect("/v1/train/live/ws/test-sim-session") as ws:
        # First message is connection acknowledgment
        init_data = ws.receive_json()
        assert init_data["type"] == "connected"
        assert init_data["sessionId"] == "test-sim-session"
        assert "gemini" in init_data["model"].lower()

        # Send ping
        ws.send_json({"type": "ping"})
        pong_data = ws.receive_json()
        # Either ready or pong or fallback
        assert pong_data["type"] in ("ready", "pong", "fallback_mode")
