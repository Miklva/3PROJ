import { useState, useRef, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import Button from '../components/Button';
import './Settings.scss';

type Tab = 'profile' | 'preferences' | 'security' | 'data';

export default function Settings() {
    const { user, logout, externalLogin } = useAuth();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


    const [username, setUsername] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [websiteUrl, setWebsiteUrl] = useState(user?.website_url || '');
    const [theme, setTheme] = useState(user?.theme || 'dark');
    const [language, setLanguage] = useState(user?.language || 'fr');
    const [avatarLoading, setAvatarLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setBio(user.bio || '');
            setWebsiteUrl(user.website_url || '');
            setTheme(user.theme || 'dark');
            setLanguage(user.language || 'fr');
        }
    }, [user]);

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
                body: JSON.stringify({ username, bio, website_url: websiteUrl }),
            });
            if (res.ok) {
                const saved = localStorage.getItem('user');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const updatedUser = { ...parsed, username, bio, website_url: websiteUrl };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    externalLogin(token() || '', updatedUser);
                }
                showMessage('success', t.settings.messages.success_profile);
            } else {
                const data = await res.json();
                showMessage('error', data.message || 'Error');
            }
        } catch {
            showMessage('error', t.settings.messages.error_server);
        }
    };

    const handlePreferenceSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({ theme, language }),
            });
            if (res.ok) {
                const saved = localStorage.getItem('user');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const updatedUser = { ...parsed, theme, language };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    externalLogin(token() || '', updatedUser);
                }
                showMessage('success', t.settings.messages.success_prefs);
            } else {
                showMessage('error', 'Error');
            }
        } catch {
            showMessage('error', t.settings.messages.error_server);
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
                const data = await res.json();
                const saved = localStorage.getItem('user');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const updatedUser = { ...parsed, avatar_url: data.avatar_url };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    externalLogin(token() || '', updatedUser);
                }
                showMessage('success', t.settings.messages.success_avatar);
            } else {
                const data = await res.json();
                showMessage('error', data.message || "Error");
            }
        } catch {
            showMessage('error', t.settings.messages.error_server);
        } finally {
            setAvatarLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showMessage('error', t.settings.messages.error_password_match);
            return;
        }
        if (newPassword.length < 6) {
            showMessage('error', t.settings.messages.error_password_length);
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
                showMessage('success', t.settings.messages.success_password);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const data = await res.json();
                showMessage('error', data.message || 'Error');
            }
        } catch {
            showMessage('error', t.settings.messages.error_server);
        }
    };

    const handleLogout = () => {
        logout();
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm(t.settings.account.delete_confirm)) {
            return;
        }

        try {
            const res = await fetch('/api/users/me', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` },
            });

            if (res.ok) {
                showMessage('success', t.settings.messages.success_delete_account);
                setTimeout(() => {
                    logout();
                }, 1500);
            } else {
                const data = await res.json();
                showMessage('error', data.message || 'Error');
            }
        } catch {
            showMessage('error', t.settings.messages.error_server);
        }
    };

    const handleExport = async (format: 'json' | 'csv') => {
        try {
            const res = await fetch('/api/users/me/export', {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) throw new Error();

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `data-export.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showMessage('success', t.settings.messages.success_export);
        } catch {
            showMessage('error', "Export Error");
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-container">
                <h1 className="settings-title">{t.settings.title}</h1>


                <div className="settings-tabs">
                    {(['profile', 'preferences', 'security', 'data'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            className={`settings-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'profile' && t.settings.tabs.profile}
                            {tab === 'preferences' && t.settings.tabs.preferences}
                            {tab === 'security' && t.settings.tabs.security}
                            {tab === 'data' && t.settings.tabs.data}
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
                            <h2>{t.settings.profile.title}</h2>

                            <div className="form-group">
                                <label>{t.settings.profile.username}</label>
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
                                <label>{t.settings.profile.bio}</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder={t.settings.profile.bio_placeholder}
                                    maxLength={200}
                                    rows={4}
                                />
                                <span className="char-count">{bio.length}/200</span>
                            </div>

                            <div className="form-group">
                                <label>{t.settings.profile.website}</label>
                                <input
                                    type="url"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    placeholder="https://votre-site.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t.settings.profile.avatar}</label>
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
                                        {avatarLoading ? t.settings.profile.uploading : `📸 ${t.settings.profile.change_avatar}`}
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

                            <Button type="submit">{t.settings.profile.save}</Button>
                        </form>
                    )}

                    {activeTab === 'preferences' && (
                        <form onSubmit={handlePreferenceSubmit} className="settings-form">
                            <h2>{t.settings.preferences.title}</h2>

                            <div className="form-group">
                                <label>{t.settings.preferences.theme}</label>
                                <div className="theme-toggle-group">
                                    <button
                                        type="button"
                                        className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                        onClick={() => setTheme('light')}
                                    >
                                        ☀️ {t.settings.preferences.theme_light}
                                    </button>
                                    <button
                                        type="button"
                                        className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                        onClick={() => setTheme('dark')}
                                    >
                                        🌙 {t.settings.preferences.theme_dark}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{t.settings.preferences.language}</label>
                                <select
                                    className="lang-select"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                >
                                    <option value="fr">Français</option>
                                    <option value="en">English</option>
                                    <option value="es">Español</option>
                                </select>
                            </div>

                            <Button type="submit">{t.settings.preferences.save}</Button>
                        </form>
                    )}


                    {activeTab === 'security' && (
                        <form onSubmit={handlePasswordSubmit} className="settings-form">
                            <h2>{t.settings.security.title}</h2>

                            <div className="settings-warning">
                                ⚠️ {t.settings.security.warning}
                            </div>

                            <div className="form-group">
                                <label>{t.settings.security.current}</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t.settings.security.new}</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder={t.settings.security.new_placeholder}
                                />
                            </div>

                            <div className="form-group">
                                <label>{t.settings.security.confirm}</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            <Button type="submit">{t.settings.security.save}</Button>
                        </form>
                    )}


                    {activeTab === 'data' && (
                        <div className="settings-form">
                            <h2>{t.settings.account.title}</h2>

                            <div className="settings-section">
                                <h3>{t.settings.account.info_subtitle}</h3>
                                <p className="settings-info-line">
                                    <span>{t.settings.profile.username} :</span>
                                    <strong>{user?.username}</strong>
                                </p>
                                <p className="settings-info-line">
                                    <span>{t.settings.account.email} :</span>
                                    <strong>{user?.email}</strong>
                                </p>
                            </div>

                            <div className="settings-section">
                                <h3>{t.settings.account.data_subtitle}</h3>
                                <p>{t.settings.account.data_desc}</p>
                                <div className="export-actions">
                                    <button className="btn-export" onClick={() => handleExport('json')}>
                                        📤 {t.settings.account.export_btn}
                                    </button>
                                </div>
                            </div>

                            <div className="settings-section danger-zone">
                                <h3>{t.settings.account.danger_title}</h3>
                                <p>{t.settings.account.danger_desc}</p>
                                <button className="btn-logout-settings" onClick={handleLogout}>
                                    {t.settings.account.logout}
                                </button>
                                <button className="btn-delete-account" onClick={handleDeleteAccount}>
                                    🗑️ {t.settings.account.delete_account}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}