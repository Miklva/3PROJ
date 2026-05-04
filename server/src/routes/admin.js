const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

// GET all reported reviews (with report count)
router.get('/reports', async (req, res) => {
    try {
        const reports = await query(
            `SELECT r.id, r.comment, r.rating, r.created_at, r.is_featured,
                    u.id as user_id, u.username,
                    COUNT(rp.id) as reports_count,
                    GROUP_CONCAT(DISTINCT rp.reason ORDER BY rp.reason) as reasons
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             JOIN reports rp ON rp.review_id = r.id
             GROUP BY r.id
             ORDER BY reports_count DESC`
        );
        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// GET all users (for user management)
router.get('/users', async (req, res) => {
    try {
        const users = await query(
            `SELECT id, username, email, role, is_banned, created_at,
                    (SELECT COUNT(*) FROM reviews WHERE user_id = users.id) as reviews_count,
                    (SELECT COUNT(*) FROM reports rp JOIN reviews r ON rp.review_id = r.id WHERE r.user_id = users.id) as reports_received
             FROM users
             ORDER BY created_at DESC`
        );
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// PATCH ban/unban a user
router.patch('/users/:id/ban', async (req, res) => {
    const targetId = req.params.id;

    if (parseInt(targetId) === req.user.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas vous bannir vous-même.' });
    }

    try {
        const users = await query('SELECT is_banned, role FROM users WHERE id = ?', [targetId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }

        if (users[0].role === 'admin') {
            return res.status(400).json({ error: 'Impossible de bannir un autre administrateur.' });
        }

        const newBanned = !users[0].is_banned;
        await query('UPDATE users SET is_banned = ? WHERE id = ?', [newBanned, targetId]);

        res.json({
            message: newBanned ? 'Utilisateur banni.' : 'Utilisateur débanni.',
            is_banned: newBanned
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// PATCH promote/demote a user to admin
router.patch('/users/:id/role', async (req, res) => {
    const targetId = req.params.id;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide.' });
    }

    try {
        const result = await query('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }
        res.json({ message: `Rôle mis à jour : ${role}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// DELETE dismiss all reports for a review (mark as reviewed without deleting)
router.delete('/reports/:reviewId', async (req, res) => {
    const { reviewId } = req.params;
    try {
        await query('DELETE FROM reports WHERE review_id = ?', [reviewId]);
        res.json({ message: 'Signalements supprimés.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;
