import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import type { MediaDetail as MediaDetailType } from "../types";
import Button from "../components/Button";
import "./MediaDetail.scss";

const IMG = "https://image.tmdb.org/t/p";
const API = "https://api.themoviedb.org/3";

type Review = {
  id: number;
  username: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
};

type List = { id: number; name: string };

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

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="review-card">
      <div className="review-card__header">
        <strong>{review.username}</strong>
        {review.rating && (
          <span className="review-card__rating">
            {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
          </span>
        )}
        <span className="review-card__date">
          {new Date(review.created_at).toLocaleDateString("fr-FR")}
        </span>
      </div>
      {review.comment && <p className="review-card__comment">{review.comment}</p>}
    </div>
  );
}

export default function MediaDetail() {
  const { type, id } = useParams<{ type: "movie" | "tv"; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const [media, setMedia] = useState<MediaDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | "">("");
  const [addingToList, setAddingToList] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newListName, setNewListName] = useState("");

  useEffect(() => {
    if (!type || !id) return;
    setLoading(true);
    axios
      .get(`${API}/${type}/${id}`, {
        params: { api_key: import.meta.env.VITE_TMDB_API_KEY, language: "fr-FR", append_to_response: "credits" },
      })
      .then((res) => setMedia({ ...res.data, media_type: type }))
      .catch(() => setError("Impossible de charger les détails."))
      .finally(() => setLoading(false));
  }, [type, id]);

  const fetchReviews = () => {
    axios.get(`/api/reviews/${type}/${id}`)
      .then((res) => { setReviews(res.data.reviews); setAverage(res.data.average); })
      .catch(console.error);
  };

  useEffect(() => { if (type && id) fetchReviews(); }, [type, id]);

  useEffect(() => {
    if (!user || !token) return;
    axios.get("/api/lists/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { setLists(res.data); if (res.data.length > 0) setSelectedListId(res.data[0].id); })
      .catch(console.error);
  }, [user]);

  const submitReview = async () => {
    if (!user || !token) return;
    setSubmitting(true);
    try {
      await axios.post(
        `/api/reviews/${type}/${id}`,
        { rating: userRating || null, comment: comment.trim() || null },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setComment("");
      fetchReviews();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Erreur lors de l'envoi.");
    } finally { setSubmitting(false); }
  };

  const addToList = async () => {
    if (!selectedListId || !media) return;
    setAddingToList(true);
    try {
      await axios.post(
        `/api/lists/${selectedListId}/items`,
        { tmdb_id: media.id, media_type: media.media_type, title, poster_path: media.poster_path },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Ajouté à la liste !");
    } catch { alert("Erreur lors de l'ajout."); }
    finally { setAddingToList(false); }
  };

  const createAndAdd = async () => {
    if (!newListName.trim()) return;
    try {
      const res = await axios.post("/api/lists", { name: newListName }, { headers: { Authorization: `Bearer ${token}` } });
      const newList = res.data;
      setLists((prev) => [...prev, newList]);
      setSelectedListId(newList.id);
      setNewListName("");
      setShowCreateInput(false);
    } catch { alert("Erreur lors de la création."); }
  };

  if (loading) return <div className="page-center"><div className="spinner" /></div>;
  if (error || !media)
    return (
      <div className="page-center">
        <p>{error ?? "Œuvre introuvable."}</p>
        <Button variant="back" onClick={() => navigate(-1)}>← Retour</Button>
      </div>
    );

  const title = media.title ?? media.name ?? "Inconnu";
  const releaseDate = media.release_date ?? media.first_air_date;
  const runtime = media.runtime
    ? formatRuntime(media.runtime)
    : media.episode_run_time?.[0] ? `${formatRuntime(media.episode_run_time[0])} / épisode` : null;
  const topCast = media.credits?.cast?.slice(0, 50) ?? [];
  const directors = media.media_type === "movie"
    ? (media.credits?.crew?.filter((c) => c.job === "Director") ?? [])
    : (media.created_by ?? []);
  const director = getDirector(media);

  return (
    <div className="media-detail">
      {media.backdrop_path && (
        <div className="backdrop">
          <img src={`${IMG}/original${media.backdrop_path}`} alt="" />
        </div>
      )}

      <div className="hero">
        <Button variant="back" onClick={() => navigate(-1)}>← Retour</Button>

        <div className="hero-content">
          {media.poster_path ? (
            <img className="poster" src={`${IMG}/w500${media.poster_path}`} alt={title} />
          ) : (
            <div className="poster poster--empty">Aucune image</div>
          )}

          <div className="info">
            <h1>{title}{" "}{releaseDate && <span className="year">({getYear(releaseDate)})</span>}</h1>
            {media.tagline && <p className="tagline">"{media.tagline}"</p>}

            {media.genres?.length > 0 && (
              <div className="tags">
                {media.genres.map((g) => <span key={g.id} className="tag">{g.name}</span>)}
              </div>
            )}

            <div className="meta">
              <div className="meta-item"><strong>Score TMDB</strong><span>{Math.round(media.vote_average * 10)}%</span></div>
              <div className="meta-item">
                <strong>Score SupContent</strong>
                <span>{average !== null ? `${average.toFixed(1)}/5 (${reviews.length} avis)` : "Pas encore d'avis, soyez le premier !"}</span>
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

      {directors.length > 0 && (
        <section className="section">
          <h2>Réalisation</h2>
          <div className="cast-grid">
            {directors.map((member) => (
              <div key={member.id} className="cast-card">
                <div className="cast-photo">
                  {member.profile_path ? (
                    <img src={`${IMG}/w185${member.profile_path}`} alt={member.name} />
                  ) : (
                    <div className="cast-photo--empty">{member.name.charAt(0)}</div>
                  )}
                </div>
                <p className="cast-name">{member.name}</p>
                <p className="cast-role">{media.media_type === "movie" ? "Réalisateur" : "Créateur"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {topCast.length > 0 && (
        <section className="section">
          <h2>Casting</h2>
          <div className="cast-grid">
            {topCast.map((member) => (
              <div key={member.id} className="cast-card">
                <div className="cast-photo">
                  {member.profile_path ? (
                    <img src={`${IMG}/w185${member.profile_path}`} alt={member.name} />
                  ) : (
                    <div className="cast-photo--empty">{member.name.charAt(0)}</div>
                  )}
                </div>
                <p className="cast-name">{member.name}</p>
                <p className="cast-role">{member.character}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>Avis de la communauté</h2>

        {user ? (
          <div className="review-form">
            <p className="review-form__label">Votre note</p>
            <StarRating value={userRating} onChange={setUserRating} />

            <textarea rows={3} placeholder="Partagez votre avis… (optionnel)"
              value={comment} onChange={(e) => setComment(e.target.value)} />

            <div className="review-form__actions">
              <div className="list-selector">
                <select value={selectedListId} onChange={(e) => setSelectedListId(Number(e.target.value))}>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <Button variant="icon" onClick={addToList} disabled={addingToList || !selectedListId}>
                  {addingToList ? "…" : "+"}
                </Button>
              </div>

              <Button variant="ghost" onClick={submitReview} disabled={submitting || (!userRating && !comment.trim())}>
                {submitting ? "Envoi…" : "Publier"}
              </Button>
            </div>

            <Button variant="ghost" onClick={() => setShowCreateInput((p) => !p)}>+ Nouvelle liste</Button>
            {showCreateInput && (
              <div className="list-create-inline">
                <input type="text" placeholder="Nom de la liste…" value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createAndAdd()} autoFocus />
                <Button variant="ghost" onClick={createAndAdd}>Créer</Button>
              </div>
            )}
          </div>
        ) : (
          <p className="guest-msg">
            <Link to="/login">Connectez-vous</Link> pour noter, commenter et enregistrer cette œuvre.
          </p>
        )}

        <div className="review-list">
          {reviews.length === 0 ? (
            <p className="no-content">Aucun avis pour le moment.</p>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} review={r} />)
          )}
        </div>
      </section>
    </div>
  );
}
