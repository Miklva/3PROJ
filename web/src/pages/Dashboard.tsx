import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import "./Dashboard.scss";

type DefaultStat = { name: string; count: number };
type MediaBreakdown = { media_type: "movie" | "tv"; count: number };
type RecentItem = {
  title: string;
  poster_path: string | null;
  media_type: "movie" | "tv";
  tmdb_id: number;
  added_at: string;
  list_name: string;
};

type Stats = {
  defaultStats: DefaultStat[];
  customListCount: number;
  totalUniqueItems: number;
  terminatedBreakdown: MediaBreakdown[];
  recentItems: RecentItem[];
};

const LIST_META: Record<string, { color: string; bg: string }> = {
  "À voir":    { color: "#a78bfa", bg: "rgba(124,58,237,0.12)" },
  "En cours":  { color: "#60a5fa", bg: "rgba(37,99,235,0.12)" },
  "Terminé":   { color: "#4ade80", bg: "rgba(34,197,94,0.12)"  },
  "Abandonné": { color: "#9ca3af", bg: "rgba(156,163,175,0.10)" },
};

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/register"); return; }
    axios
      .get("/api/lists/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
      </div>
    );

  if (!stats) return null;

  const terminatedCount =
    stats.defaultStats.find((s) => s.name === "Terminé")?.count ?? 0;
  const inProgressCount =
    stats.defaultStats.find((s) => s.name === "En cours")?.count ?? 0;

  const totalTerminated = stats.terminatedBreakdown.reduce((a, b) => a + Number(b.count), 0);
  const moviesTerminated = stats.terminatedBreakdown.find((b) => b.media_type === "movie")?.count ?? 0;
  const showsTerminated  = stats.terminatedBreakdown.find((b) => b.media_type === "tv")?.count   ?? 0;

  return (
    <div className="dashboard">
      <div className="dashboard__topbar">
        <Button variant="back" onClick={() => navigate("/profile")}>← Retour au profil</Button>
        <h1 className="dashboard__title">Tableau de bord</h1>
      </div>

      {/* ── Chiffres clés ── */}
      <div className="dashboard__kpi-grid">
        <div className="kpi-card kpi-card--primary">
          <span className="kpi-card__value">{stats.totalUniqueItems}</span>
          <span className="kpi-card__label">Œuvres au total</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__value">{terminatedCount}</span>
          <span className="kpi-card__label">Terminées</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__value">{inProgressCount}</span>
          <span className="kpi-card__label">En cours</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__value">{stats.customListCount}</span>
          <span className="kpi-card__label">Listes personnalisées</span>
        </div>
      </div>

      {/* ── Répartition par liste par défaut ── */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Répartition par statut</h2>
        <div className="dashboard__status-grid">
          {stats.defaultStats.map((s) => {
            const meta = LIST_META[s.name] || { color: "#7c3aed", bg: "rgba(124,58,237,0.1)" };
            const total = stats.defaultStats.reduce((acc, x) => acc + Number(x.count), 0) || 1;
            const pct = Math.round((Number(s.count) / total) * 100);
            return (
              <div key={s.name} className="status-card" style={{ "--status-color": meta.color, "--status-bg": meta.bg } as React.CSSProperties}>
                <span className="status-card__name">{s.name}</span>
                <span className="status-card__count">{s.count}</span>
                <div className="status-card__bar-bg">
                  <div className="status-card__bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="status-card__pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Films vs Séries terminés ── */}
      {totalTerminated > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Films vs Séries terminés</h2>
          <div className="dashboard__breakdown">
            <div className="breakdown-bar">
              <div
                className="breakdown-bar__movies"
                style={{ width: `${Math.round((Number(moviesTerminated) / totalTerminated) * 100)}%` }}
              />
            </div>
            <div className="breakdown-legend">
              <div className="breakdown-legend__item">
                <span className="breakdown-legend__dot dot--movie" />
                <span>Films</span>
                <strong>{moviesTerminated}</strong>
              </div>
              <div className="breakdown-legend__item">
                <span className="breakdown-legend__dot dot--tv" />
                <span>Séries</span>
                <strong>{showsTerminated}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Activité récente ── */}
      {stats.recentItems.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Ajouts récents</h2>
          <div className="dashboard__recent">
            {stats.recentItems.map((item, i) => (
              <div
                key={i}
                className="recent-item"
                onClick={() => navigate(`/media/${item.media_type}/${item.tmdb_id}`)}
              >
                {item.poster_path ? (
                  <img
                    src={`${TMDB_IMG}${item.poster_path}`}
                    alt={item.title}
                    className="recent-item__poster"
                  />
                ) : (
                  <div className="recent-item__poster recent-item__poster--fallback">?</div>
                )}
                <div className="recent-item__info">
                  <span className="recent-item__title">{item.title}</span>
                  <span className="recent-item__meta">
                    {item.media_type === "movie" ? "Film" : "Série"} · {item.list_name}
                  </span>
                  <span className="recent-item__date">
                    {new Date(item.added_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
