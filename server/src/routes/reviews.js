const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// POST /api/reviews/:id/like
router.post('/:id/like', authMiddleware, async (req, res) => {
    const reviewId = parseInt(req.params.id);
    const userId   = req.user.id;
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID invalide.' });
    try {
        const review = await query('SELECT id FROM reviews WHERE id = ?', [reviewId]);
        if (review.length === 0) return res.status(404).json({ error: 'Critique introuvable.' });
        await query('INSERT IGNORE INTO review_likes (review_id, user_id) VALUES (?, ?)', [reviewId, userId]);
        const [{ cnt }] = await query('SELECT COUNT(*) AS cnt FROM review_likes WHERE review_id = ?', [reviewId]);
        res.json({ liked: true, likes_count: Number(cnt) });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// DELETE /api/reviews/:id/like
router.delete('/:id/like', authMiddleware, async (req, res) => {
    const reviewId = parseInt(req.params.id);
    const userId   = req.user.id;
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID invalide.' });
    try {
        await query('DELETE FROM review_likes WHERE review_id = ? AND user_id = ?', [reviewId, userId]);
        const [{ cnt }] = await query('SELECT COUNT(*) AS cnt FROM review_likes WHERE review_id = ?', [reviewId]);
        res.json({ liked: false, likes_count: Number(cnt) });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// GET /api/reviews/:id/like/status  — fonctionne avec ou sans auth
router.get('/:id/like/status', async (req, res) => {
    const reviewId = parseInt(req.params.id);
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID invalide.' });

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
            userId = decoded.id;
        } catch { /* token invalide ou absent — on ignore */ }
    }

    try {
        const [{ cnt }] = await query('SELECT COUNT(*) AS cnt FROM review_likes WHERE review_id = ?', [reviewId]);
        let liked = false;
        if (userId) {
            const rows = await query('SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?', [reviewId, userId]);
            liked = rows.length > 0;
        }
        res.json({ liked, likes_count: Number(cnt) });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// GET /api/reviews/:id/comments
router.get('/:id/comments', async (req, res) => {
    const reviewId = parseInt(req.params.id);
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID invalide.' });
    try {
        const comments = await query(
            `SELECT rc.id, rc.content, rc.created_at,
                    u.id AS user_id, u.username, u.avatar_url
             FROM review_comments rc
             JOIN users u ON u.id = rc.user_id
             WHERE rc.review_id = ?
             ORDER BY rc.created_at ASC`,
            [reviewId]
        );
        res.json(comments);
    } catch (error) { console.error(error); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// POST /api/reviews/:id/comments
router.post('/:id/comments', authMiddleware, async (req, res) => {
    const reviewId = parseInt(req.params.id);
    const userId   = req.user.id;
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID invalide.' });
    const { content } = req.body;
    if (!content || content.trim().length === 0) return res.status(400).json({ error: 'Le commentaire ne peut pas être vide.' });
    if (content.trim().length > 1000) return res.status(400).json({ error: 'Maximum 1000 caractères.' });
    try {
        const review = await query('SELECT id FROM reviews WHERE id = ?', [reviewId]);
        if (review.length === 0) return res.status(404).json({ error: 'Critique introuvable.' });
        const result = await query(
            'INSERT INTO review_comments (review_id, user_id, content) VALUES (?, ?, ?)',
            [reviewId, userId, content.trim()]
        );
        const [newComment] = await query(
            `SELECT rc.id, rc.content, rc.created_at, u.id AS user_id, u.username, u.avatar_url
             FROM review_comments rc JOIN users u ON u.id = rc.user_id WHERE rc.id = ?`,
            [result.insertId]
        );
        res.status(201).json(newComment);
    } catch (error) { console.error(error); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// DELETE /api/reviews/:id/comments/:commentId
router.delete('/:id/comments/:commentId', authMiddleware, async (req, res) => {
    const commentId = parseInt(req.params.commentId);
    const userId    = req.user.id;
    const isAdmin   = req.user.role === 'admin';
    try {
        const rows = await query('SELECT user_id FROM review_comments WHERE id = ?', [commentId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Commentaire introuvable.' });
        if (rows[0].user_id !== userId && !isAdmin) return res.status(403).json({ error: 'Action non autorisée.' });
        await query('DELETE FROM review_comments WHERE id = ?', [commentId]);
        res.json({ message: 'Commentaire supprimé.' });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// POST report a review — doit être avant POST /:type/:tmdb_id pour éviter le conflit de routes
router.post('/:id/report', authMiddleware, async (req, res) => {
    const reviewId = req.params.id;
    const reporterId = req.user.id;
    const { reason } = req.body;

    const validReasons = ['spoiler', 'insult', 'inappropriate', 'other'];
    if (!reason || !validReasons.includes(reason)) {
        return res.status(400).json({ error: 'Raison invalide. Choisissez parmi : spoiler, insult, inappropriate, other.' });
    }

    try {
        const review = await query('SELECT id, user_id FROM reviews WHERE id = ?', [reviewId]);
        if (review.length === 0) {
            return res.status(404).json({ error: 'Avis introuvable.' });
        }

        if (review[0].user_id === reporterId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas signaler votre propre avis.' });
        }

        await query(
            'INSERT IGNORE INTO reports (review_id, reporter_id, reason) VALUES (?, ?, ?)',
            [reviewId, reporterId, reason]
        );

        res.json({ message: 'Avis signalé. Merci pour votre contribution.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// PATCH toggle featured on a review (admin only) — avant /:type/:tmdb_id aussi
router.patch('/:id/feature', authMiddleware, adminMiddleware, async (req, res) => {
    const reviewId = req.params.id;

    try {
        const rows = await query('SELECT is_featured FROM reviews WHERE id = ?', [reviewId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Avis introuvable.' });
        }

        const newFeatured = !rows[0].is_featured;
        await query('UPDATE reviews SET is_featured = ? WHERE id = ?', [newFeatured, reviewId]);

        res.json({ message: newFeatured ? 'Avis mis en avant.' : 'Mise en avant retirée.', is_featured: newFeatured });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// DELETE a review (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const reviewId = req.params.id;

    try {
        const result = await query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Avis introuvable.' });
        }
        res.json({ message: 'Avis supprimé.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// GET reviews for a media
router.get('/:type/:tmdb_id', async (req, res) => {
    const { type, tmdb_id } = req.params;

    try {
        const reviews = await query(
            `SELECT r.id, r.rating, r.comment, r.created_at, r.is_featured, u.username, u.id as user_id,
                    (SELECT COUNT(*) FROM reports rp WHERE rp.review_id = r.id) as reports_count
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.tmdb_id = ? AND r.media_type = ?
             ORDER BY r.is_featured DESC, r.created_at DESC`,
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

// POST create/update a review
router.post('/:type/:tmdb_id', authMiddleware, async (req, res) => {
    const { type, tmdb_id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    try {
        const userRow = await query('SELECT is_banned FROM users WHERE id = ?', [userId]);
        if (userRow[0]?.is_banned) {
            return res.status(403).json({ error: 'Votre compte a été banni.' });
        }

        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ error: 'La note doit être entre 1 et 5.' });
        }

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