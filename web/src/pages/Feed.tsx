import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import "./Feed.scss";

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

type FeedEvent = {
  type: "review" | "list_add";
  event_id: number;
  created_at: string;
  user_id: number;
  username: string;
  avatar_url: string | null;
  // review fields
  rating?: number | null;
  comment?: string | null;
  tmdb_id?: number;
  media_type?: "movie" | "tv";
  likes_count?: number;
  comments_count?: number;
  // list_add fields
  list_name?: string | null;
  item_title?: string | null;
  poster_path?: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Stars({ value }: { value: number | null | undefined }) {
  if (!value) return null;
  return (
    <span className="feed-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= value ? "star star--on" : "star"}>★</span>
      ))}
    </span>
  );
}

function Avatar({ user, avatar }: { user: string; avatar: string | null }) {
  if (avatar) return <img src={avatar} alt={user} className="feed-avatar" />;
  return <div className="feed-avatar feed-avatar--placeholder">{user.charAt(0).toUpperCase()}</div>;
}

function ReviewEvent({ ev, token }: { ev: FeedEvent; token: string | null }) {
  const [liked, setLiked]           = useState(false);
  const [likesCount, setLikesCount] = useState(ev.likes_count ?? 0);
  const [commentsCount]             = useState(ev.comments_count ?? 0);

  const toggleLike = async () => {
    if (!token) return;
    try {
      if (liked) {
        const res = await axios.delete(`/api/reviews/${ev.event_id}/like`, { headers: { Authorization: `Bearer ${token}` } });
        setLiked(false);
        setLikesCount(res.data.likes_count);
      } else {
        const res = await axios.post(`/api/reviews/${ev.event_id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setLiked(true);
        setLikesCount(res.data.likes_count);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const mediaLabel = ev.media_type === "movie" ? "film" : "série";

  return (
    <div className="feed-card">
      <div className="feed-card__header">
        <Link to={`/profile/${ev.user_id}`} className="feed-card__user">
          <Avatar user={ev.username} avatar={ev.avatar_url} />
          <strong>{ev.username}</strong>
        </Link>
        <span className="feed-card__time">{timeAgo(ev.created_at)}</span>
      </div>

      <p className="feed-card__action">
        a noté un{mediaLabel === "série" ? "e" : ""} <span className="feed-card__type">{mediaLabel}</span>
        {ev.rating && <> — <Stars value={ev.rating} /></>}
      </p>

      {ev.comment && (
        <blockquote className="feed-card__comment">{ev.comment}</blockquote>
      )}

      <div className="feed-card__footer">
        {ev.tmdb_id && (
          <Link to={`/media/${ev.media_type}/${ev.tmdb_id}`} className="feed-card__link">
            Voir le {mediaLabel} →
          </Link>
        )}

        <div className="feed-card__actions">
          {token && (
            <button
              className={`feed-card__like ${liked ? "feed-card__like--active" : ""}`}
              onClick={toggleLike}
              title={liked ? "Je n'aime plus" : "J'aime"}
            >
              {liked ? "❤️" : "🤍"} {likesCount > 0 && <span>{likesCount}</span>}
            </button>
          )}
          <Link to={`/media/${ev.media_type}/${ev.tmdb_id}`} className="feed-card__comment-count">
            💬 {commentsCount}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ListAddEvent({ ev }: { ev: FeedEvent }) {
  return (
    <div className="feed-card feed-card--list">
      <div className="feed-card__header">
        <Link to={`/profile/${ev.user_id}`} className="feed-card__user">
          <Avatar user={ev.username} avatar={ev.avatar_url} />
          <strong>{ev.username}</strong>
        </Link>
        <span className="feed-card__time">{timeAgo(ev.created_at)}</span>
      </div>

      <div className="feed-card__list-body">
        {ev.poster_path ? (
          <img src={`${TMDB_IMG}${ev.poster_path}`} alt={ev.item_title ?? ""} className="feed-card__poster" />
        ) : (
          <div className="feed-card__poster feed-card__poster--empty">🎬</div>
        )}
        <p className="feed-card__action">
          a ajouté <strong>{ev.item_title}</strong> dans la liste <em>"{ev.list_name}"</em>
        </p>
      </div>
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const [events, setEvents]   = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [empty, setEmpty]     = useState(false);

  const loadFeed = useCallback(async (p: number, reset = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/feed?page=${p}&limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { events: newEvents, hasMore: more } = res.data;
      setEvents((prev) => (reset ? newEvents : [...prev, ...newEvents]));
      setHasMore(more);
      setEmpty(p === 1 && newEvents.length === 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadFeed(1, true);
  }, [user]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadFeed(next);
  };

  return (
    <div className="feed-page">
      <div className="feed-page__header">
        <h1>Fil d'actualité</h1>
        <p className="feed-page__sub">Les dernières activités des personnes que vous suivez</p>
      </div>

      {loading && events.length === 0 ? (
        <div className="feed-loading">
          <div className="spinner" />
        </div>
      ) : empty ? (
        <div className="feed-empty">
          <span className="feed-empty__icon">👥</span>
          <p>Votre fil est vide pour l'instant.</p>
          <p>Suivez des utilisateurs pour voir leur activité ici !</p>
          <button className="feed-empty__btn" onClick={() => navigate("/search")}>
            Découvrir des utilisateurs
          </button>
        </div>
      ) : (
        <div className="feed-list">
          {events.map((ev) =>
            ev.type === "review" ? (
              <ReviewEvent key={`r-${ev.event_id}`} ev={ev} token={token} />
            ) : (
              <ListAddEvent key={`l-${ev.event_id}`} ev={ev} />
            )
          )}

          {hasMore && (
            <button className="feed-more" onClick={loadMore} disabled={loading}>
              {loading ? "Chargement…" : "Charger plus"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}