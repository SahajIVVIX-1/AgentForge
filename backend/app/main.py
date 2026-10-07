"""FastAPI entrypoint."""
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .crew import run_crew
from .schemas import JobView, ResearchRequest
from .service import JobManager

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("agentforge")


def create_app(settings: Settings | None = None, runner=run_crew) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="AgentForge API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware, allow_origins=settings.origins,
        allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
    )
    jobs = JobManager(settings, runner)
    if not settings.model_configured:
        log.warning("No model credentials configured; /api/research will return 503.")

    @app.get("/health")
    def health():
        # Reports configuration only; the key itself is never returned.
        return {"status": "ok", "model": settings.agentforge_model,
                "model_configured": settings.model_configured}

    @app.post("/api/research", response_model=JobView, status_code=202)
    def start_research(req: ResearchRequest):
        if not settings.model_configured:
            raise HTTPException(503, "No model is configured on the server. "
                                     "Set AGENTFORGE_MODEL and AGENTFORGE_API_KEY.")
        return jobs.submit(req)

    @app.get("/api/research/{job_id}", response_model=JobView)
    def get_research(job_id: str):
        job = jobs.get(job_id)
        if job is None:
            raise HTTPException(404, "Job not found (it may have expired).")
        return job

    return app


app = create_app()
