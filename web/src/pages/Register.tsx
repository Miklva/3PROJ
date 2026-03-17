import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from "../components/Button";
import './Register.scss';

interface ServerError {
    msg: string;
}

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
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
            setErrors(res.errors || [{ msg: 'Erreur inconnue' }]);
        }
        setLoading(false);
    };

    return (
        <div className="register-page">
            <div className="register-card">
                <h2>Créer un compte</h2>
                <p className="register-subtitle">Rejoins SupContent</p>

                {errors.length > 0 && (
                    <div className="register-errors">
                        {errors.map((err, i) => (
                            <p key={i}>{err.msg}</p>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label htmlFor="username">Nom d'utilisateur</label>
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
                        <label htmlFor="email">Email</label>
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
                        <label htmlFor="password">Mot de passe</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="6 caractères minimum"
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
                        {loading ? 'Inscription...' : "S'inscrire"}
                    </Button>
                </form>

                <p className="register-login-link">
                    Déjà un compte ?{' '}
                    <Link to="/login">Se connecter</Link>
                </p>
            </div>
        </div>
    );
}
