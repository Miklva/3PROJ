const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

async function isMutualFollow(userA, userB) {
    const rows = await query(
        `SELECT
            SUM(follower_id = ? AND following_id = ?) AS aFollowsB,
            SUM(follower_id = ? AND following_id = ?) AS bFollowsA
         FROM subscriptions
         WHERE (follower_id = ? AND following_id = ?)
            OR (follower_id = ? AND following_id = ?)`,
        [userA, userB, userB, userA, userA, userB, userB, userA]
    );
    return Number(rows[0].aFollowsB) > 0 && Number(rows[0].bFollowsA) > 0;
}

router.get('/conversations', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const conversations = await query(
            `SELECT
                partner.id              AS partner_id,
                partner.username        AS partner_username,
                partner.avatar_url      AS partner_avatar,
                last_msg.content        AS last_message,
                last_msg.created_at     AS last_message_at,
                last_msg.sender_id      AS last_sender_id,
                COALESCE(unread.cnt, 0) AS unread_count
             FROM (
                 SELECT
                     CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id,
                     MAX(id) AS last_id
                 FROM messages
                 WHERE sender_id = ? OR receiver_id = ?
                 GROUP BY partner_id
             ) conv
             JOIN users partner      ON partner.id    = conv.partner_id
             JOIN messages last_msg  ON last_msg.id   = conv.last_id
             LEFT JOIN (
                 SELECT sender_id, COUNT(*) AS cnt
                 FROM messages
                 WHERE receiver_id = ? AND is_read = FALSE
                 GROUP BY sender_id
             ) unread ON unread.sender_id = conv.partner_id
             ORDER BY last_msg.created_at DESC`,
            [userId, userId, userId, userId]
        );
        res.json(conversations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/:partnerId', authMiddleware, async (req, res) => {
    const userId    = req.user.id;
    const partnerId = parseInt(req.params.partnerId);

    if (isNaN(partnerId) || userId === partnerId) {
        return res.status(400).json({ error: 'ID invalide.' });
    }

    try {
        const partnerRows = await query('SELECT id, username, avatar_url FROM users WHERE id = ?', [partnerId]);
        if (partnerRows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }

        const mutual = await isMutualFollow(userId, partnerId);
        if (!mutual) {
            return res.status(403).json({ error: 'Vous devez vous suivre mutuellement pour envoyer des messages.' });
        }

        await query(
            'UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
            [partnerId, userId]
        );

        const messages = await query(
            `SELECT id, sender_id, receiver_id, content, is_read, created_at
             FROM (
                 SELECT id, sender_id, receiver_id, content, is_read, created_at
                 FROM messages
                 WHERE (sender_id = ? AND receiver_id = ?)
                    OR (sender_id = ? AND receiver_id = ?)
                 ORDER BY created_at DESC
                 LIMIT 50
             ) t
             ORDER BY created_at ASC`,
            [userId, partnerId, partnerId, userId]
        );

        res.json({
            partner: partnerRows[0],
            messages,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.post('/:partnerId', authMiddleware, async (req, res) => {
    const senderId   = req.user.id;
    const receiverId = parseInt(req.params.partnerId);
    const { content } = req.body;

    if (isNaN(receiverId) || senderId === receiverId) {
        return res.status(400).json({ error: 'ID invalide.' });
    }
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
    }
    if (content.trim().length > 2000) {
        return res.status(400).json({ error: 'Le message ne doit pas dépasser 2000 caractères.' });
    }

    try {
        const [userRow] = await query('SELECT is_banned FROM users WHERE id = ?', [senderId]);
        if (userRow?.is_banned) {
            return res.status(403).json({ error: 'Votre compte a été banni.' });
        }

        const receiver = await query('SELECT id FROM users WHERE id = ?', [receiverId]);
        if (receiver.length === 0) {
            return res.status(404).json({ error: 'Destinataire introuvable.' });
        }

        const mutual = await isMutualFollow(senderId, receiverId);
        if (!mutual) {
            return res.status(403).json({ error: 'Vous devez vous suivre mutuellement pour envoyer des messages.' });
        }

        const result = await query(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [senderId, receiverId, content.trim()]
        );

        res.status(201).json({
            id: result.insertId,
            sender_id: senderId,
            receiver_id: receiverId,
            content: content.trim(),
            is_read: false,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;