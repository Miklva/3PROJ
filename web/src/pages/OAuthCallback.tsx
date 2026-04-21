import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function OAuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const { externalLogin } = useAuth();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const userDataStr = params.get('user');

        if (token && userDataStr) {
            try {
                const userData = JSON.parse(decodeURIComponent(userDataStr));
                externalLogin(token, userData);
                navigate('/');
            } catch (error) {
                console.error('Erreur lors de la récupération des données OAuth:', error);
                navigate('/login');
            }
        } else {
            navigate('/login');
        }
    }, [location, externalLogin, navigate]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', color: '#fff' }}>
            <h2>Authentification en cours...</h2>
            <p>Veuillez patienter pendant que nous vous connectons.</p>
        </div>
    );
}
