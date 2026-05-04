import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Admin.scss';

type ReportedReview = {
  id: number;
  comment: string | null;
  rating: number | null;
  username: string;
  user_id: number;
  reports_count: number;
  reasons: string;
  is_featured: boolean;
  created_at: string;
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  is_banned: boolean;
  reviews_count: number;
  reports_received: number;
  created_at: string;
};

type Tab = 'reports' | 'users';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<ReportedReview[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/reports', { headers });
      setReports(res.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/users', { headers });
      setUsers(res.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'reports') fetchReports();
    else fetchUsers();
  }, [tab]);

  const deleteReview = async (id: number) => {
    if (!confirm('Supprimer cet avis ?')) return;
    try {
      await axios.delete(`/api/reviews/${id}`, { headers });
      setReports(prev => prev.filter(r => r.id !== id));
    } catch { alert('Erreur lors de la suppression.'); }
  };

  const dismissReports = async (reviewId: number) => {
    try {
      await axios.delete(`/api/admin/reports/${reviewId}`, { headers });
      setReports(prev => prev.filter(r => r.id !== reviewId));
    } catch { alert('Erreur.'); }
  };

  const toggleFeature = async (id: number, current: boolean) => {
    try {
      await axios.patch(`/api/reviews/${id}/feature`, {}, { headers });
      setReports(prev => prev.map(r => r.id === id ? { ...r, is_featured: !current } : r));
    } catch { alert('Erreur.'); }
  };

  const toggleBan = async (userId: number, current: boolean) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/ban`, {}, { headers });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !current } : u));
    } catch (err: any) { alert(err.response?.data?.error ?? 'Erreur.'); }
  };

  const toggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Changer le rôle de cet utilisateur en "${newRole}" ?`)) return;
    try {
      await axios.patch(`/api/admin/users/${userId}/role`, { role: newRole }, { headers });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u));
    } catch (err: any) { alert(err.response?.data?.error ?? 'Erreur.'); }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const parseReasons = (reasons: string) =>
    reasons ? reasons.split(',').map(r => ({
      spoiler: '🙈 Spoiler',
      insult: '🤬 Insulte',
      inappropriate: '🚫 Inapproprié',
      other: '⚠️ Autre',
    }[r] ?? r)).join(' · ') : '';

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>⚙ Panel d'administration</h1>
        <p className="admin-subtitle">Gérez les signalements et les utilisateurs</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'reports' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('reports')}
        >
          🚩 Signalements
          {reports.length > 0 && <span className="admin-badge">{reports.length}</span>}
        </button>
        <button
          className={`admin-tab ${tab === 'users' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('users')}
        >
          👥 Utilisateurs
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="admin-loading"><div className="spinner" /></div>
        ) : tab === 'reports' ? (
          <>
            {reports.length === 0 ? (
              <div className="admin-empty">
                <span className="admin-empty__icon">✅</span>
                <p>Aucun signalement en attente.</p>
              </div>
            ) : (
              <div className="admin-reports">
                {reports.map(r => (
                  <div key={r.id} className={`report-card ${r.is_featured ? 'report-card--featured' : ''}`}>
                    <div className="report-card__meta">
                      <span className="report-card__user">@{r.username}</span>
                      <span className="report-card__date">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                      {r.rating && <span className="report-card__rating">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>}
                      <span className="report-card__count">🚩 {r.reports_count} signalement{r.reports_count > 1 ? 's' : ''}</span>
                    </div>
                    {r.reasons && (
                      <div className="report-card__reasons">{parseReasons(r.reasons)}</div>
                    )}
                    {r.comment && <p className="report-card__comment">"{r.comment}"</p>}
                    <div className="report-card__actions">
                      <button className="admin-btn admin-btn--danger" onClick={() => deleteReview(r.id)}>
                        🗑 Supprimer l'avis
                      </button>
                      <button
                        className={`admin-btn ${r.is_featured ? 'admin-btn--unfeature' : 'admin-btn--feature'}`}
                        onClick={() => toggleFeature(r.id, r.is_featured)}
                      >
                        {r.is_featured ? '★ Retirer mise en avant' : '💛 Coup de cœur'}
                      </button>
                      <button className="admin-btn admin-btn--dismiss" onClick={() => dismissReports(r.id)}>
                        ✓ Ignorer les signalements
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="admin-search">
              <input
                type="text"
                placeholder="🔍 Rechercher un utilisateur..."
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                className="admin-search__input"
              />
            </div>
            <div className="admin-users">
              {filteredUsers.map(u => (
                <div key={u.id} className={`user-card ${u.is_banned ? 'user-card--banned' : ''}`}>
                  <div className="user-card__info">
                    <div className="user-card__avatar">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="user-card__name">
                        {u.username}
                        {u.role === 'admin' && <span className="user-badge user-badge--admin">Admin</span>}
                        {u.is_banned && <span className="user-badge user-badge--banned">Banni</span>}
                      </p>
                      <p className="user-card__email">{u.email}</p>
                      <p className="user-card__stats">
                        {u.reviews_count} avis · {u.reports_received} signalement{u.reports_received !== 1 ? 's' : ''} reçus
                      </p>
                    </div>
                  </div>
                  <div className="user-card__actions">
                    {u.id !== user?.id && (
                      <>
                        <button
                          className={`admin-btn ${u.is_banned ? 'admin-btn--unban' : 'admin-btn--ban'}`}
                          onClick={() => toggleBan(u.id, u.is_banned)}
                        >
                          {u.is_banned ? '✓ Débannir' : '🚫 Bannir'}
                        </button>
                        <button
                          className={`admin-btn ${u.role === 'admin' ? 'admin-btn--demote' : 'admin-btn--promote'}`}
                          onClick={() => toggleRole(u.id, u.role)}
                        >
                          {u.role === 'admin' ? '↓ Rétrograder' : '↑ Promouvoir admin'}
                        </button>
                      </>
                    )}
                    {u.id === user?.id && (
                      <span className="user-card__you">👑 Vous</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
