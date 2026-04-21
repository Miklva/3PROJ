import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Register from './pages/Register';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/oauth-callback" element={<OAuthCallback />} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
