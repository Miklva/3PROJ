import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import MediaCard from "../components/MediaCard";
import Button from "../components/Button";
import "./ListDetail.scss";

type ListItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  added_at: string;
};

type ListData = {
  id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  is_public: boolean;
  is_owner: boolean;
  items: ListItem[];
};

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [list, setList] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPublic, setEditPublic] = useState(false);

  useEffect(() => {
    axios
      .get(`/api/lists/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((res) => {
        setList(res.data);
        setEditName(res.data.name);
        setEditDesc(res.data.description || "");
        setEditPublic(res.data.is_public);
      })
      .catch(() => navigate("/profile"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!list) return;
    try {
      await axios.put(
        `/api/lists/${list.id}`,
        { name: editName, description: editDesc, is_public: editPublic },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setList((prev) =>
        prev
          ? { ...prev, name: editName, description: editDesc || null, is_public: editPublic }
          : null
      );
      setIsEditing(false);
    } catch (err) {
      console.error("Erreur mise à jour liste", err);
    }
  };

  const handleRemoveItem = async (tmdb_id: number) => {
    if (!list) return;
    try {
      await axios.delete(`/api/lists/${list.id}/items/${tmdb_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList((prev) =>
        prev ? { ...prev, items: prev.items.filter((i) => i.tmdb_id !== tmdb_id) } : null
      );
    } catch (err) {
      console.error("Erreur suppression item", err);
    }
  };

  if (loading)
    return (
      <div className="list-detail-loading">
        <div className="spinner" />
      </div>
    );

  if (!list) return null;

  return (
    <div className="list-detail">
      <Button variant="back" onClick={() => navigate("/profile")}>Retour</Button>

      <div className="list-detail__header">
        {isEditing ? (
          <div className="list-detail__edit-form">
            <input
              className="list-detail__edit-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nom de la liste…"
            />
            <textarea
              className="list-detail__edit-textarea"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description (optionnel)…"
              rows={2}
            />
            <label className="list-detail__toggle">
              <input
                type="checkbox"
                checked={editPublic}
                onChange={(e) => setEditPublic(e.target.checked)}
              />
              <span>Rendre publique</span>
            </label>
            <div className="list-detail__edit-actions">
              <Button variant="ghost" onClick={handleSave}>Sauvegarder</Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Annuler</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="list-detail__title-row">
              <h1>{list.name}</h1>
              <div className="list-detail__badges">
                {list.is_default && (
                  <span className="list-detail__badge badge--default">Liste par défaut</span>
                )}
                {!list.is_default && (
                  <span className={`list-detail__badge ${list.is_public ? "badge--public" : "badge--private"}`}>
                    {list.is_public ? "Publique" : "Privée"}
                  </span>
                )}
              </div>
              {list.is_owner && !list.is_default && (
                <Button variant="ghost" onClick={() => setIsEditing(true)}>Modifier</Button>
              )}
            </div>
            {list.description && (
              <p className="list-detail__desc">{list.description}</p>
            )}
          </>
        )}
        <p className="list-count">
          {list.items.length} œuvre{list.items.length !== 1 ? "s" : ""}
        </p>
      </div>

      {list.items.length === 0 ? (
        <p className="list-empty">Aucune œuvre dans cette liste</p>
      ) : (
        <div className="list-grid">
          {list.items.map((item) => (
            <div key={`${item.tmdb_id}-${item.media_type}`} className="list-grid__item">
              <MediaCard
                media={{
                  id: item.tmdb_id,
                  media_type: item.media_type,
                  title: item.title,
                  poster_path: item.poster_path,
                }}
              />
              {list.is_owner && (
                <button
                  className="list-grid__remove"
                  onClick={() => handleRemoveItem(item.tmdb_id)}
                  title="Retirer de la liste"
                >
                   x
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}