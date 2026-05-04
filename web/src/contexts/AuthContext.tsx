import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

interface User {
    id: number;
    username: string;
    email: string;
    bio: string | null;
    website_url: string | null;
    avatar_url: string | null;
    theme: 'light' | 'dark';
    language: string;
    role: 'user' | 'admin';
    is_banned: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    register: (username: string, email: string, password: string) => Promise<{ success: boolean; errors?: { msg: string }[] }>;
    logout: () => void;
    externalLogin: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (user?.theme) {
            document.documentElement.setAttribute('data-theme', user.theme);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, [user?.theme]);

    const login = useCallback(async (email: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, message: data.message || 'Identifiants incorrects' };
            }
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true };
        } catch {
            return { success: false, message: 'Impossible de contacter le serveur' };
        }
    }, []);

    const register = useCallback(async (username: string, email: string, password: string) => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, errors: data.errors || [{ msg: data.message || 'Erreur inconnue' }] };
            }
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true };
        } catch {
            return { success: false, errors: [{ msg: 'Impossible de contacter le serveur' }] };
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    const externalLogin = useCallback((token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }, []);

    const contextValue = useMemo(() => ({
        user,
        loading,
        login,
        register,
        logout,
        externalLogin
    }), [user, loading, login, register, logout, externalLogin]);

    return (
        <AuthContext.Provider value={contextValue}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
