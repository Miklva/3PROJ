import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import './Profile.scss';

type PublicUser = {
    id: number;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    website_url: string | null;
    created_at: string;
    followers_count?: number;
    following_count?: number;
};

export default function PublicProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = localStorage.getItem('token');

    const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
    const [loading, setLoading]         = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Redirige vers /profile si on visite son propre profil
    useEffect(() => {
        if (user && String(user.id) === id) {
            navigate('/profile', { replace: true });
        }
    }, [user, id]);

    useEffect(() => {
        axios.get(`/api/users/${id}`)
            .then((res) => setProfileUser(res.data))
            .catch(() => navigate('/'))
            .finally(() => setLoading(false));
    }, [id]);

    // Vérifier si on suit déjà cet utilisateur
    useEffect(() => {
        if (!token || !id || !user) return;
        axios.get(`/api/users/${id}/is-following`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => setIsFollowing(res.data.isFollowing))
            .catch(() => {});
    }, [token, id, user]);

    const toggleFollow = async () => {
        if (!token) { navigate('/login'); return; }
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await axios.delete(`/api/users/${id}/follow`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsFollowing(false);
                setProfileUser(prev => prev ? {
                    ...prev,
                    followers_count: Math.max(0, (prev.followers_count ?? 1) - 1)
                } : prev);
            } else {
                await axios.post(`/api/users/${id}/follow`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsFollowing(true);
                setProfileUser(prev => prev ? {
                    ...prev,
                    followers_count: (prev.followers_count ?? 0) + 1
                } : prev);
            }
        } catch (err: any) {
            alert(err.response?.data?.message ?? 'Erreur lors de l\'abonnement.');
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) return <div className="profile-page"><div className="profile-loading">Chargement...</div></div>;
    if (!profileUser) return null;

    return (
        <div className="profile-page">
            <div className="profile-card">
                <Button variant="back" onClick={() => navigate(-1)}>← Retour</Button>

                <div className="profile-header">
                    <div className="avatar-container" style={{ cursor: 'default' }}>
                        {profileUser.avatar_url ? (
                            <img src={profileUser.avatar_url} alt="Avatar" className="profile-avatar-img" />
                        ) : (
                            <div className="profile-avatar-placeholder">
                                {profileUser.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    <div className="profile-header__info">
                        <h2 className="profile-username">{profileUser.username}</h2>

                        {/* Compteurs followers */}
                        {(profileUser.followers_count !== undefined || profileUser.following_count !== undefined) && (
                            <div className="profile-follow-counts">
                                <span><strong>{profileUser.followers_count ?? 0}</strong> abonnés</span>
                                <span><strong>{profileUser.following_count ?? 0}</strong> abonnements</span>
                            </div>
                        )}
                    </div>

                    {/* Bouton Follow — visible seulement si connecté et pas son propre profil */}
                    {user && String(user.id) !== id && (
                        <button
                            className={`follow-btn ${isFollowing ? 'follow-btn--following' : ''}`}
                            onClick={toggleFollow}
                            disabled={followLoading}
                        >
                            {followLoading
                                ? '…'
                                : isFollowing
                                    ? '✓ Abonné'
                                    : '+ Suivre'
                            }
                        </button>
                    )}
                </div>

                {profileUser.bio && (
                    <div className="profile-bio-section">
                        <div className="bio-header"><h3>Bio</h3></div>
                        <p className="bio-text">{profileUser.bio}</p>
                    </div>
                )}

                {profileUser.website_url && (
                    <div className="profile-website-section">
                        <span className="website-icon">🔗</span>
                        <a
                            href={profileUser.website_url.startsWith('http') ? profileUser.website_url : `https://${profileUser.website_url}`}
                            target="_blank" rel="noopener noreferrer" className="website-link"
                        >
                            {profileUser.website_url.replace(/^https?:\/\//, '')}
                        </a>
                    </div>
                )}

                <div className="profile-info">
                    <div className="profile-info-item">
                        <span className="profile-info-label">Membre depuis</span>
                        <span className="profile-info-value">
                            {new Date(profileUser.created_at).toLocaleDateString('fr-FR', {
                                year: 'numeric', month: 'long', day: 'numeric',
                            })}
                        </span>
                    </div>
                </div>

                {/* Bouton envoyer un message si suivi mutuel */}
                {user && isFollowing && (
                    <div className="profile-actions">
                        <Button variant="ghost" onClick={() => navigate(`/messages/${id}`)}>
                            💬 Envoyer un message
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}