"""Tests for KnowledgeBaseService."""

from app.services.kb import kb_service


def test_get_scenarios():
    scenarios_en = kb_service.get_scenarios("en")
    assert len(scenarios_en) >= 3
    slugs = [s["slug"] for s in scenarios_en]
    assert "fake_kyc" in slugs
    assert "upi_collect_refund" in slugs
    assert "job_offer_task" in slugs

    scenarios_hi = kb_service.get_scenarios("hi")
    assert len(scenarios_hi) == len(scenarios_en)
    # Hindi titles should not be identical to English titles
    assert scenarios_hi[0]["title"] != scenarios_en[0]["title"]


def test_get_scenario_by_slug():
    scen = kb_service.get_scenario("fake_kyc")
    assert scen is not None
    assert scen["slug"] == "fake_kyc"
    assert "fake_entities" in scen
    assert scen["fake_entities"]["link"].endswith(".example/update")


def test_get_resources():
    res = kb_service.get_resources(country="IN")
    assert len(res) >= 10
    ids = [r["id"] for r in res]
    assert "r_1930" in ids
    assert "r_cybercrime_portal" in ids


def test_fts_search_otp_refund():
    hits = kb_service.search_kb("OTP refund collect request")
    assert len(hits) > 0
    top_hit = hits[0]
    assert "UPI" in top_hit["title"] or "Refund" in top_hit["title"]
