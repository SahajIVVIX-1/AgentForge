import time

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.crew import parse_report
from app.main import create_app
from app.schemas import AgentName, ReviewedReport
from app.tools import is_safe_url

Q = {"question": "What are the main trade-offs of multi-agent LLM systems?"}


def make_settings(**kw):
    base = dict(agentforge_model="ollama/llama3.1", agentforge_api_key="",
                allowed_origins="http://localhost:5173", research_timeout_seconds=5)
    base.update(kw)
    return Settings(_env_file=None, **base)


def good_runner(request, settings, collector, emit):
    emit(AgentName.researcher, "agent_started", "Researcher started.")
    collector.add("https://example.org/a", "Example A", "fetched")
    return ReviewedReport(summary="s", findings=["f"], limitations=["l"],
                          failed_checks=[], report_markdown="# Report"), True


def wait(client, job_id, timeout=5):
    end = time.time() + timeout
    while time.time() < end:
        job = client.get(f"/api/research/{job_id}").json()
        if job["status"] in ("succeeded", "failed"):
            return job
        time.sleep(0.05)
    raise AssertionError("job did not finish")


def client_for(runner, **kw):
    return TestClient(create_app(make_settings(**kw), runner=runner))


def test_health_reports_config_without_leaking_key():
    c = client_for(good_runner, agentforge_api_key="sk-secret")
    body = c.get("/health").json()
    assert body["status"] == "ok" and body["model_configured"] is True
    assert "sk-secret" not in c.get("/health").text


@pytest.mark.parametrize("payload", [{}, {"question": "short"}, {"question": "x" * 1001},
                                     {"question": "valid question here", "depth": "insane"}])
def test_invalid_input_rejected(payload):
    assert client_for(good_runner).post("/api/research", json=payload).status_code == 422


def test_503_when_model_not_configured():
    c = client_for(good_runner, agentforge_model="gemini/gemini-2.0-flash", agentforge_api_key="")
    assert c.post("/api/research", json=Q).status_code == 503


def test_success_flow_returns_real_sources_and_events():
    c = client_for(good_runner)
    r = c.post("/api/research", json=Q)
    assert r.status_code == 202
    job = wait(c, r.json()["id"])
    assert job["status"] == "succeeded" and job["error"] is None
    assert job["result"]["sources"][0]["url"] == "https://example.org/a"
    assert job["result"]["structured"] is True
    kinds = [e["kind"] for e in job["events"]]
    assert kinds[0] == "job_started" and kinds[-1] == "job_finished"


def test_runner_exception_marks_job_failed():
    def boom(*a, **k):
        raise RuntimeError("rate limited")
    c = client_for(boom)
    job = wait(c, c.post("/api/research", json=Q).json()["id"])
    assert job["status"] == "failed" and "rate limited" in job["error"]
    assert job["result"] is None


def test_no_sources_fails_when_required():
    def no_sources(request, settings, collector, emit):
        return ReviewedReport(summary="s", findings=[], limitations=[],
                              report_markdown="x"), True
    c = client_for(no_sources)
    job = wait(c, c.post("/api/research", json=Q).json()["id"])
    assert job["status"] == "failed"
    assert "no_sources_retrieved" in job["result"]["failed_checks"]


def test_no_sources_ok_when_not_required():
    def no_sources(request, settings, collector, emit):
        return ReviewedReport(summary="s", findings=[], limitations=[],
                              report_markdown="x"), True
    c = client_for(no_sources)
    job = wait(c, c.post("/api/research", json={**Q, "require_sources": False}).json()["id"])
    assert job["status"] == "succeeded"


def test_timeout_marks_job_failed():
    def slow(*a, **k):
        time.sleep(3)
    c = client_for(slow, research_timeout_seconds=1)
    job = wait(c, c.post("/api/research", json=Q).json()["id"], timeout=5)
    assert job["status"] == "failed" and "Timed out" in job["error"]


def test_unknown_job_404():
    assert client_for(good_runner).get("/api/research/nope").status_code == 404


def test_cors_only_allowed_origin():
    c = client_for(good_runner)
    ok = c.options("/api/research", headers={"Origin": "http://localhost:5173",
                                             "Access-Control-Request-Method": "POST"})
    bad = c.options("/api/research", headers={"Origin": "https://evil.example",
                                              "Access-Control-Request-Method": "POST"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers


@pytest.mark.parametrize("url,expected", [
    ("https://example.org/page", True), ("http://localhost:8000", False),
    ("http://169.254.169.254/latest", False), ("file:///etc/passwd", False),
    ("http://192.168.1.1", False), ("ftp://example.org", False)])
def test_is_safe_url(url, expected):
    assert is_safe_url(url) is expected


def test_parse_report_fallback_never_fabricates():
    report, structured = parse_report("just some prose, no json", None)
    assert structured is False and report.report_markdown == "just some prose, no json"
    assert report.findings == [] and "structured_output" in report.failed_checks


def test_parse_report_reads_json():
    raw = ('{"summary":"s","findings":["a"],"limitations":[],"failed_checks":[],'
           '"report_markdown":"# R"}')
    report, structured = parse_report(raw, None)
    assert structured is True and report.findings == ["a"]
