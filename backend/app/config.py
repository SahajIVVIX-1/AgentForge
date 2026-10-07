"""Environment-driven configuration. No secrets are hardcoded."""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Any LiteLLM-style model string: "gemini/gemini-2.0-flash",
    # "groq/llama-3.3-70b-versatile", "ollama/llama3.1", "openai/gpt-4o-mini", ...
    agentforge_model: str = "gemini/gemini-2.0-flash"
    # Provider API key. Leave empty for local models (e.g. Ollama).
    agentforge_api_key: str = ""
    # Optional custom endpoint, e.g. http://localhost:11434 for Ollama.
    agentforge_base_url: str = ""
    agentforge_temperature: float = 0.2

    # Comma-separated list of allowed browser origins.
    allowed_origins: str = "http://localhost:5173"

    # Limits
    research_timeout_seconds: int = Field(default=600, ge=1)
    max_concurrent_jobs: int = Field(default=2, ge=1)
    max_stored_jobs: int = Field(default=50, ge=1)
    search_max_results: int = Field(default=5, ge=1, le=10)
    fetch_max_chars: int = Field(default=6000, ge=500)

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def model_configured(self) -> bool:
        """Local providers (ollama, lm_studio) need no key; others do."""
        if self.agentforge_api_key:
            return True
        return self.agentforge_model.split("/", 1)[0] in {"ollama", "ollama_chat", "lm_studio"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
