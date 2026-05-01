const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/avatars';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Format d\'image non supporté (jpeg, jpg, png, webp)'));
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const users = await query(
            'SELECT id, username, email, bio, website_url, avatar_url, theme, language, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const user = users[0];

        const followers = await query('SELECT COUNT(*) as count FROM subscriptions WHERE following_id = ?', [user.id]);
        const following = await query('SELECT COUNT(*) as count FROM subscriptions WHERE follower_id = ?', [user.id]);

        res.json({
            ...user,
            followers_count: followers[0].count,
            following_count: following[0].count
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/search', async (req, res) => {
    const { q = '' } = req.query;
    const results = await query(
        'SELECT id, username, avatar_url FROM users WHERE username LIKE ? LIMIT 50',
        [`%${q}%`]
    );
    res.json(results);
});

router.get('/:id', async (req, res) => {
    try {
        const users = await query(
            'SELECT id, username, bio, avatar_url, website_url, created_at FROM users WHERE id = ?',
            [req.params.id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable.' });
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.put('/me', authMiddleware, async (req, res) => {
    const { username, bio, website_url, theme, language } = req.body;
    try {
        const updates = [];
        const params = [];

        if (username !== undefined) { updates.push('username = ?'); params.push(username); }
        if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
        if (website_url !== undefined) { updates.push('website_url = ?'); params.push(website_url); }
        if (theme !== undefined) { updates.push('theme = ?'); params.push(theme); }
        if (language !== undefined) { updates.push('language = ?'); params.push(language); }

        if (updates.length === 0 && !req.body.newPassword) {
            return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
        }

        if (req.body.currentPassword && req.body.newPassword) {
            const { currentPassword, newPassword } = req.body;
            
            const userResults = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
            const user = userResults[0];

            if (!user.password) {
                return res.status(400).json({ message: 'Ce compte utilise une connexion sociale. Impossible de changer le mot de passe.' });
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'L\'ancien mot de passe est incorrect' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            updates.push('password = ?');
            params.push(hashedPassword);
        }

        if (updates.length > 0) {
            params.push(req.user.id);
            const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            await query(sql, params);
        }
        
        res.json({ message: 'Profil mis à jour' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/me/avatar', authMiddleware, (req, res) => {
    upload.single('avatar')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Aucun fichier uploadé' });
            }

            const avatarUrl = `/uploads/avatars/${req.file.filename}`;
            await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);

            res.json({ avatar_url: avatarUrl });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erreur serveur lors de l\'upload' });
        }
    });
});

router.post('/:id/follow', authMiddleware, async (req, res) => {
    const targetId = req.params.id;
    if (targetId == req.user.id) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous suivre vous-même' });
    }

    try {
        await query(
            'INSERT IGNORE INTO subscriptions (follower_id, following_id) VALUES (?, ?)',
            [req.user.id, targetId]
        );
        res.json({ message: 'Utilisateur suivi' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/:id/follow', authMiddleware, async (req, res) => {
    const targetId = req.params.id;
    try {
        await query(
            'DELETE FROM subscriptions WHERE follower_id = ? AND following_id = ?',
            [req.user.id, targetId]
        );
        res.json({ message: 'Désabonnement réussi' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        await query('DELETE FROM users WHERE id = ?', [userId]);
        
        res.json({ message: 'Compte supprimé avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la suppression du compte' });
    }
});

router.get('/me/export', authMiddleware, async (req, res) => {
    try {
        const users = await query(
            'SELECT id, username, email, bio, website_url, avatar_url, theme, language, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const user = users[0];

        const followers = await query('SELECT u.username, u.email FROM subscriptions s JOIN users u ON s.follower_id = u.id WHERE s.following_id = ?', [user.id]);
        const following = await query('SELECT u.username, u.email FROM subscriptions s JOIN users u ON s.following_id = u.id WHERE s.follower_id = ?', [user.id]);

        const exportData = {
            profile: user,
            followers: followers,
            following: following,
            exported_at: new Date().toISOString(),
            info: "Ceci est votre export de données personnelles conforme au RGPD."
        };

        res.setHeader('Content-disposition', 'attachment; filename=supcontent-data-export.json');
        res.setHeader('Content-type', 'application/json');
        res.write(JSON.stringify(exportData, null, 2));
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'export' });
    }
});

module.exports = router;
