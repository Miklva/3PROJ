const { query } = require('../config/database');

module.exports = async function adminMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié.' });
    }

    try {
        const users = await query('SELECT role, is_banned FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }

        const user = users[0];
        if (user.is_banned) {
            return res.status(403).json({ error: 'Votre compte a été banni.' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
        }

        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
};
