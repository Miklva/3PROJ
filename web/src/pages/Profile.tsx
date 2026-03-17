import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.scss';

interface User {
    id: number;
    username: string;
    email: string;
    bio: string | null;
    avatar_url: string | null;
    followers_count: number;
    following_count: number;
    created_at: string;
}

export default function Profile() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [newBio, setNewBio] = useState('');
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/register');
            return;
        }

        try {
            const res = await fetch('/api/users/me', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/register');
                }
                throw new Error('Erreur lors du chargement du profil');
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/register');
    };

    const handleUpdateBio = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
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

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const token = localStorage.getItem('token');
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

    if (loading) return <div className="profile-page"><div className="profile-loading">Chargement...</div></div>;
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
                        <div className="avatar-overlay">
                            {isUpdatingAvatar ? '...' : '📸'}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                        />
                    </div>

                    <h2 className="profile-username">{user?.username}</h2>
                    <p className="profile-email">{user?.email}</p>
                </div>

                <div className="profile-stats">
                    <div className="stat-item">
                        <span className="stat-count">{user?.followers_count}</span>
                        <span className="stat-label">Abonnés</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-count">{user?.following_count}</span>
                        <span className="stat-label">Abonnements</span>
                    </div>
                </div>

                <div className="profile-bio-section">
                    <div className="bio-header">
                        <h3>Bio</h3>
                        {!isEditingBio ? (
                            <button className="btn-edit-bio" onClick={() => setIsEditingBio(true)}>Éditer</button>
                        ) : (
                            <div className="bio-actions">
                                <button className="btn-save-bio" onClick={handleUpdateBio}>Sauvegarder</button>
                                <button className="btn-cancel-bio" onClick={() => setIsEditingBio(false)}>Annuler</button>
                            </div>
                        )}
                    </div>

                    {isEditingBio ? (
                        <textarea
                            className="bio-input"
                            value={newBio}
                            onChange={(e) => setNewBio(e.target.value)}
                            placeholder="Raconte-nous ta vie..."
                            maxLength={200}
                        />
                    ) : (
                        <p className="bio-text">{user?.bio || "Aucune bio pour le moment."}</p>
                    )}
                </div>

                <div className="profile-info">
                    <div className="profile-info-item">
                        <span className="profile-info-label">Membre depuis</span>
                        <span className="profile-info-value">
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            }) : '—'}
                        </span>
                    </div>
                </div>

                <button className="btn-logout" onClick={handleLogout}>
                    Se déconnecter
                </button>
            </div>
        </div>
    );
}