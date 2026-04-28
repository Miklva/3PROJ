const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token manquant.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_123');
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Token invalide.' });
    }
};
