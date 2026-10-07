"""Request/response models shared by the API and the crew."""
from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class Depth(str, Enum):
    quick = "quick"
    standard = "standard"
    deep = "deep"


class ResearchRequest(BaseModel):
    question: str = Field(min_length=10, max_length=1000)
    depth: Depth = Depth.standard
    require_sources: bool = True

    @field_validator("question")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 10:
            raise ValueError("Question must be at least 10 characters.")
        return v


class Source(BaseModel):
    url: str
    title: str = ""
    how: str  # "search" (appeared in results) or "fetched" (page actually read)


class ReviewedReport(BaseModel):
    """Structured output requested from the Reviewer agent."""
    summary: str
    findings: list[str]
    limitations: list[str]
    failed_checks: list[str] = []
    report_markdown: str


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class AgentName(str, Enum):
    researcher = "researcher"
    analyst = "analyst"
    reviewer = "reviewer"


class Event(BaseModel):
    at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    agent: AgentName | None = None
    kind: str  # job_started | agent_started | tool_call | agent_finished | job_finished | error
    message: str


class ResearchResult(BaseModel):
    summary: str
    findings: list[str]
    limitations: list[str]
    failed_checks: list[str]
    report_markdown: str
    sources: list[Source]
    structured: bool  # False if the Reviewer's output could not be parsed


class JobView(BaseModel):
    id: str
    status: JobStatus
    question: str
    created_at: datetime
    finished_at: datetime | None = None
    events: list[Event]
    result: ResearchResult | None = None
    error: str | None = None
