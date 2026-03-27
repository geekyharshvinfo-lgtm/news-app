import httpx
import os
from datetime import datetime, timedelta

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")


async def search_tavily(query: str, max_results: int = 10) -> list[dict]:
    """Search web via Tavily — returns clean structured results for LLM."""
    if not TAVILY_API_KEY:
        return []
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": max_results,
                    "include_published_date": True,
                },
            )
            data = resp.json()
            results = []
            for r in data.get("results", []):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "snippet": r.get("content", "")[:400],
                    "published_date": r.get("published_date", ""),
                    "source": "tavily",
                })
            return results
        except Exception as e:
            print(f"Tavily error: {e}")
            return []


async def search_newsapi(query: str, max_results: int = 10) -> list[dict]:
    """Search NewsAPI for recent headlines."""
    if not NEWS_API_KEY:
        return []
    from_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "from": from_date,
                    "sortBy": "publishedAt",
                    "pageSize": max_results,
                    "language": "en",
                    "apiKey": NEWS_API_KEY,
                },
            )
            data = resp.json()
            results = []
            for a in data.get("articles", []):
                if a.get("title") == "[Removed]":
                    continue
                results.append({
                    "title": a.get("title", ""),
                    "url": a.get("url", ""),
                    "snippet": a.get("description", "") or a.get("content", "")[:400],
                    "published_date": a.get("publishedAt", ""),
                    "source": a.get("source", {}).get("name", "newsapi"),
                })
            return results
        except Exception as e:
            print(f"NewsAPI error: {e}")
            return []


# Map tool names to actual async functions
TOOL_FUNCTIONS = {
    "search_tavily": search_tavily,
    "search_newsapi": search_newsapi,
}

# Tool schemas handed to the LLM
TOOL_SCHEMAS = [
    {
        "name": "search_tavily",
        "description": (
            "Search the web for recent AI news using Tavily. "
            "Best for open-ended queries. Returns title, URL, snippet, date."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query, e.g. 'AI model release March 2026'",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Number of results to return (default 10, max 15)",
                    "default": 10,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "search_newsapi",
        "description": (
            "Search NewsAPI for recent AI headlines. "
            "Best for keyword-specific news. Returns title, URL, snippet, date, source name."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Keyword query, e.g. 'artificial intelligence startup'",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Number of results to return (default 10, max 20)",
                    "default": 10,
                },
            },
            "required": ["query"],
        },
    },
]
