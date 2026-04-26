"""Regression: /api/* prefixes and health endpoints must match frontend, Docker, and CI."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_api_health_ok():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "healthy"
    assert "kb_loaded" in body


def test_observations_list_under_api_prefix():
    r = client.get("/api/observations", params={"page": 1, "per_page": 1})
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data


def test_ai_generate_observations_route_exists_not_404():
    """Route must be under /api/ai (not 404). Empty body → 422 when DB is wired; 503 when get_db rejects first (no DATABASE_URL in tests)."""
    r = client.post("/api/ai/generate-observations", json={})
    assert r.status_code != 404
    assert r.status_code in (422, 503)


def test_legacy_paths_not_used_for_observations():
    r = client.get("/observations", params={"page": 1, "per_page": 1})
    assert r.status_code == 404
