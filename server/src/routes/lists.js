const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const DEFAULT_LISTS = [
    { name: 'À voir' },
    { name: 'En cours' },
    { name: 'Terminé' },
    { name: 'Abandonné' },
];

async function ensureDefaultLists(userId) {
    const existing = await query(
        'SELECT name FROM lists WHERE user_id = ? AND is_default = TRUE',
        [userId]
    );
    const existingNames = existing.map(r => r.name);

    for (const list of DEFAULT_LISTS) {
        if (!existingNames.includes(list.name)) {
            await query(
                'INSERT INTO lists (user_id, name, is_default, is_public) VALUES (?, ?, TRUE, FALSE)',
                [userId, list.name]
            );
        }
    }
}

router.get('/me', authMiddleware, async (req, res) => {
    try {
        await ensureDefaultLists(req.user.id);
        const lists = await query(
            `SELECT l.id, l.name, l.description, l.is_default, l.is_public, l.created_at,
                    COUNT(li.id) AS item_count
             FROM lists l
             LEFT JOIN list_items li ON li.list_id = l.id
             WHERE l.user_id = ?
             GROUP BY l.id
             ORDER BY l.is_default DESC, l.created_at ASC`,
            [req.user.id]
        );
        res.json(lists);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/stats', authMiddleware, async (req, res) => {
    try {
        await ensureDefaultLists(req.user.id);

        const defaultStats = await query(
            `SELECT l.name, COUNT(li.id) AS count
             FROM lists l
             LEFT JOIN list_items li ON li.list_id = l.id
             WHERE l.user_id = ? AND l.is_default = TRUE
             GROUP BY l.id, l.name`,
            [req.user.id]
        );

        const [customCount] = await query(
            'SELECT COUNT(*) AS count FROM lists WHERE user_id = ? AND is_default = FALSE',
            [req.user.id]
        );

        const [totalItems] = await query(
            `SELECT COUNT(DISTINCT CONCAT(li.tmdb_id, '-', li.media_type)) AS count
             FROM list_items li
             JOIN lists l ON l.id = li.list_id
             WHERE l.user_id = ?`,
            [req.user.id]
        );

        const terminatedList = await query(
            'SELECT id FROM lists WHERE user_id = ? AND name = ? AND is_default = TRUE LIMIT 1',
            [req.user.id, 'Terminé']
        );
        let mediaBreakdown = [];
        if (terminatedList.length > 0) {
            mediaBreakdown = await query(
                `SELECT media_type, COUNT(*) AS count
                 FROM list_items WHERE list_id = ?
                 GROUP BY media_type`,
                [terminatedList[0].id]
            );
        }

        const recentItems = await query(
            `SELECT li.title, li.poster_path, li.media_type, li.tmdb_id, li.added_at, l.name AS list_name
             FROM list_items li
             JOIN lists l ON l.id = li.list_id
             WHERE l.user_id = ?
             ORDER BY li.added_at DESC
             LIMIT 5`,
            [req.user.id]
        );

        res.json({
            defaultStats,
            customListCount: customCount.count,
            totalUniqueItems: totalItems.count,
            terminatedBreakdown: mediaBreakdown,
            recentItems,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/search', async (req, res) => {
    const { q } = req.query;
    try {
        const results = await query(
            `SELECT l.id, l.name, l.description, u.username,
                    COUNT(li.id) AS item_count
             FROM lists l
             JOIN users u ON l.user_id = u.id
             LEFT JOIN list_items li ON li.list_id = l.id
             WHERE l.name LIKE ? AND l.is_default = FALSE AND l.is_public = TRUE
             GROUP BY l.id
             LIMIT 20`,
            [`%${q?.trim() ?? ''}%`]
        );
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        let userId = null;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch {}
        }

        const lists = await query(
            'SELECT id, user_id, name, description, is_default, is_public FROM lists WHERE id = ?',
            [req.params.id]
        );
        if (lists.length === 0) return res.status(404).json({ error: 'Liste introuvable.' });

        const list = lists[0];
        const isOwner = userId === list.user_id;

        if (!list.is_public && !isOwner) {
            return res.status(403).json({ error: 'Liste privée.' });
        }

        const items = await query(
            'SELECT tmdb_id, media_type, title, poster_path, added_at FROM list_items WHERE list_id = ? ORDER BY added_at DESC',
            [req.params.id]
        );

        res.json({ ...list, items, is_owner: isOwner });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const { name, description, is_public } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis.' });

    try {
        const result = await query(
            'INSERT INTO lists (user_id, name, description, is_public) VALUES (?, ?, ?, ?)',
            [req.user.id, name.trim(), description?.trim() || null, is_public ? 1 : 0]
        );
        res.status(201).json({
            id: result.insertId,
            name: name.trim(),
            description: description?.trim() || null,
            is_default: false,
            is_public: !!is_public,
            item_count: 0,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    const { name, description, is_public } = req.body;

    try {
        const lists = await query(
            'SELECT id, is_default FROM lists WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (lists.length === 0) return res.status(404).json({ error: 'Liste introuvable.' });
        if (lists[0].is_default) return res.status(400).json({ error: 'Impossible de modifier une liste par défaut.' });

        const updates = [];
        const values = [];

        if (name?.trim()) { updates.push('name = ?'); values.push(name.trim()); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description?.trim() || null); }
        if (is_public !== undefined) { updates.push('is_public = ?'); values.push(is_public ? 1 : 0); }

        if (updates.length === 0) return res.status(400).json({ error: 'Aucune modification fournie.' });

        values.push(req.params.id);
        await query(`UPDATE lists SET ${updates.join(', ')} WHERE id = ?`, values);

        res.json({ message: 'Liste mise à jour.' });
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

        res.json({ message: 'Oeuvre ajoutée.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.delete('/:id/items/:tmdb_id', authMiddleware, async (req, res) => {
    try {
        const lists = await query('SELECT id FROM lists WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (lists.length === 0) return res.status(403).json({ error: 'Accès refusé.' });

        await query(
            'DELETE FROM list_items WHERE list_id = ? AND tmdb_id = ?',
            [req.params.id, req.params.tmdb_id]
        );
        res.json({ message: 'Oeuvre retirée.' });
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
