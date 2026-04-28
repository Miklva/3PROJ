import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../hooks/useTranslation';
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

type List = { id: number; name: string; is_default: boolean };

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
    const [showNewListInput, setShowNewListInput] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchUserData();
        fetchLists();
    }, []);

    const fetchUserData = async () => {
        if (!token) { navigate('/register'); return; }
        try {
            const res = await fetch('/api/users/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
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
        } catch (err) {
            console.error('Erreur chargement listes', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/register');
    };

    const handleUpdateBio = async () => {
        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ bio: newBio }),
            });
            if (res.ok) {
                setUser(user ? { ...user, bio: newBio } : null);
                setIsEditingBio(false);
            }
        } catch (err) {
            console.error('Erreur bio update', err);
        }
    };

    const handleAvatarClick = () => fileInputRef.current?.click();

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
        } catch (err) {
            console.error('Erreur avatar upload', err);
        } finally {
            setIsUpdatingAvatar(false);
        }
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        try {
            const res = await axios.post('/api/lists', { name: newListName }, { headers: { Authorization: `Bearer ${token}` } });
            setLists(prev => [...prev, res.data]);
            setNewListName('');
            setShowNewListInput(false);
        } catch (err) {
            console.error('Erreur création liste', err);
        }
    };

    const handleDeleteList = async (listId: number) => {
        try {
            await axios.delete(`/api/lists/${listId}`, { headers: { Authorization: `Bearer ${token}` } });
            setLists(prev => prev.filter(l => l.id !== listId));
        } catch (err) {
            console.error('Erreur suppression liste', err);
        }
    };

    if (loading) return <div className="profile-page"><div className="profile-loading">{lang === 'fr' ? 'Chargement...' : 'Loading...'}</div></div>;
    if (error) return <div className="profile-page"><div className="profile-error">{error}</div></div>;

    return (
        <div className="profile-page">
            <div className="profile-card">

                <div className="profile-header">
                    <div className="avatar-container" onClick={handleAvatarClick}>
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="profile-avatar-img" />
                        ) : (
                            <div className="profile-avatar-placeholder">
                                {user?.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="avatar-overlay">{isUpdatingAvatar ? '...' : '📸'}</div>
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
                </div>

                <div className="profile-bio-section">
                    <div className="bio-header">
                        <h3>{t.settings.profile.bio}</h3>
                        {!isEditingBio ? (
                            <button className="btn-edit-bio" onClick={() => setIsEditingBio(true)}>{t.profile.edit_bio}</button>
                        ) : (
                            <div className="bio-actions">
                                <button className="btn-save-bio" onClick={handleUpdateBio}>{t.profile.save_bio}</button>
                                <button className="btn-cancel-bio" onClick={() => setIsEditingBio(false)}>{t.profile.cancel_bio}</button>
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
                        <span className="website-icon">🔗</span>
                        <a
                            href={user.website_url.startsWith('http') ? user.website_url : `https://${user.website_url}`}
                            target="_blank" rel="noopener noreferrer" className="website-link"
                        >
                            {user.website_url.replace(/^https?:\/\//, '')}
                        </a>
                    </div>
                )}

                <div className="profile-lists">
                    <div className="profile-lists__header">
                        <h3>Mes listes</h3>
                        <button onClick={() => setShowNewListInput(p => !p)}>+ Créer une liste</button>
                    </div>

                    {showNewListInput && (
                        <div className="profile-lists__create">
                            <input
                                type="text"
                                placeholder="Nom de la liste…"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                                autoFocus
                            />
                            <button onClick={handleCreateList}>Créer</button>
                        </div>
                    )}

                    <div className="profile-lists__grid">
                        {lists.map((list) => (
                            <div key={list.id} className="list-item" onClick={() => navigate(`/lists/${list.id}`)}>
                                <span className="list-item__name">{list.name}</span>
                                {!list.is_default && (
                                    <button
                                        className="list-item__delete"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                                    >✕</button>
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

                <button className="btn-logout" onClick={handleLogout}>{t.nav.logout}</button>
            </div>
        </div>
    );
}