import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import MediaCard from "../components/MediaCard";
import Button from "../components/Button";
import loupe from "../assets/loupe.png";
import type { Media } from "../types";
import "./Search.scss";
import { useNavigate } from "react-router-dom";

type SearchType = "movie" | "tv" | "person" | "director" | "users" | "lists";
type Genre = { id: number; name: string };
type UserResult = { id: number; username: string; avatar_url: string | null };
type ListResult = { id: number; name: string; username: string };
type PersonResult = { id: number; name: string };

const EXCLUDED_GENRES = [10767, 10763, 10764, 10766];
const EXCLUDED_KEYWORDS = [
  "award",
  "awards",
  "ceremony",
  "cérémonie",
  "oscars",
  "grammy",
  "golden globe",
  "mtv",
  "emmy",
  "bafta",
  "césar",
  "festival",
];
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_API = "https://api.themoviedb.org/3";
const currentYear = new Date().getFullYear();
const years = Array.from(
  { length: currentYear - 1989 },
  (_, i) => currentYear - i,
);



export default function Search() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("movie");

  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [mediaResults, setMediaResults] = useState<Media[]>([]);
  const [currentPerson, setCurrentPerson] = useState<PersonResult | null>(null);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [listResults, setListResults] = useState<ListResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isMediaType = type === "movie" || type === "tv";
  const isPerson = type === "person" || type === "director";
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [query, type, selectedGenre, selectedYear]);

  useEffect(() => {
    if (isMediaType || isPerson) {
      axios
        .get(`${TMDB_API}/genre/movie/list`, {
          params: { api_key: TMDB_KEY, language: "fr-FR" },
        })
        .then((res) => setGenres(res.data.genres));
    }
    if (isMediaType) {
      setSelectedGenre("");
      setSelectedYear("");
    }
  }, [type]);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      if (isMediaType) {
        const hasFilters = !!(selectedGenre || selectedYear);
        const endpoint = query.trim()
          ? `${TMDB_API}/search/${type}`
          : `${TMDB_API}/discover/${type}`;

        const params: any = {
          api_key: TMDB_KEY,
          language: "fr-FR",
          page,
          ...(query.trim() && { query }),
          ...(selectedGenre && { with_genres: selectedGenre }),
          ...(selectedYear &&
            type === "movie" && { primary_release_year: selectedYear }),
          ...(selectedYear &&
            type === "tv" && { first_air_date_year: selectedYear }),
          ...(!query.trim() && !hasFilters && { sort_by: "popularity.desc" }),
        };

        const res = await axios.get(endpoint, { params });
        setMediaResults(
          res.data.results.map((r: any) => ({ ...r, media_type: type })),
        );
        setTotalPages(Math.min(res.data.total_pages, 500));
      } else if (isPerson) {
        if (!query.trim()) {
          const params: any = {
            api_key: TMDB_KEY,
            language: "fr-FR",
            sort_by: "popularity.desc",
            page,
            ...(selectedGenre && { with_genres: selectedGenre }),
            ...(selectedYear && { primary_release_year: selectedYear }),
          };
          const res = await axios.get(`${TMDB_API}/discover/movie`, { params });
          setCurrentPerson(null);
          setMediaResults(
            res.data.results.map((r: any) => ({ ...r, media_type: "movie" })),
          );
          setTotalPages(Math.min(res.data.total_pages, 500));
        } else {
          const personRes = await axios.get(`${TMDB_API}/search/person`, {
            params: { api_key: TMDB_KEY, language: "fr-FR", query },
          });
          const topPerson = personRes.data.results[0];
          if (!topPerson) {
            setMediaResults([]);
            setCurrentPerson(null);
            setTotalPages(1);
            setLoading(false);
            return;
          }

          const creditsRes = await axios.get(
            `${TMDB_API}/person/${topPerson.id}/combined_credits`,
            {
              params: { api_key: TMDB_KEY, language: "fr-FR" },
            },
          );

          const source =
            type === "person"
              ? creditsRes.data.cast
              : creditsRes.data.crew.filter(
                  (r: any) => r.job === "Director" || r.job === "Creator",
                );

          let all = source
            .filter(
              (r: any) => r.media_type === "movie" || r.media_type === "tv",
            )
            .filter((r: any) => r.poster_path)
            .filter(
              (r: any) =>
                !r.genre_ids?.some((id: number) =>
                  EXCLUDED_GENRES.includes(id),
                ),
            )
            .filter((r: any) => {
              const name = (r.title ?? r.name ?? "").toLowerCase();
              return !EXCLUDED_KEYWORDS.some((kw) => name.includes(kw));
            })
            .sort((a: any, b: any) => b.popularity - a.popularity);

          const seen = new Set();
          all = all.filter((r: any) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });

          if (selectedGenre)
            all = all.filter((r: any) =>
              r.genre_ids?.includes(Number(selectedGenre)),
            );
          if (selectedYear)
            all = all.filter((r: any) =>
              (r.release_date ?? r.first_air_date ?? "").startsWith(
                selectedYear,
              ),
            );

          const perPage = 20;
          setCurrentPerson({ id: topPerson.id, name: topPerson.name });
          setMediaResults(all.slice((page - 1) * perPage, page * perPage));
          setTotalPages(Math.ceil(all.length / perPage) || 1);
        }
      } else if (type === "users") {
        const res = await axios.get(
          `/api/users/search?q=${encodeURIComponent(query)}`,
        );
        setUserResults(res.data);
      } else if (type === "lists") {
        const res = await axios.get(
          `/api/lists/search?q=${encodeURIComponent(query)}`,
        );
        setListResults(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, type, selectedGenre, selectedYear, page]);

  useEffect(() => {
    const timer = setTimeout(search, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const showPagination = (isMediaType || isPerson) && totalPages > 1;

  return (
    <div className="search-page">
      <div className="search-bar">
        <img
          src={loupe}
          alt="Loupe barre de recherche"
          className="search-bar__loupe"
        />
        <input
          type="text"
          placeholder={
            type === "person"
              ? "Nom de l'acteur…"
              : type === "director"
                ? "Nom du réalisateur…"
                : type === "users"
                  ? "Nom d'utilisateur…"
                  : type === "lists"
                    ? "Nom de la liste…"
                    : "Rechercher…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <Button variant="icon" onClick={() => setQuery("")}>✕</Button>
        )}
      </div>

      <div className="chips">
        <Button variant="chip" active={type === "movie"} onClick={() => setType("movie")}>Films</Button>
        <Button variant="chip" active={type === "tv"} onClick={() => setType("tv")}>Séries</Button>
        <Button variant="chip" active={type === "person"} onClick={() => setType("person")}>Acteur</Button>
        <Button variant="chip" active={type === "director"} onClick={() => setType("director")}>Réalisateur</Button>
        <Button variant="chip" active={type === "users"} onClick={() => setType("users")}>Utilisateurs</Button>
        <Button variant="chip" active={type === "lists"} onClick={() => setType("lists")}>Listes</Button>
      </div>

      {(isMediaType || isPerson) && (
        <div className="filters">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            <option value="">Tous les genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">Toutes les années</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="search-results">
        {loading && <p className="search-status">Recherche…</p>}

        {!loading &&
          isPerson &&
          (mediaResults.length === 0 ? (
            <p className="search-status">Aucun résultat</p>
          ) : (
            <>
              {currentPerson && (
                <p className="search-hint">
                  {type === "person" ? "Films et séries de" : "Œuvres de"}{" "}
                  <strong>{currentPerson.name}</strong>
                </p>
              )}
              <div className="media-grid">
                {mediaResults.map((m) => (
                  <MediaCard key={`${m.id}-${m.media_type}`} media={m} />
                ))}
              </div>
            </>
          ))}

        {!loading &&
          isMediaType &&
          (mediaResults.length === 0 ? (
            <p className="search-status">Aucun résultat</p>
          ) : (
            <div className="media-grid">
              {mediaResults.map((m) => (
                <MediaCard key={`${m.id}-${m.media_type}`} media={m} />
              ))}
            </div>
          ))}

        {!loading &&
          type === "users" &&
          (userResults.length === 0 ? (
            <p className="search-status">Aucun utilisateur trouvé</p>
          ) : (
            <div className="user-list">
              {userResults.map((u) => (
                <div key={u.id} className="user-card"onClick={() => navigate(`/profile/${u.id}`)}>
                  <div className="user-card__avatar">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.username} />
                    ) : (
                      <span>{u.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <p className="user-card__name">{u.username}</p>
                </div>
              ))}
            </div>
          ))}

        {!loading &&
          type === "lists" &&
          (listResults.length === 0 ? (
            <p className="search-status">Aucune liste trouvée</p>
          ) : (
            <div className="list-results">
              {listResults.map((l) => (
                <div key={l.id} className="list-result-card" onClick={() => navigate(`/lists/${l.id}`)}>
                  <p className="list-result-card__name">{l.name}</p>
                  <p className="list-result-card__author">par {l.username}</p>
                </div>
              ))}
            </div>
          ))}
      </div>

      {showPagination && !loading && (
        <div className="pagination">
          <Button variant="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button variant="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</Button>
        </div>
      )}
    </div>
  );
}
