import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Layout.scss";
import logo from "../assets/logo.png";

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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
                    {user ? (
                        <>
                            <Link to="/profile">Profil</Link>
                            <Link to="/settings">Paramètres</Link>
                            <button className="btn-nav-logout" onClick={handleLogout}>
                                Déconnexion
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Connexion</Link>
                            <Link to="/register">S'inscrire</Link>
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