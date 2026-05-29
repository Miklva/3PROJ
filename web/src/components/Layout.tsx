import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import Button from "./Button";
import "./Layout.scss";
import logo from "../assets/logo.png";

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <nav className="navbar">
                <Link to="/">
                    <img src={logo} alt="Logo SupContent" className="logo" />
                </Link>
                <div className="links">
                    <Link to="/">{t.nav.home}</Link>
                    {user ? (
                        <>
                            <Link to="/search">{t.nav.search}</Link>
                            <Link to="/feed">Fil d'actu</Link>
                            <Link to="/messages">Messages</Link>
                            <Link to="/profile">{t.nav.profile}</Link>
                            <Link to="/settings">{t.nav.settings}</Link>
                            {user.role === 'admin' && (
                                <Link to="/admin" className="admin-link">⚙ Admin</Link>
                            )}
                            <Button variant="nav" onClick={handleLogout}>{t.nav.logout}</Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/register">Register</Link>
                        </>
                    )}
                </div>
            </nav>
            <main className="main">
                <Outlet />
            </main>
        </div>
    );
}
