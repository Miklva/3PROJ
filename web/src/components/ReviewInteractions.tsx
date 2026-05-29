import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./ReviewInteractions.scss";

type Comment = {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
};

type Props = {
  reviewId: number;
  token: string | null;
  currentUserId: number | undefined;
  currentUserRole?: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `il y a ${days}j` : new Date(dateStr).toLocaleDateString("fr-FR");
}

function SmallAvatar({ username, avatar }: { username: string; avatar: string | null }) {
  if (avatar) return <img src={avatar} alt={username} className="ri-avatar" />;
  return (
    <div className="ri-avatar ri-avatar--placeholder">
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ReviewInteractions({
  reviewId,
  token,
  currentUserId,
  currentUserRole,
}: Props) {
  const [liked, setLiked]           = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments]     = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [loadingInit, setLoadingInit]   = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const commentsRes = await axios.get(`/api/reviews/${reviewId}/comments`);
        if (!cancelled) setComments(commentsRes.data);

        if (token) {
          const likeRes = await axios.get(`/api/reviews/${reviewId}/like/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!cancelled) {
            setLiked(likeRes.data.liked);
            setLikesCount(likeRes.data.likes_count);
          }
        } else {
          const likeRes = await axios.get(`/api/reviews/${reviewId}/like/status`).catch(() => null);
          if (!cancelled && likeRes) setLikesCount(likeRes.data.likes_count);
        }
      } catch {
  
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [reviewId, token]);

  const toggleLike = async () => {
    if (!token) return;
    try {
      if (liked) {
        const res = await axios.delete(`/api/reviews/${reviewId}/like`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLiked(false);
        setLikesCount(res.data.likes_count);
      } else {
        const res = await axios.post(
          `/api/reviews/${reviewId}/like`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLiked(true);
        setLikesCount(res.data.likes_count);
      }
    } catch (err: any) {
      console.error("Like error:", err);
    }
  };

  const submitComment = async () => {
    if (!commentInput.trim() || !token || submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(
        `/api/reviews/${reviewId}/comments`,
        { content: commentInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => [...prev, res.data]);
      setCommentInput("");
      setShowComments(true);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!token || !confirm("Supprimer ce commentaire ?")) return;
    try {
      await axios.delete(`/api/reviews/${reviewId}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="review-interactions">
      <div className="ri-actions">
        <button
          className={`ri-btn ri-btn--like ${liked ? "ri-btn--liked" : ""}`}
          onClick={toggleLike}
          disabled={!token || loadingInit}
          title={!token ? "Connectez-vous pour liker" : liked ? "Je n'aime plus" : "J'aime"}
        >
          {liked ? "❤️" : "🤍"}
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>

        <button
          className={`ri-btn ri-btn--comment ${showComments ? "ri-btn--active" : ""}`}
          onClick={() => setShowComments((p) => !p)}
        >
          💬
          {comments.length > 0 && <span>{comments.length}</span>}
          <span className="ri-btn__label">
            {showComments ? "Masquer" : "Commentaires"}
          </span>
        </button>
      </div>

      {showComments && (
        <div className="ri-comments">
          {comments.length === 0 ? (
            <p className="ri-no-comments">Aucun commentaire. Soyez le premier !</p>
          ) : (
            <ul className="ri-comment-list">
              {comments.map((c) => (
                <li key={c.id} className="ri-comment">
                  <SmallAvatar username={c.username} avatar={c.avatar_url} />
                  <div className="ri-comment__body">
                    <div className="ri-comment__top">
                      <Link to={`/profile/${c.user_id}`} className="ri-comment__author">
                        {c.username}
                      </Link>
                      <span className="ri-comment__time">{timeAgo(c.created_at)}</span>
                      {(currentUserId === c.user_id || currentUserRole === "admin") && (
                        <button
                          className="ri-comment__delete"
                          onClick={() => deleteComment(c.id)}
                          title="Supprimer"
                        >✕</button>
                      )}
                    </div>
                    <p className="ri-comment__text">{c.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {token ? (
            <div className="ri-comment-form">
              <textarea
                placeholder="Ajouter un commentaire…"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                rows={2}
                maxLength={1000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />
              <button
                className="ri-comment-form__submit"
                onClick={submitComment}
                disabled={!commentInput.trim() || submitting}
              >
                {submitting ? "…" : "Envoyer"}
              </button>
            </div>
          ) : (
            <p className="ri-guest-msg">
              <Link to="/login">Connectez-vous</Link> pour commenter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}