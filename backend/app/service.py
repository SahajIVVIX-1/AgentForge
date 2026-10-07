"""In-memory job manager. Jobs run in worker threads; clients poll for status/events."""
import threading
import uuid
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Callable

from .config import Settings
from .schemas import (
    AgentName, Event, JobStatus, JobView, ResearchRequest, ResearchResult, ReviewedReport,
)
from .tools import SourceCollector

# runner(request, collector, emit) -> (report, structured)
Runner = Callable[..., tuple[ReviewedReport, bool]]


class JobManager:
    def __init__(self, settings: Settings, runner: Runner):
        self._settings = settings
        self._runner = runner
        self._jobs: "OrderedDict[str, JobView]" = OrderedDict()
        self._lock = threading.Lock()
        self._pool = ThreadPoolExecutor(max_workers=settings.max_concurrent_jobs)

    # ---- public API -------------------------------------------------------
    def submit(self, request: ResearchRequest) -> JobView:
        job = JobView(
            id=uuid.uuid4().hex, status=JobStatus.queued, question=request.question,
            created_at=datetime.now(timezone.utc), events=[],
        )
        with self._lock:
            self._jobs[job.id] = job
            while len(self._jobs) > self._settings.max_stored_jobs:
                self._jobs.popitem(last=False)
        self._pool.submit(self._run, job.id, request)
        return self.get(job.id)  # type: ignore[return-value]

    def get(self, job_id: str) -> JobView | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return job.model_copy(deep=True) if job else None

    # ---- internals --------------------------------------------------------
    def _emit(self, job_id: str, agent: AgentName | None, kind: str, message: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.events.append(Event(agent=agent, kind=kind, message=message))

    def _finish(self, job_id: str, status: JobStatus, error: str | None = None,
                result: ResearchResult | None = None) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.status, job.error, job.result = status, error, result
                job.finished_at = datetime.now(timezone.utc)
        self._emit(job_id, None, "job_finished" if status == JobStatus.succeeded else "error",
                   "Research completed." if status == JobStatus.succeeded else (error or "Failed."))

    def _run(self, job_id: str, request: ResearchRequest) -> None:
        with self._lock:
            self._jobs[job_id].status = JobStatus.running
        self._emit(job_id, None, "job_started", "Research started.")
        emit = lambda agent, kind, msg: self._emit(job_id, agent, kind, msg)  # noqa: E731
        collector = SourceCollector(on_event=lambda m: emit(AgentName.researcher, "tool_call", m))

        box: dict = {}

        def target():
            try:
                box["out"] = self._runner(request, self._settings, collector, emit)
            except Exception as exc:  # surfaced to the user, never swallowed
                box["err"] = f"{type(exc).__name__}: {exc}"

        t = threading.Thread(target=target, daemon=True)
        t.start()
        t.join(self._settings.research_timeout_seconds)

        if t.is_alive():
            self._finish(job_id, JobStatus.failed,
                         f"Timed out after {self._settings.research_timeout_seconds}s.")
            return
        if "err" in box:
            self._finish(job_id, JobStatus.failed, f"Agent run failed: {box['err']}")
            return

        report, structured = box["out"]
        sources = collector.sources
        result = ResearchResult(
            summary=report.summary, findings=report.findings, limitations=report.limitations,
            failed_checks=report.failed_checks, report_markdown=report.report_markdown,
            sources=sources, structured=structured,
        )
        if request.require_sources and not sources:
            result.failed_checks.append("no_sources_retrieved")
            self._finish(job_id, JobStatus.failed,
                         "Source requirement not met: no sources were retrieved.", result)
            return
        self._finish(job_id, JobStatus.succeeded, None, result)
