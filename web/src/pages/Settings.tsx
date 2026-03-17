import { useState, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import './Settings.scss';

type Tab = 'profile' | 'security' | 'data';

export default function Settings() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


    const [username, setUsername] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatarLoading, setAvatarLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const token = () => localStorage.getItem('token');

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };


    const handleProfileSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({ username, bio }),
            });
            if (res.ok) {
                const saved = localStorage.getItem('user');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    localStorage.setItem('user', JSON.stringify({ ...parsed, username, bio }));
                }
                showMessage('success', 'Profil mis à jour avec succès');
            } else {
                const data = await res.json();
                showMessage('error', data.message || 'Erreur lors de la mise à jour');
            }
        } catch {
            showMessage('error', 'Impossible de contacter le serveur');
        }
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        setAvatarLoading(true);

        try {
            const res = await fetch('/api/users/me/avatar', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
                body: formData,
            });
            if (res.ok) {
                showMessage('success', 'Avatar mis à jour');
            } else {
                showMessage('error', "Erreur lors de l'upload de l'avatar");
            }
        } catch {
            showMessage('error', 'Impossible de contacter le serveur');
        } finally {
            setAvatarLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showMessage('error', 'Les nouveaux mots de passe ne correspondent pas');
            return;
        }
        if (newPassword.length < 6) {
            showMessage('error', 'Le nouveau mot de passe doit faire au moins 6 caractères');
            return;
        }
        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            if (res.ok) {
                showMessage('success', 'Mot de passe modifié avec succès');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const data = await res.json();
                showMessage('error', data.message || 'Erreur lors de la modification');
            }
        } catch {
            showMessage('error', 'Impossible de contacter le serveur');
        }
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="settings-page">
            <div className="settings-container">
                <h1 className="settings-title">Paramètres</h1>


                <div className="settings-tabs">
                    {(['profile', 'security', 'data'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            className={`settings-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'profile' && 'Profil'}
                            {tab === 'security' && 'Sécurité'}
                            {tab === 'data' && 'Compte'}
                        </button>
                    ))}
                </div>


                {message && (
                    <div className={`settings-message ${message.type}`}>
                        {message.text}
                    </div>
                )}


                <div className="settings-card">


                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit} className="settings-form">
                            <h2>Informations du profil</h2>

                            <div className="form-group">
                                <label>Nom d'utilisateur</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="ton_pseudo"
                                    minLength={3}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Bio</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Parle-nous de toi..."
                                    maxLength={200}
                                    rows={4}
                                />
                                <span className="char-count">{bio.length}/200</span>
                            </div>

                            <div className="form-group">
                                <label>Avatar</label>
                                <div className="avatar-upload-box">
                                    {user?.avatar_url && (
                                        <img src={user.avatar_url} alt="avatar actuel" className="current-avatar" />
                                    )}
                                    <button
                                        type="button"
                                        className="btn-upload-avatar"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={avatarLoading}
                                    >
                                        {avatarLoading ? 'Upload en cours...' : '📸 Changer l\'avatar'}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            </div>

                            <Button type="submit">Sauvegarder les modifications</Button>
                        </form>
                    )}


                    {activeTab === 'security' && (
                        <form onSubmit={handlePasswordSubmit} className="settings-form">
                            <h2>Changer le mot de passe</h2>

                            <div className="settings-warning">
                                ⚠️ Assure-toi de te souvenir de ton nouveau mot de passe.
                            </div>

                            <div className="form-group">
                                <label>Mot de passe actuel</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="form-group">
                                <label>Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="6 caractères minimum"
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirmer le nouveau mot de passe</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            <Button type="submit">Modifier le mot de passe</Button>
                        </form>
                    )}


                    {activeTab === 'data' && (
                        <div className="settings-form">
                            <h2>Gestion du compte</h2>

                            <div className="settings-section">
                                <h3>Informations du compte</h3>
                                <p className="settings-info-line">
                                    <span>Nom d'utilisateur :</span>
                                    <strong>{user?.username}</strong>
                                </p>
                                <p className="settings-info-line">
                                    <span>Email :</span>
                                    <strong>{user?.email}</strong>
                                </p>
                            </div>

                            <div className="settings-section danger-zone">
                                <h3>Zone de danger</h3>
                                <p>Déconnecter ton compte sur cet appareil.</p>
                                <button className="btn-logout-settings" onClick={handleLogout}>
                                    Se déconnecter
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}