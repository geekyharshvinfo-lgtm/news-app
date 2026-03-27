# AI Pulse — AI News Agent

A personal AI-powered news app that finds, ranks, and summarises the top 30 AI stories 
from the last 24 hours. Runs as a web app you can install on your smartphone.

---

## What you need first

Get API keys from these three services (all have free tiers):

| Service | URL | Free tier |
|---|---|---|
| Anthropic | console.anthropic.com | Pay-per-use, ~$0.003 per run |
| Tavily | tavily.com | 1,000 searches/month |
| NewsAPI | newsapi.org | 100 requests/day |

---

## Project structure

```
ai-news-agent/
├── backend/
│   ├── main.py        ← FastAPI server
│   ├── agent.py       ← The AI agent loop
│   ├── tools.py       ← Search tool functions
│   ├── cache.py       ← SQLite caching
│   ├── .env.example   ← Copy this to .env and fill keys
│   └── requirements.txt
└── frontend/
    ├── src/App.jsx    ← The full React UI
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Setup — Backend

```bash
cd backend

# 1. Create and activate virtual environment
python -m venv venv
source venv/bin/activate       # Mac/Linux
# venv\Scripts\activate        # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Add your API keys
cp .env.example .env
# Edit .env and paste your three API keys

# 4. Run the server
python main.py
# Server starts at http://localhost:8000
```

Test it's working:
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","has_cache":false,"article_count":0}

curl http://localhost:8000/news
# First call triggers the agent — takes 30-60 seconds
```

---

## Setup — Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Set the backend URL
# Create a .env file:
echo "VITE_API_URL=http://localhost:8000" > .env

# 3. Run the dev server
npm run dev
# Opens at http://localhost:5173
```

---

## Install on your phone

### Deploy first (required for phone install)

**Deploy backend to Railway:**
1. Push your code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select your repo, set root directory to `backend`
4. Add environment variables: ANTHROPIC_API_KEY, TAVILY_API_KEY, NEWS_API_KEY
5. Railway gives you a URL like `https://your-app.railway.app`

**Deploy frontend to Vercel:**
1. Go to vercel.com → New Project → Import from GitHub
2. Set root directory to `frontend`
3. Add environment variable: `VITE_API_URL=https://your-app.railway.app`
4. Deploy — Vercel gives you a URL like `https://ai-pulse.vercel.app`

### Install as app

**Android (Chrome):**
1. Open your Vercel URL in Chrome
2. Tap the three-dot menu (⋮)
3. Tap "Add to Home screen"
4. Done — it's on your home screen like a native app

**iPhone (Safari):**
1. Open your Vercel URL in Safari (must be Safari, not Chrome)
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Done

---

## How it works

1. You tap "Refresh" in the app
2. The app calls `GET /news?refresh=true` on the backend
3. FastAPI runs the AI agent
4. The agent (Claude Sonnet) gets the task: "Find top 30 AI news stories"
5. Claude decides to call `search_tavily` and `search_newsapi` multiple times
   with different queries ("AI model release", "AI startup funding", etc.)
6. Each tool call hits the real API and returns structured results
7. After 6-8 searches, Claude has ~100 raw articles
8. Claude ranks them by importance, deduplicates, writes 2-sentence summaries
9. Returns a JSON array of 30 ranked stories
10. Frontend displays them with category filtering
11. Results are cached for 1 hour — next load is instant

Total time for a fresh fetch: ~30-60 seconds.

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /news` | Returns top 30 stories (from cache if available) |
| `GET /news?refresh=true` | Forces a fresh agent run |
| `DELETE /cache` | Clears the cache |
| `GET /health` | Health check |

---

## Customisation ideas

- **Change categories**: Edit the SYSTEM_PROMPT in `agent.py`
- **Different topics**: Change "AI news" to "crypto news", "biotech news", etc.
- **More stories**: Change 30 to 50 in the system prompt
- **Auto-refresh**: Add a cron job to hit `/news?refresh=true` every hour
- **Push notifications**: Add web push when new stories arrive
