"""Google Web Risk API service for authoritative URL reputation checking."""

import logging
import urllib.parse
from typing import Any
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

WEBRISK_ENDPOINT = "https://webrisk.googleapis.com/v1/uris:search"


class WebRiskService:
    def __init__(self) -> None:
        self.timeout = 2.5

    def _get_api_key(self) -> str | None:
        key = settings.GOOGLE_API_KEY or settings.GEMINI_API_KEY
        if key and key not in ("test-api-key", "dummy", "fake", ""):
            return key
        return None

    async def check_url(self, url: str) -> dict[str, Any]:
        """Check a URL against the Google Web Risk API.

        Checks for MALWARE, SOCIAL_ENGINEERING, and UNWANTED_SOFTWARE.
        """
        api_key = self._get_api_key()
        if not api_key:
            return {
                "checked": False,
                "isThreat": False,
                "threatTypes": [],
                "summary": "Google Web Risk lookup skipped (API key not configured)",
            }

        normalized_url = url.strip()
        if not normalized_url.startswith(("http://", "https://")):
            normalized_url = f"https://{normalized_url}"

        params = [
            ("threatTypes", "MALWARE"),
            ("threatTypes", "SOCIAL_ENGINEERING"),
            ("threatTypes", "UNWANTED_SOFTWARE"),
            ("uri", normalized_url),
            ("key", api_key),
        ]

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(WEBRISK_ENDPOINT, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    threat = data.get("threat")
                    if threat and threat.get("threatTypes"):
                        threat_types = threat.get("threatTypes", [])
                        return {
                            "checked": True,
                            "isThreat": True,
                            "threatTypes": threat_types,
                            "summary": f"Known malicious URL flagged by Google Web Risk: {', '.join(threat_types)}",
                        }
                    return {
                        "checked": True,
                        "isThreat": False,
                        "threatTypes": [],
                        "summary": "No malicious threat record found in Google Web Risk database",
                    }
                logger.debug("Web Risk API returned status %s: %s", resp.status_code, resp.text)
                return {
                    "checked": False,
                    "isThreat": False,
                    "threatTypes": [],
                    "summary": f"Google Web Risk service returned HTTP {resp.status_code}",
                }
        except Exception as e:
            logger.debug("Google Web Risk query failed or timed out: %s", e)
            return {
                "checked": False,
                "isThreat": False,
                "threatTypes": [],
                "summary": "Google Web Risk check bypassed due to network timeout",
            }


webrisk_service = WebRiskService()
