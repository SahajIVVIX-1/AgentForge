"""Research tools. Every URL returned to the report comes from here, so
sources are recorded from real network activity and never invented by the LLM."""
import threading
from urllib.parse import urlparse

import httpx
from crewai.tools import BaseTool
from pydantic import BaseModel, Field, PrivateAttr

from .schemas import Source

_BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"}


class SourceCollector:
    """Thread-safe record of URLs the tools actually touched."""

    def __init__(self, on_event=None):
        self._lock = threading.Lock()
        self._sources: dict[str, Source] = {}
        self._on_event = on_event or (lambda msg: None)

    def add(self, url: str, title: str, how: str) -> None:
        with self._lock:
            existing = self._sources.get(url)
            if existing is None or (how == "fetched" and existing.how != "fetched"):
                self._sources[url] = Source(url=url, title=title, how=how)

    def event(self, message: str) -> None:
        self._on_event(message)

    @property
    def sources(self) -> list[Source]:
        with self._lock:
            return list(self._sources.values())


def is_safe_url(url: str) -> bool:
    """Reject non-http(s) and obvious internal targets (basic SSRF guard)."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"} or not host or host in _BLOCKED_HOSTS:
        return False
    if host.startswith(("10.", "192.168.")) or host.endswith((".local", ".internal")):
        return False
    return True


class _SearchInput(BaseModel):
    query: str = Field(description="Web search query.")


class _FetchInput(BaseModel):
    url: str = Field(description="A URL returned by the web search tool.")


class WebSearchTool(BaseTool):
    name: str = "web_search"
    description: str = (
        "Search the web. Returns titles, URLs and snippets. Only cite URLs "
        "that appear in these results."
    )
    args_schema: type[BaseModel] = _SearchInput
    _collector: SourceCollector = PrivateAttr()
    _max_results: int = PrivateAttr()

    def __init__(self, collector: SourceCollector, max_results: int = 5):
        super().__init__()
        self._collector = collector
        self._max_results = max_results

    def _run(self, query: str) -> str:
        self._collector.event(f"Searching the web: {query}")
        try:
            from ddgs import DDGS

            hits = list(DDGS().text(query, max_results=self._max_results))
        except Exception as exc:  # network / rate limit
            return f"SEARCH FAILED: {exc}. Do not invent results; report this limitation."
        if not hits:
            return "No results found."
        lines = []
        for h in hits:
            url, title = h.get("href", ""), h.get("title", "")
            if url and is_safe_url(url):
                self._collector.add(url, title, "search")
                lines.append(f"- {title}\n  URL: {url}\n  {h.get('body', '')}")
        return "\n".join(lines) or "No usable results."


class WebFetchTool(BaseTool):
    name: str = "fetch_page"
    description: str = "Fetch a web page and return its readable text (truncated)."
    args_schema: type[BaseModel] = _FetchInput
    _collector: SourceCollector = PrivateAttr()
    _max_chars: int = PrivateAttr()

    def __init__(self, collector: SourceCollector, max_chars: int = 6000):
        super().__init__()
        self._collector = collector
        self._max_chars = max_chars

    def _run(self, url: str) -> str:
        if not is_safe_url(url):
            return "REFUSED: URL is not a public http(s) address."
        self._collector.event(f"Reading page: {url}")
        try:
            r = httpx.get(
                url,
                timeout=15,
                follow_redirects=True,
                headers={"User-Agent": "AgentForge/1.0 (research assistant)"},
            )
            r.raise_for_status()
        except Exception as exc:
            return f"FETCH FAILED for {url}: {exc}. Do not claim you read this page."
        text = _html_to_text(r.text)[: self._max_chars]
        self._collector.add(url, _title(r.text) or url, "fetched")
        return text or "Page had no readable text."


def _title(html: str) -> str:
    import re

    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    return " ".join(m.group(1).split())[:200] if m else ""


def _html_to_text(html: str) -> str:
    import re

    html = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    text = re.sub(r"(?s)<[^>]+>", " ", html)
    return " ".join(text.split())
