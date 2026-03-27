import os
import time
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from agent import run_agent
from cache import get_cached, set_cache, clear_cache

app = FastAPI(title="AI News Agent API")

# In production, set ALLOWED_ORIGINS to your frontend URL (comma-separated).
# e.g. ALLOWED_ORIGINS=https://your-app.vercel.app
# Defaults to "*" for local development.
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_KEY = "top_ai_news"
# Track if a fetch is already running to avoid parallel runs
_is_fetching = False


@app.get("/")
def root():
    return {"status": "ok", "message": "AI News Agent API"}


@app.get("/news")
async def get_news(refresh: bool = False):
    """
    Returns top 30 AI news stories.
    - Serves from cache (1 hour TTL) by default.
    - Pass ?refresh=true to force a fresh agent run.
    """
    global _is_fetching

    if not refresh:
        cached = get_cached(CACHE_KEY)
        if cached:
            return JSONResponse({
                "articles": cached,
                "cached": True,
                "fetched_at": cached[0].get("_fetched_at", "unknown") if cached else None,
            })

    if _is_fetching:
        # Another request is already running — return stale cache or 202
        cached = get_cached(CACHE_KEY)
        if cached:
            return JSONResponse({"articles": cached, "cached": True, "refreshing": True})
        return JSONResponse({"articles": [], "cached": False, "refreshing": True}, status_code=202)

    _is_fetching = True
    try:
        articles = await run_agent()
        fetched_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        for a in articles:
            a["_fetched_at"] = fetched_at
        set_cache(CACHE_KEY, articles)
        return JSONResponse({"articles": articles, "cached": False, "fetched_at": fetched_at})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        _is_fetching = False


@app.delete("/cache")
def bust_cache():
    """Clear the cache — next /news call will run the agent fresh."""
    clear_cache(CACHE_KEY)
    return {"cleared": True}


@app.get("/health")
def health():
    cached = get_cached(CACHE_KEY)
    return {
        "status": "ok",
        "has_cache": cached is not None,
        "article_count": len(cached) if cached else 0,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
