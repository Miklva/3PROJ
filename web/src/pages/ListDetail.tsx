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
  items: ListItem[];
};

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [list, setList] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`/api/lists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setList(res.data))
      .catch(() => navigate("/profile"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="list-detail-loading">
        <div className="spinner" />
      </div>
    );

  if (!list) return null;

  return (
    <div className="list-detail">
      <Button variant="back" onClick={() => navigate("/profile")}>
        ← Retour
      </Button>

      <h1>{list.name}</h1>
      <p className="list-count">
        {list.items.length} œuvre{list.items.length !== 1 ? "s" : ""}
      </p>

      {list.items.length === 0 ? (
        <p className="list-empty">Aucune œuvre dans cette liste</p>
      ) : (
        <div className="list-grid">
          {list.items.map((item) => (
            <MediaCard
              key={`${item.tmdb_id}-${item.media_type}`}
              media={{
                id: item.tmdb_id,
                media_type: item.media_type,
                title: item.title,
                poster_path: item.poster_path,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}