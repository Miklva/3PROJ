const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

async function ensureDefaultLists(userId) {
    const existing = await query('SELECT id FROM lists WHERE user_id = ? AND is_default = TRUE', [userId]);
    if (existing.length === 0) {
        await query(
            'INSERT INTO lists (user_id, name, is_default) VALUES (?, ?, TRUE), (?, ?, TRUE)',
            [userId, 'Ma Liste', userId, 'À regarder']
        );
    }
}

router.get('/me', authMiddleware, async (req, res) => {
    try {
        await ensureDefaultLists(req.user.id);
        const lists = await query(
            'SELECT id, name, is_default, created_at FROM lists WHERE user_id = ? ORDER BY is_default DESC, created_at ASC',
            [req.user.id]
        );
        res.json(lists);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/search', async (req, res) => {
    const { q } = req.query;
    const results = await query(
        `SELECT l.id, l.name, u.username FROM lists l
         JOIN users u ON l.user_id = u.id
         WHERE l.name LIKE ? AND l.is_default = FALSE LIMIT 20`,
        [`%${q}%`]
    );
    res.json(results);
});

router.post('/', authMiddleware, async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis.' });

    try {
        const result = await query(
            'INSERT INTO lists (user_id, name) VALUES (?, ?)',
            [req.user.id, name.trim()]
        );
        res.status(201).json({ id: result.insertId, name: name.trim(), is_default: false });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const lists = await query(
            'SELECT id, name FROM lists WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (lists.length === 0) return res.status(404).json({ error: 'Liste introuvable.' });

        const items = await query(
            'SELECT tmdb_id, media_type, title, poster_path, added_at FROM list_items WHERE list_id = ? ORDER BY added_at DESC',
            [req.params.id]
        );

        res.json({ ...lists[0], items });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.post('/:id/items', authMiddleware, async (req, res) => {
    const { tmdb_id, media_type, title, poster_path } = req.body;

    try {
        const lists = await query('SELECT id FROM lists WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (lists.length === 0) return res.status(404).json({ error: 'Liste introuvable.' });

        await query(
            `INSERT INTO list_items (list_id, tmdb_id, media_type, title, poster_path)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title)`,
            [req.params.id, tmdb_id, media_type, title, poster_path ?? null]
        );

        res.json({ message: 'Film ajouté.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.delete('/:id/items/:tmdb_id', authMiddleware, async (req, res) => {
    try {
        await query(
            'DELETE FROM list_items WHERE list_id = ? AND tmdb_id = ?',
            [req.params.id, req.params.tmdb_id]
        );
        res.json({ message: 'Film retiré.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const lists = await query(
            'SELECT is_default FROM lists WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (lists.length === 0) return res.status(404).json({ error: 'Liste introuvable.' });
        if (lists[0].is_default) return res.status(400).json({ error: 'Impossible de supprimer une liste par défaut.' });

        await query('DELETE FROM lists WHERE id = ?', [req.params.id]);
        res.json({ message: 'Liste supprimée.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;
