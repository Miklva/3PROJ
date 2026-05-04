import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../hooks/useTranslation';
import Button from '../components/Button';
import './Profile.scss';

interface User {
    id: number;
    username: string;
    email: string;
    bio: string | null;
    website_url: string | null;
    avatar_url: string | null;
    theme: string;
    language: string;
    followers_count: number;
    following_count: number;
    created_at: string;
}

type List = {
    id: number;
    name: string;
    description: string | null;
    is_default: boolean;
    is_public: boolean;
    item_count: number;
};

const DEFAULT_LIST_META: Record<string, { color: string }> = {
    'À voir':    { color: '#7c3aed' },
    'En cours':  { color: '#2563eb' },
    'Terminé':   { color: '#22c55e' },
    'Abandonné': { color: '#9ca3af' },
};

export default function Profile() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t, lang } = useTranslation();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [newBio, setNewBio] = useState('');
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

    const [lists, setLists] = useState<List[]>([]);
    const [newListName, setNewListName] = useState('');
    const [newListDesc, setNewListDesc] = useState('');
    const [newListPublic, setNewListPublic] = useState(false);
    const [showNewListInput, setShowNewListInput] = useState(false);

    // Edition liste personnalisée
    const [editingListId, setEditingListId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPublic, setEditPublic] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => { fetchUserData(); fetchLists(); }, []);

    const fetchUserData = async () => {
        if (!token) { navigate('/register'); return; }
        try {
            const res = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) {
                if (res.status === 401) { localStorage.removeItem('token'); navigate('/register'); }
                throw new Error(lang === 'fr' ? 'Erreur lors du chargement du profil' : 'Error loading profile');
            }
            const data = await res.json();
            setUser(data);
            setNewBio(data.bio || '');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchLists = async () => {
        if (!token) return;
        try {
            const res = await axios.get('/api/lists/me', { headers: { Authorization: `Bearer ${token}` } });
            setLists(res.data);
        } catch (err) { console.error('Erreur chargement listes', err); }
    };

    const handleLogout = () => { localStorage.removeItem('token'); navigate('/register'); };

    const handleUpdateBio = async () => {
        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ bio: newBio }),
            });
            if (res.ok) { setUser(user ? { ...user, bio: newBio } : null); setIsEditingBio(false); }
        } catch (err) { console.error('Erreur bio update', err); }
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);
        setIsUpdatingAvatar(true);
        try {
            const res = await fetch('/api/users/me/avatar', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                setUser(user ? { ...user, avatar_url: data.avatar_url } : null);
            }
        } catch (err) { console.error('Erreur avatar upload', err); }
        finally { setIsUpdatingAvatar(false); }
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        try {
            const res = await axios.post(
                '/api/lists',
                { name: newListName, description: newListDesc, is_public: newListPublic },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setLists(prev => [...prev, res.data]);
            setNewListName('');
            setNewListDesc('');
            setNewListPublic(false);
            setShowNewListInput(false);
        } catch (err) { console.error('Erreur création liste', err); }
    };

    const handleDeleteList = async (listId: number) => {
        try {
            await axios.delete(`/api/lists/${listId}`, { headers: { Authorization: `Bearer ${token}` } });
            setLists(prev => prev.filter(l => l.id !== listId));
        } catch (err) { console.error('Erreur suppression liste', err); }
    };

    const startEditing = (list: List) => {
        setEditingListId(list.id);
        setEditName(list.name);
        setEditDesc(list.description || '');
        setEditPublic(list.is_public);
    };

    const handleSaveEdit = async (listId: number) => {
        try {
            await axios.put(
                `/api/lists/${listId}`,
                { name: editName, description: editDesc, is_public: editPublic },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setLists(prev => prev.map(l =>
                l.id === listId
                    ? { ...l, name: editName, description: editDesc || null, is_public: editPublic }
                    : l
            ));
            setEditingListId(null);
        } catch (err) { console.error('Erreur mise à jour liste', err); }
    };

    const defaultLists = lists.filter(l => l.is_default);
    const customLists  = lists.filter(l => !l.is_default);

    if (loading) return <div className="profile-page"><div className="profile-loading">{lang === 'fr' ? 'Chargement...' : 'Loading...'}</div></div>;
    if (error) return <div className="profile-page"><div className="profile-error">{error}</div></div>;

    return (
        <div className="profile-page">
            <div className="profile-card">

                <div className="profile-header">
                    <div className="avatar-container" onClick={() => fileInputRef.current?.click()}>
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="profile-avatar-img" />
                        ) : (
                            <div className="profile-avatar-placeholder">
                                {user?.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="avatar-overlay">{isUpdatingAvatar ? '...' : 'Changer'}</div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
                    </div>
                    <h2 className="profile-username">{user?.username}</h2>
                    <p className="profile-email">{user?.email}</p>
                </div>

                <div className="profile-stats">
                    <div className="stat-item">
                        <span className="stat-count">{user?.followers_count}</span>
                        <span className="stat-label">{t.profile.followers}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-count">{user?.following_count}</span>
                        <span className="stat-label">{t.profile.following}</span>
                    </div>
                    <div className="stat-item stat-item--clickable" onClick={() => navigate('/dashboard')}>
                        <span className="stat-count">
                            {lists.reduce((acc, l) => acc + (l.item_count || 0), 0)}
                        </span>
                        <span className="stat-label">Œuvres</span>
                    </div>
                </div>

                <div className="profile-bio-section">
                    <div className="bio-header">
                        <h3>{t.settings.profile.bio}</h3>
                        {!isEditingBio ? (
                            <Button variant="ghost" onClick={() => setIsEditingBio(true)}>{t.profile.edit_bio}</Button>
                        ) : (
                            <div className="bio-actions">
                                <Button variant="ghost" onClick={handleUpdateBio}>{t.profile.save_bio}</Button>
                                <Button variant="ghost" onClick={() => setIsEditingBio(false)}>{t.profile.cancel_bio}</Button>
                            </div>
                        )}
                    </div>
                    {isEditingBio ? (
                        <textarea className="bio-input" value={newBio} onChange={(e) => setNewBio(e.target.value)} placeholder="..." maxLength={200} />
                    ) : (
                        <p className="bio-text">{user?.bio || t.profile.no_bio}</p>
                    )}
                </div>

                {user?.website_url && (
                    <div className="profile-website-section">
                        <a
                            href={user.website_url.startsWith('http') ? user.website_url : `https://${user.website_url}`}
                            target="_blank" rel="noopener noreferrer" className="website-link"
                        >
                            {user.website_url.replace(/^https?:\/\//, '')}
                        </a>
                    </div>
                )}

                {/* ── Listes par défaut ── */}
                <div className="profile-lists">
                    <div className="profile-lists__header">
                        <h3>Listes de suivi</h3>
                        <Button variant="ghost" onClick={() => navigate('/dashboard')}>Tableau de bord</Button>
                    </div>
                    <div className="profile-lists__default-grid">
                        {defaultLists.map((list) => {
                            const meta = DEFAULT_LIST_META[list.name] || { color: '#7c3aed' };
                            return (
                                <div
                                    key={list.id}
                                    className="default-list-card"
                                    style={{ '--list-color': meta.color } as React.CSSProperties}
                                    onClick={() => navigate(`/lists/${list.id}`)}
                                >
                                    <span className="default-list-card__name">{list.name}</span>
                                    <span className="default-list-card__count">{list.item_count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Listes personnalisées ── */}
                <div className="profile-lists">
                    <div className="profile-lists__header">
                        <h3>Mes listes personnalisées</h3>
                        <Button variant="ghost" onClick={() => setShowNewListInput(p => !p)}>+ Créer</Button>
                    </div>

                    {showNewListInput && (
                        <div className="profile-lists__create">
                            <input
                                type="text" placeholder="Nom de la liste…" value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()} autoFocus
                            />
                            <input
                                type="text" placeholder="Description (optionnel)…" value={newListDesc}
                                onChange={(e) => setNewListDesc(e.target.value)}
                            />
                            <label className="toggle-row">
                                <input type="checkbox" checked={newListPublic} onChange={e => setNewListPublic(e.target.checked)} />
                                <span>Rendre publique</span>
                            </label>
                            <Button variant="ghost" onClick={handleCreateList}>Créer</Button>
                        </div>
                    )}

                    <div className="profile-lists__grid">
                        {customLists.length === 0 && (
                            <p className="profile-lists__empty">Aucune liste personnalisée pour l'instant.</p>
                        )}
                        {customLists.map((list) => (
                            <div key={list.id} className="list-item">
                                {editingListId === list.id ? (
                                    <div className="list-item__edit">
                                        <input
                                            value={editName} onChange={e => setEditName(e.target.value)}
                                            placeholder="Nom…"
                                        />
                                        <input
                                            value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                            placeholder="Description…"
                                        />
                                        <label className="toggle-row">
                                            <input type="checkbox" checked={editPublic} onChange={e => setEditPublic(e.target.checked)} />
                                            <span>Publique</span>
                                        </label>
                                        <div className="list-item__edit-actions">
                                            <Button variant="ghost" onClick={() => handleSaveEdit(list.id)}>Sauver</Button>
                                            <Button variant="ghost" onClick={() => setEditingListId(null)}>Annuler</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="list-item__info" onClick={() => navigate(`/lists/${list.id}`)}>
                                            <div className="list-item__title-row">
                                                <span className="list-item__name">{list.name}</span>
                                                <span className={`list-item__badge ${list.is_public ? 'badge--public' : 'badge--private'}`}>
                                                    {list.is_public ? 'Public' : 'Privé'}
                                                </span>
                                            </div>
                                            {list.description && (
                                                <span className="list-item__desc">{list.description}</span>
                                            )}
                                            <span className="list-item__count">{list.item_count} œuvre{list.item_count !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="list-item__actions">
                                            <Button variant="icon" onClick={(e) => { e.stopPropagation(); startEditing(list); }}>Modifier</Button>
                                            <Button variant="icon" onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}>Supprimer</Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="profile-info">
                    <div className="profile-info-item">
                        <span className="profile-info-label">{t.profile.member_since}</span>
                        <span className="profile-info-value">
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                                year: 'numeric', month: 'long', day: 'numeric',
                            }) : '—'}
                        </span>
                    </div>
                </div>

                <Button variant="danger" onClick={handleLogout}>{t.nav.logout}</Button>
            </div>
        </div>
    );
}
