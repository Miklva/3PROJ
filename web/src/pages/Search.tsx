import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import MediaCard from '../components/MediaCard';
import loupe from "../assets/loupe.png";
import type { Media } from '../types';
import './Search.scss';

type SearchType = 'movie' | 'tv' | 'person' | 'users' | 'lists';
type Genre = { id: number; name: string };
type UserResult = { id: number; username: string; avatar_url: string | null };
type ListResult = { id: number; name: string; username: string };

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_API = 'https://api.themoviedb.org/3';
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

function TypeChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button className={`chip ${active ? 'chip--active' : ''}`} onClick={onClick}>
            {label}
        </button>
    );
}

export default function Search() {
    const [query, setQuery] = useState('');
    const [type, setType] = useState<SearchType>('movie');

    const [genres, setGenres] = useState<Genre[]>([]);
    const [selectedGenre, setSelectedGenre] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    const [mediaResults, setMediaResults] = useState<Media[]>([]);
    const [userResults, setUserResults] = useState<UserResult[]>([]);
    const [listResults, setListResults] = useState<ListResult[]>([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const isMediaType = type === 'movie' || type === 'tv';
    const isPerson = type === 'person';

    useEffect(() => { setPage(1); }, [query, type, selectedGenre, selectedYear]);

    useEffect(() => {
        if (!isMediaType) return;
        setSelectedGenre('');
        setSelectedYear('');
        axios.get(`${TMDB_API}/genre/${type}/list`, {
            params: { api_key: TMDB_KEY, language: 'fr-FR' },
        }).then((res) => setGenres(res.data.genres));
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
                    language: 'fr-FR',
                    page,
                    ...(query.trim() && { query }),
                    ...(selectedGenre && { with_genres: selectedGenre }),
                    ...(selectedYear && type === 'movie' && { primary_release_year: selectedYear }),
                    ...(selectedYear && type === 'tv' && { first_air_date_year: selectedYear }),
                };

                if (!query.trim() && !hasFilters) {
                    params.sort_by = 'popularity.desc';
                }

                const res = await axios.get(endpoint, { params });
                setMediaResults(res.data.results.map((r: any) => ({ ...r, media_type: type })));
                setTotalPages(Math.min(res.data.total_pages, 500));

            } else if (isPerson) {
                if (!query.trim()) { setMediaResults([]); setTotalPages(1); setLoading(false); return; }
                const personRes = await axios.get(`${TMDB_API}/search/person`, {
                    params: { api_key: TMDB_KEY, language: 'fr-FR', query, page },
                });
                const topPerson = personRes.data.results[0];
                if (!topPerson) { setMediaResults([]); setTotalPages(1); setLoading(false); return; }

                const discoverRes = await axios.get(`${TMDB_API}/discover/movie`, {
                    params: { api_key: TMDB_KEY, language: 'fr-FR', with_people: topPerson.id, page },
                });
                setMediaResults(discoverRes.data.results.map((r: any) => ({ ...r, media_type: 'movie' })));
                setTotalPages(Math.min(discoverRes.data.total_pages, 500));

            } else if (type === 'users') {
                const res = await axios.get(query.trim()
                    ? `/api/users/search?q=${encodeURIComponent(query)}`
                    : `/api/users/search?q=`
                );
                setUserResults(res.data);

            } else if (type === 'lists') {
                const res = await axios.get(query.trim()
                    ? `/api/lists/search?q=${encodeURIComponent(query)}`
                    : `/api/lists/search?q=`
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
                <img src={loupe} alt="Loupe barre de recherche" className='search-bar__loupe'/>
                <input
                    type="text"
                    placeholder={
                        isPerson ? "Nom de l'acteur ou réalisateur…" :
                        type === 'users' ? "Nom d'utilisateur…" :
                        type === 'lists' ? "Nom de la liste…" :
                        "Rechercher…"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                {query && (
                    <button className="search-bar__clear" onClick={() => setQuery('')}>✕</button>
                )}
            </div>

            <div className="chips">
                <TypeChip label="Films"              active={type === 'movie'}  onClick={() => setType('movie')} />
                <TypeChip label="Séries"             active={type === 'tv'}     onClick={() => setType('tv')} />
                <TypeChip label="Acteur / Réalisateur" active={type === 'person'} onClick={() => setType('person')} />
                <TypeChip label="Utilisateurs"       active={type === 'users'}  onClick={() => setType('users')} />
                <TypeChip label="Listes"             active={type === 'lists'}  onClick={() => setType('lists')} />
            </div>

            {isMediaType && (
                <div className="filters">
                    <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
                        <option value="">Tous les genres</option>
                        {genres.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>

                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                        <option value="">Toutes les années</option>
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="search-results">
                {loading && <p className="search-status">Recherche…</p>}

                {!loading && (isMediaType || isPerson) && (
                    mediaResults.length === 0
                        ? <p className="search-status">Aucun résultat</p>
                        : <div className="media-grid">
                            {mediaResults.map((m) => <MediaCard key={m.id} media={m} />)}
                        </div>
                )}

                {!loading && type === 'users' && (
                    userResults.length === 0
                        ? <p className="search-status">Aucun utilisateur trouvé</p>
                        : <div className="user-list">
                            {userResults.map((u) => (
                                <div key={u.id} className="user-card">
                                    <div className="user-card__avatar">
                                        {u.avatar_url
                                            ? <img src={u.avatar_url} alt={u.username} />
                                            : <span>{u.username.charAt(0).toUpperCase()}</span>
                                        }
                                    </div>
                                    <p className="user-card__name">{u.username}</p>
                                </div>
                            ))}
                        </div>
                )}

                {!loading && type === 'lists' && (
                    listResults.length === 0
                        ? <p className="search-status">Aucune liste trouvée</p>
                        : <div className="list-results">
                            {listResults.map((l) => (
                                <div key={l.id} className="list-result-card">
                                    <p className="list-result-card__name">{l.name}</p>
                                    <p className="list-result-card__author">par {l.username}</p>
                                </div>
                            ))}
                        </div>
                )}
            </div>

            {showPagination && !loading && (
                <div className="pagination">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                    <span>{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
            )}

        </div>
    );
}
