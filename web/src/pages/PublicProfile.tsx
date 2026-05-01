import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.scss';

type PublicUser = {
    id: number;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    website_url: string | null;
    created_at: string;
};

export default function PublicProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [user, setUser] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`/api/users/${id}`)
            .then((res) => setUser(res.data))
            .catch(() => navigate('/'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="profile-page"><div className="profile-loading">Chargement...</div></div>;
    if (!user) return null;

    return (
        <div className="profile-page">
            <div className="profile-card">
                <button className="btn-logout" style={{ alignSelf: 'flex-start', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>

                <div className="profile-header">
                    <div className="avatar-container" style={{ cursor: 'default' }}>
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="profile-avatar-img" />
                        ) : (
                            <div className="profile-avatar-placeholder">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h2 className="profile-username">{user.username}</h2>
                </div>

                {user.bio && (
                    <div className="profile-bio-section">
                        <div className="bio-header"><h3>Bio</h3></div>
                        <p className="bio-text">{user.bio}</p>
                    </div>
                )}

                {user.website_url && (
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

                <div className="profile-info">
                    <div className="profile-info-item">
                        <span className="profile-info-label">Membre depuis</span>
                        <span className="profile-info-value">
                            {new Date(user.created_at).toLocaleDateString('fr-FR', {
                                year: 'numeric', month: 'long', day: 'numeric',
                            })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
