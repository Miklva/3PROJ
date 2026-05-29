const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/feed
 * Retourne le fil d'actualité chronologique des personnes suivies.
 * Agrège : critiques publiées, notes attribuées, ajouts dans une liste.
 *
 * Query params:
 *   page  (default 1)
 *   limit (default 20, max 50)
 */
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    try {
        // Vérifier que l'utilisateur suit au moins quelqu'un
        const followingRows = await query(
            'SELECT following_id FROM subscriptions WHERE follower_id = ?',
            [userId]
        );

        if (followingRows.length === 0) {
            return res.json({ events: [], total: 0, page, hasMore: false });
        }

        const followingIds = followingRows.map(r => r.following_id);
        const placeholders = followingIds.map(() => '?').join(',');

        // ── Événement 1 : critiques/notes publiées ──────────────────────
        const reviewEvents = await query(
            `SELECT
                'review'            AS type,
                r.id                AS event_id,
                r.created_at,
                u.id                AS user_id,
                u.username,
                u.avatar_url,
                r.rating,
                r.comment,
                r.tmdb_id,
                r.media_type,
                NULL                AS list_name,
                NULL                AS item_title,
                NULL                AS poster_path
             FROM reviews r
             JOIN users u ON u.id = r.user_id
             WHERE r.user_id IN (${placeholders})`,
            followingIds
        );

        // ── Événement 2 : ajouts dans une collection ────────────────────
        const listEvents = await query(
            `SELECT
                'list_add'          AS type,
                li.id               AS event_id,
                li.added_at         AS created_at,
                u.id                AS user_id,
                u.username,
                u.avatar_url,
                NULL                AS rating,
                NULL                AS comment,
                li.tmdb_id,
                li.media_type,
                l.name              AS list_name,
                li.title            AS item_title,
                li.poster_path
             FROM list_items li
             JOIN lists  l ON l.id      = li.list_id
             JOIN users  u ON u.id      = l.user_id
             WHERE l.user_id IN (${placeholders})
               AND l.is_default = FALSE`,
            followingIds
        );

        // ── Fusion & tri chronologique ───────────────────────────────────
        const allEvents = [...reviewEvents, ...listEvents]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const total   = allEvents.length;
        const paged   = allEvents.slice(offset, offset + limit);
        const hasMore = offset + limit < total;

        // Enrichir les critiques avec le nombre de likes/commentaires
        const reviewIds = paged
            .filter(e => e.type === 'review')
            .map(e => e.event_id);

        let likesMap   = {};
        let commentsMap = {};

        if (reviewIds.length > 0) {
            const likesPH = reviewIds.map(() => '?').join(',');
            const likesRows = await query(
                `SELECT review_id, COUNT(*) AS cnt FROM review_likes WHERE review_id IN (${likesPH}) GROUP BY review_id`,
                reviewIds
            );
            likesRows.forEach(r => { likesMap[r.review_id] = r.cnt; });

            const commentsRows = await query(
                `SELECT review_id, COUNT(*) AS cnt FROM review_comments WHERE review_id IN (${likesPH}) GROUP BY review_id`,
                reviewIds
            );
            commentsRows.forEach(r => { commentsMap[r.review_id] = r.cnt; });
        }

        const enriched = paged.map(e => ({
            ...e,
            likes_count:    e.type === 'review' ? (likesMap[e.event_id]    || 0) : undefined,
            comments_count: e.type === 'review' ? (commentsMap[e.event_id] || 0) : undefined,
        }));

        res.json({ events: enriched, total, page, hasMore });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;
