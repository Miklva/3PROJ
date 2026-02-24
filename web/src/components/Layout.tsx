import { Link, Outlet } from "react-router-dom";
import "./Layout.scss";

export default function Layout() {
    return (
        <div className="layout">
            <nav className="navbar">
                <Link to="/" >SupContent</Link>
                <div className="links">
                    <Link to="/profile">Profil</Link>
                    <Link to="/settings">Paramètre</Link>
                    <Link to="/register">S'inscrire</Link>
                </div>
            </nav>
            <main className="main">
                <Outlet />
            </main>
        </div>
    );
}