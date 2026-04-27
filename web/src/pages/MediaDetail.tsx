import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import type { MediaDetail as MediaDetailType } from "../types";
import "./MediaDetail.scss";

const IMG = "https://image.tmdb.org/t/p";
const API = "https://api.themoviedb.org/3";

function formatRuntime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function getYear(date?: string) {
  return date ? new Date(date).getFullYear().toString() : "";
}

function getDirector(media: MediaDetailType) {
  return media.credits?.crew?.find((c) => c.job === "Director")?.name;
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${(hovered || value) >= star ? "star--active" : ""}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
        >★</span>
      ))}
    </div>
  );
}

export default function MediaDetail() {
  const { type, id } = useParams<{ type: "movie" | "tv"; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [media, setMedia] = useState<MediaDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ author: string; text: string }[]>([]);
  const [savedToList, setSavedToList] = useState(false);

  useEffect(() => {
    if (!type || !id) return;
    setLoading(true);
    // TODO remplacer par /api/media/:type/:id a ajouter
    axios.get(`${API}/${type}/${id}`, {
      params: { api_key: import.meta.env.VITE_TMDB_API_KEY, language: "fr-FR", append_to_response: "credits" },
    })
      .then((res) => setMedia({ ...res.data, media_type: type }))
      .catch(() => setError("Impossible de charger les détails."))
      .finally(() => setLoading(false));
  }, [type, id]);

  const submitComment = () => {
    if (!comment.trim() || !user) return;
    // TODO POST /api/media/:type/:id/comments pour plus tard
    setComments((prev) => [...prev, { author: user.username, text: comment }]);
    setComment("");
  };

  if (loading) return <div className="page-center"><div className="spinner" /></div>;
  if (error || !media) return (
    <div className="page-center">
      <p>{error ?? "Œuvre introuvable."}</p>
      <button onClick={() => navigate(-1)}>← Retour</button>
    </div>
  );

  const title = media.title ?? media.name ?? "Inconnu";
  const releaseDate = media.release_date ?? media.first_air_date;
  const runtime = media.runtime
    ? formatRuntime(media.runtime)
    : media.episode_run_time?.[0] ? `${formatRuntime(media.episode_run_time[0])} / épisode` : null;
  const topCast = media.credits?.cast?.slice(0, 8) ?? [];
  const director = getDirector(media);

  return (
    <div className="media-detail">

      {media.backdrop_path && (
        <div className="backdrop">
          <img src={`${IMG}/original${media.backdrop_path}`} alt="" />
        </div>
      )}

      <div className="hero">
        <button className="btn-back" onClick={() => navigate(-1)}>← Retour</button>

        <div className="hero-content">
          {media.poster_path
            ? <img className="poster" src={`${IMG}/w500${media.poster_path}`} alt={title} />
            : <div className="poster poster--empty">Aucune image</div>
          }

          <div className="info">
            <h1>{title} {releaseDate && <span className="year">({getYear(releaseDate)})</span>}</h1>
            {media.tagline && <p className="tagline">"{media.tagline}"</p>}

            {media.genres?.length > 0 && (
              <div className="tags">
                {media.genres.map((g) => <span key={g.id} className="tag">{g.name}</span>)}
              </div>
            )}

            <div className="meta">
              <div className="meta-item">
                <strong>Score TMDB</strong>
                <span>{Math.round(media.vote_average * 10)}%</span>
              </div>
              <div className="meta-item">
                <strong>Score SupContent</strong>
                <span>Pas encore d'avis, soyez le premier !</span>
              </div>
              {releaseDate && (
                <div className="meta-item">
                  <strong>{media.media_type === "movie" ? "Sortie" : "1ère diffusion"}</strong>
                  <span>{new Date(releaseDate).toLocaleDateString("fr-FR")}</span>
                </div>
              )}
              {runtime && <div className="meta-item"><strong>Durée</strong><span>{runtime}</span></div>}
              {media.number_of_seasons && (
                <div className="meta-item">
                  <strong>Saisons</strong>
                  <span>{media.number_of_seasons} saison{media.number_of_seasons > 1 ? "s" : ""} · {media.number_of_episodes} épisodes</span>
                </div>
              )}
              {director && <div className="meta-item"><strong>Réalisateur</strong><span>{director}</span></div>}
            </div>

            {media.overview && <p className="overview">{media.overview}</p>}
          </div>
        </div>
      </div>

      {/* Casting */}
      {topCast.length > 0 && (
        <section className="section">
          <h2>Casting</h2>
          <div className="cast-grid">
            {topCast.map((member) => (
              <div key={member.id} className="cast-card">
                <div className="cast-photo">
                  {member.profile_path
                    ? <img src={`${IMG}/w185${member.profile_path}`} alt={member.name} />
                    : <div className="cast-photo--empty">{member.name.charAt(0)}</div>
                  }
                </div>
                <p className="cast-name">{member.name}</p>
                <p className="cast-role">{member.character}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>Votre avis</h2>
        {user ? (
          <div className="actions">
            <div className="action-card">
              <p>Noter</p>
              <StarRating value={userRating} onChange={setUserRating} />
              {userRating > 0 && <small>{userRating}/5</small>}
            </div>
            <div className="action-card">
              <p>Ajouter à une liste</p>
              <button
                className={`btn-list ${savedToList ? "btn-list--saved" : ""}`}
                onClick={() => setSavedToList((p) => !p)}
              >
                {savedToList ? "✓ Enregistré" : "+ Ma liste"}
              </button>
            </div>
          </div>
        ) : (
          <p className="guest-msg"><Link to="/login">Connectez-vous</Link> pour noter et enregistrer cette œuvre.</p>
        )}
      </section>

      <section className="section">
        <h2>Commentaires</h2>
        {user ? (
          <div className="comment-form">
            <textarea
              rows={3}
              placeholder="Partagez votre avis…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button onClick={submitComment} disabled={!comment.trim()}>Publier</button>
          </div>
        ) : (
          <p className="guest-msg"><Link to="/login">Connectez-vous</Link> pour laisser un commentaire.</p>
        )}

        {comments.length === 0
          ? <p className="no-content">Aucun commentaire pour le moment.</p>
          : comments.map((c, i) => (
            <div key={i} className="comment">
              <strong>{c.author}</strong>
              <p>{c.text}</p>
            </div>
          ))
        }
      </section>

    </div>
  );
}
