const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

router.get('/:type/:tmdb_id', async (req, res) => {
    const { type, tmdb_id } = req.params;

    try {
        const reviews = await query(
            `SELECT r.id, r.rating, r.comment, r.created_at, u.username
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.tmdb_id = ? AND r.media_type = ?
             ORDER BY r.created_at DESC`,
            [tmdb_id, type]
        );

        const average = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;

        res.json({ reviews, average });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.post('/:type/:tmdb_id', authMiddleware, async (req, res) => {
    const { type, tmdb_id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: 'La note doit être entre 1 et 5.' });
    }

    try {
        await query(
            `INSERT INTO reviews (user_id, tmdb_id, media_type, rating, comment)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
            [userId, tmdb_id, type, rating ?? null, comment ?? null]
        );

        res.json({ message: 'Avis enregistré.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;
