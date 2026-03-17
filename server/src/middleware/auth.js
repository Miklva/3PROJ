const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_123');
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Token invalide' });
    }
}

module.exports = authMiddleware;
