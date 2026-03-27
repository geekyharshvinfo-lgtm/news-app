import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CATEGORY_COLORS = {
  Models:      { bg: "#1a1040", accent: "#a78bfa", dot: "#7c3aed" },
  Research:    { bg: "#0d1f2d", accent: "#38bdf8", dot: "#0284c7" },
  Startups:    { bg: "#0f1f14", accent: "#4ade80", dot: "#16a34a" },
  Products:    { bg: "#1f1508", accent: "#fb923c", dot: "#ea580c" },
  Policy:      { bg: "#1f0d0d", accent: "#f87171", dot: "#dc2626" },
  Industry:    { bg: "#0d1a1f", accent: "#2dd4bf", dot: "#0f766e" },
  "Open Source": { bg: "#1a1508", accent: "#fbbf24", dot: "#d97706" },
  Safety:      { bg: "#1a0d1a", accent: "#e879f9", dot: "#a21caf" },
};

const DEFAULT_COLOR = { bg: "#111118", accent: "#94a3b8", dot: "#475569" };

function ImportanceDots({ score }) {
  return (
    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: i < score ? "#e2e8f0" : "#2d2d3a",
            transition: "background 0.2s",
          }}
        />
      ))}
    </div>
  );
}

function NewsCard({ article, style }) {
  const colors = CATEGORY_COLORS[article.category] || DEFAULT_COLOR;
  const [pressed, setPressed] = useState(false);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: "block",
        textDecoration: "none",
        transform: pressed ? "scale(0.985)" : "scale(1)",
        transition: "transform 0.15s ease",
        ...style,
      }}
    >
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.accent}22`,
          borderRadius: "16px",
          padding: "18px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Rank number — large background watermark */}
        <div
          style={{
            position: "absolute",
            top: "-8px",
            right: "14px",
            fontSize: "72px",
            fontFamily: "'DM Serif Display', Georgia, serif",
            color: colors.accent,
            opacity: 0.07,
            lineHeight: 1,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {article.rank}
        </div>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
          {/* Rank badge */}
          <div
            style={{
              minWidth: "28px",
              height: "28px",
              borderRadius: "8px",
              background: `${colors.accent}18`,
              border: `1px solid ${colors.accent}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: colors.accent,
              fontFamily: "'DM Mono', monospace",
              flexShrink: 0,
            }}
          >
            {String(article.rank).padStart(2, "0")}
          </div>

          {/* Category pill */}
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: `${colors.dot}22`,
              border: `1px solid ${colors.dot}55`,
              fontSize: "10px",
              fontWeight: 600,
              color: colors.accent,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {article.category}
          </div>

          {/* Source */}
          <div
            style={{
              fontSize: "11px",
              color: "#4a5568",
              marginLeft: "auto",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {article.source}
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: "15px",
            fontWeight: 600,
            fontFamily: "'DM Serif Display', Georgia, serif",
            color: "#f1f5f9",
            lineHeight: 1.4,
            letterSpacing: "-0.01em",
          }}
        >
          {article.title}
        </h2>

        {/* Summary */}
        <p
          style={{
            margin: "0 0 14px 0",
            fontSize: "13px",
            color: "#94a3b8",
            lineHeight: 1.6,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {article.summary}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <ImportanceDots score={article.importance} />
          <div
            style={{
              fontSize: "11px",
              color: colors.accent,
              fontFamily: "'DM Mono', monospace",
              opacity: 0.7,
            }}
          >
            {article.importance}/10 →
          </div>
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: "#111118",
        border: "1px solid #1e1e2a",
        borderRadius: "16px",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#1e1e2a" }} />
        <div style={{ width: 72, height: 24, borderRadius: 12, background: "#1e1e2a" }} />
      </div>
      <div style={{ height: 18, borderRadius: 6, background: "#1e1e2a", marginBottom: 8 }} />
      <div style={{ height: 14, borderRadius: 6, background: "#161620", marginBottom: 6, width: "90%" }} />
      <div style={{ height: 14, borderRadius: 6, background: "#161620", width: "70%" }} />
    </div>
  );
}

