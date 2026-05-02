import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import Button from '../components/Button';
import './Login.scss';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const from = (location.state as { from?: Location })?.from?.pathname || '/';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const res = await login(email, password);
        if (res.success) {
            navigate(from, { replace: true });
        } else {
            setError(res.message || 'Error');
        }
        setLoading(false);
    };

    const handleOAuth = (provider: string) => {
        window.location.href = `http://localhost:5000/api/auth/${provider}`;
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h2>{t.auth.login_title}</h2>
                <p className="login-subtitle">{t.auth.login_subtitle}</p>

                {error && (
                    <div className="login-errors">
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">{t.auth.email}</label>
                        <input id="email" type="email" placeholder="exemple@mail.com"
                            value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">{t.auth.password}</label>
                        <input id="password" type="password" placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <Button type="submit" disabled={loading}>
                        {loading ? t.auth.btn_loading : t.auth.btn_login}
                    </Button>
                </form>

                <div className="login-divider"><span>{t.auth.or}</span></div>

                <div className="social-login">
                    <Button variant="social" leftIcon={<i>G</i>} onClick={() => handleOAuth('google')}>
                        {t.auth.google}
                    </Button>
                    <Button variant="social" leftIcon={<i>G</i>} onClick={() => handleOAuth('github')}>
                        {t.auth.github}
                    </Button>
                </div>

                <p className="login-register-link">
                    {t.auth.no_account}{' '}
                    <Link to="/register">{t.auth.link_register}</Link>
                </p>
            </div>
        </div>
    );
}
