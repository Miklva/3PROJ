import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Register from './pages/Register';
import Login from './pages/Login';
import MediaDetail from './pages/MediaDetail';
import ListDetail from './pages/ListDetail';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Search from './pages/Search';
import PublicProfile from './pages/PublicProfile';
import Admin from './pages/Admin';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';


function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/media/:type/:id" element={<MediaDetail />} />
                        <Route path="/search" element={<Search />} />
                        <Route path="/profile/:id" element={<PublicProfile />} />
                        <Route path="/lists/:id" element={<ListDetail />} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                        <Route path="/oauth-callback" element={<OAuthCallback />} />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