export default function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const loadNews = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let data;
      let firstRequest = true;
      while (true) {
        const url = `${API_BASE}/news${firstRequest && forceRefresh ? "?refresh=true" : ""}`;
        firstRequest = false;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        data = await res.json();
        if (!data.refreshing) break;
        // Agent is still running — poll every 3s until done
        await new Promise((r) => setTimeout(r, 3000));
      }
      const seen = new Set();
      const unique = (data.articles || []).filter((a) => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
      });
      setArticles(unique);
      setFetchedAt(data.fetched_at || null);
      setFromCache(data.cached || false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const categories = ["All", ...Object.keys(CATEGORY_COLORS)];
  const filtered =
    activeCategory === "All"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const formatTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#f1f5f9",
        fontFamily: "'DM Sans', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#0a0a0fee",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1e1e2a",
          padding: "0 16px",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 0 12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "22px",
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "#f8fafc",
                  lineHeight: 1,
                }}
              >
                AI Pulse
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#475569",
                  marginTop: "3px",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {loading
                  ? "loading..."
                  : refreshing
                  ? "agent running..."
                  : fetchedAt
                  ? `${fromCache ? "cached · " : ""}updated ${formatTime(fetchedAt)}`
                  : `${filtered.length} stories`}
              </div>
            </div>

            <button
              onClick={() => loadNews(true)}
              disabled={loading || refreshing}
              style={{
                background: refreshing ? "#1e1e2a" : "#18181f",
                border: "1px solid #2d2d3a",
                borderRadius: "10px",
                padding: "8px 14px",
                color: refreshing ? "#475569" : "#94a3b8",
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
                cursor: refreshing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                  fontSize: "14px",
                }}
              >
                ↻
              </span>
              {refreshing ? "fetching" : "refresh"}
            </button>
          </div>

          {/* Category filter tabs */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "12px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              const colors = CATEGORY_COLORS[cat] || null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    flexShrink: 0,
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: isActive
                      ? `1px solid ${colors ? colors.accent + "88" : "#94a3b8"}`
                      : "1px solid #1e1e2a",
                    background: isActive
                      ? colors ? colors.bg : "#1e1e2a"
                      : "transparent",
                    color: isActive
                      ? colors ? colors.accent : "#e2e8f0"
                      : "#475569",
                    fontSize: "11px",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px 40px" }}>
        {error && (
          <div
            style={{
              background: "#1f0d0d",
              border: "1px solid #7f1d1d",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              color: "#fca5a5",
              fontSize: "13px",
            }}
          >
            <strong>Error:</strong> {error}
            <br />
            <span style={{ opacity: 0.7, fontSize: "12px" }}>
              Make sure your backend is running and API keys are set.
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : refreshing ? (
          <div>
            {/* Show stale articles with overlay while refreshing */}
            {articles.length > 0 && (
              <div style={{ opacity: 0.4, display: "flex", flexDirection: "column", gap: "10px" }}>
                {filtered.slice(0, 5).map((a) => (
                  <NewsCard key={a.url} article={a} index={a.rank} />
                ))}
              </div>
            )}
            <div
              style={{
                position: "fixed",
                bottom: "32px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#18181f",
                border: "1px solid #2d2d3a",
                borderRadius: "20px",
                padding: "12px 20px",
                color: "#94a3b8",
                fontSize: "13px",
                fontFamily: "'DM Mono', monospace",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 8px 32px #00000080",
              }}
            >
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>↻</span>
              Agent searching the web...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#475569",
              padding: "48px 0",
              fontSize: "14px",
            }}
          >
            No stories in this category yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((article, i) => (
              <NewsCard
                key={article.url || i}
                article={article}
                index={i}
                style={{
                  animationDelay: `${i * 30}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
