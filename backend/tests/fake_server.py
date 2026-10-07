"""TEST HARNESS ONLY. Serves the real FastAPI app with a stubbed agent runner so the
frontend flow can be exercised without model credentials. Not used in production.
Run: python -m tests.fake_server   (a question containing 'FAIL' triggers a failure)"""
import time

import uvicorn

from app.config import Settings
from app.main import create_app
from app.schemas import AgentName, ReviewedReport


def fake_runner(request, settings, collector, emit):
    if "FAIL" in request.question:
        emit(AgentName.researcher, "agent_started", "Researcher started.")
        time.sleep(1)
        raise RuntimeError("simulated model outage (429 rate limited)")
    emit(AgentName.researcher, "agent_started", "Researcher started.")
    collector.event("Searching the web: multi-agent LLM trade-offs")
    time.sleep(1.5)
    collector.add("https://example.org/paper", "Example paper (stub)", "fetched")
    collector.event("Reading page: https://example.org/paper")
    time.sleep(1.5)
    emit(AgentName.researcher, "agent_finished", "Researcher finished.")
    emit(AgentName.analyst, "agent_started", "Analyst started.")
    time.sleep(1.5)
    emit(AgentName.analyst, "agent_finished", "Analyst finished.")
    emit(AgentName.reviewer, "agent_started", "Reviewer started.")
    time.sleep(1.5)
    emit(AgentName.reviewer, "agent_finished", "Reviewer finished.")
    return ReviewedReport(
        summary="STUB OUTPUT: this text comes from the test harness, not a model.",
        findings=["Stub finding one.", "Stub finding two."],
        limitations=["Harness data only."],
        failed_checks=[],
        report_markdown="# Stub report\n\nThis is **harness output** used to test rendering.\n\n- item a\n- item b",
    ), True


if __name__ == "__main__":
    s = Settings(_env_file=None, agentforge_model="ollama/stub", allowed_origins="http://localhost:5173")
    uvicorn.run(create_app(s, runner=fake_runner), host="127.0.0.1", port=8000, log_level="warning")
