import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import Button from "../components/Button";
import './Register.scss';

interface ServerError {
    msg: string;
}

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<ServerError[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors([]);
        setLoading(true);

        const res = await register(username, email, password);

        if (res.success) {
            navigate('/');
        } else {
            setErrors(res.errors || [{ msg: 'Error' }]);
        }
        setLoading(false);
    };

    const handleOAuth = (provider: string) => {
        window.location.href = `http://localhost:5000/api/auth/${provider}`;
    };

    return (
        <div className="register-page">
            <div className="register-card">
                <h2>{t.auth.register_title}</h2>
                <p className="register-subtitle">{t.auth.register_subtitle}</p>

                {errors.length > 0 && (
                    <div className="register-errors">
                        {errors.map((err, i) => (
                            <p key={i}>{err.msg}</p>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label htmlFor="username">{t.auth.username}</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="ton_pseudo"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">{t.auth.email}</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="exemple@mail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">{t.auth.password}</label>
                        <input
                            id="password"
                            type="password"
                            placeholder={t.auth.password}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    
                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? t.auth.btn_loading : t.auth.btn_register}
                    </Button>
                </form>

                <div className="register-divider">
                    <span>{t.auth.or}</span>
                </div>

                <div className="social-login">
                    <button className="btn-social google" onClick={() => handleOAuth('google')}>
                        <i>G</i> {t.auth.google}
                    </button>
                    <button className="btn-social github" onClick={() => handleOAuth('github')}>
                        <i>G</i> {t.auth.github}
                    </button>
                </div>

                <p className="register-login-link">
                    {t.auth.has_account}{' '}
                    <Link to="/login">{t.auth.link_login}</Link>
                </p>
            </div>
        </div>
    );
}
