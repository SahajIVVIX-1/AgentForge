"""CrewAI crew: Researcher -> Analyst -> Reviewer (sequential)."""
import json
import re
from typing import Callable

from .config import Settings
from .schemas import AgentName, Depth, ResearchRequest, ReviewedReport
from .tools import SourceCollector, WebFetchTool, WebSearchTool

Emit = Callable[[AgentName | None, str, str], None]  # (agent, kind, message)

_DEPTH = {
    Depth.quick: dict(searches=2, pages=1, iters=6),
    Depth.standard: dict(searches=4, pages=2, iters=10),
    Depth.deep: dict(searches=6, pages=4, iters=14),
}


def build_llm(settings: Settings):
    from crewai import LLM

    kwargs = {"model": settings.agentforge_model, "temperature": settings.agentforge_temperature}
    if settings.agentforge_api_key:
        kwargs["api_key"] = settings.agentforge_api_key
    if settings.agentforge_base_url:
        kwargs["base_url"] = settings.agentforge_base_url
    return LLM(**kwargs)


def parse_report(raw: str, pydantic_obj) -> tuple[ReviewedReport, bool]:
    """Return (report, structured). Falls back to raw text, never fabricates fields."""
    if isinstance(pydantic_obj, ReviewedReport):
        return pydantic_obj, True
    text = (raw or "").strip()
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        try:
            return ReviewedReport.model_validate(json.loads(match.group(0))), True
        except Exception:
            pass
    return (
        ReviewedReport(
            summary="",
            findings=[],
            limitations=["The Reviewer did not return structured output; showing raw text."],
            failed_checks=["structured_output"],
            report_markdown=text,
        ),
        False,
    )


def run_crew(
    request: ResearchRequest,
    settings: Settings,
    collector: SourceCollector,
    emit: Emit,
) -> tuple[ReviewedReport, bool]:
    from crewai import Agent, Crew, Process, Task

    cfg = _DEPTH[request.depth]
    llm = build_llm(settings)
    tools = [
        WebSearchTool(collector, settings.search_max_results),
        WebFetchTool(collector, settings.fetch_max_chars),
    ]
    limit = settings.research_timeout_seconds

    researcher = Agent(
        role="Researcher",
        goal="Collect evidence that answers the research question, with source URLs.",
        backstory=(
            "A careful research librarian. You only report what the tools returned. "
            "You never invent sources and never claim to have read a page you did not fetch. "
            "If a tool fails, you say so."
        ),
        tools=tools, llm=llm, allow_delegation=False, verbose=False,
        max_iter=cfg["iters"], max_execution_time=limit,
    )
    analyst = Agent(
        role="Analyst",
        goal="Find patterns, disagreements, gaps and limitations in the evidence.",
        backstory=(
            "A methodical analyst who separates what the evidence says from your "
            "interpretation of it, and labels each clearly."
        ),
        llm=llm, allow_delegation=False, verbose=False,
        max_iter=cfg["iters"], max_execution_time=limit,
    )
    reviewer = Agent(
        role="Reviewer",
        goal="Audit the analysis and produce the final structured report.",
        backstory=(
            "A skeptical editor. You remove or flag unsupported claims, check for "
            "contradictions, and list every check that failed. Only URLs present in "
            "the researcher's notes may be cited."
        ),
        llm=llm, allow_delegation=False, verbose=False,
        max_iter=cfg["iters"], max_execution_time=limit,
    )

    def done(agent: AgentName, nxt: AgentName | None):
        def _cb(_output):
            emit(agent, "agent_finished", f"{agent.value.title()} finished.")
            if nxt:
                emit(nxt, "agent_started", f"{nxt.value.title()} started.")
        return _cb

    research_task = Task(
        description=(
            f"Research question: {request.question}\n\n"
            f"Use web_search up to {cfg['searches']} times and fetch_page for up to "
            f"{cfg['pages']} of the most relevant results. For each claim, note the "
            "source URL it came from and how confident you are. Record anything you "
            "could not verify."
        ),
        expected_output="Bulleted evidence notes: claim, source URL, confidence, unverified items.",
        agent=researcher, callback=done(AgentName.researcher, AgentName.analyst),
    )
    analysis_task = Task(
        description=(
            "Analyze the researcher's notes. Identify patterns, disagreements, gaps and "
            "limitations. Keep 'Evidence' and 'Interpretation' in separate sections."
        ),
        expected_output="Sections: Evidence, Interpretation, Disagreements, Gaps, Limitations.",
        agent=analyst, context=[research_task],
        callback=done(AgentName.analyst, AgentName.reviewer),
    )
    review_task = Task(
        description=(
            "Review the analysis against the researcher's notes. Check for unsupported "
            "claims, missing evidence and contradictions. Produce the final report. "
            "List every failed check in failed_checks (empty list only if none failed). "
            "report_markdown must be a complete Markdown report and may cite only URLs "
            "from the researcher's notes."
        ),
        expected_output=(
            "JSON with keys: summary, findings (list), limitations (list), "
            "failed_checks (list), report_markdown."
        ),
        agent=reviewer, context=[research_task, analysis_task],
        output_pydantic=ReviewedReport,
        callback=done(AgentName.reviewer, None),
    )

    emit(AgentName.researcher, "agent_started", "Researcher started.")
    crew = Crew(
        agents=[researcher, analyst, reviewer],
        tasks=[research_task, analysis_task, review_task],
        process=Process.sequential, verbose=False,
    )
    output = crew.kickoff()
    return parse_report(getattr(output, "raw", "") or str(output), getattr(output, "pydantic", None))
