const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Configuration de multer pour l'upload d'avatars
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
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Format d\'image non supporté (jpeg, jpg, png, webp)'));
    }
});

// GET /api/users/me — Profil de l'utilisateur connecté
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const users = await query(
            'SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const user = users[0];

        // Récupérer les compteurs
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

// PUT /api/users/me — Mettre à jour la bio
router.put('/me', authMiddleware, async (req, res) => {
    const { bio } = req.body;
    try {
        await query('UPDATE users SET bio = ? WHERE id = ?', [bio, req.user.id]);
        res.json({ message: 'Profil mis à jour' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/users/me/avatar — Uploader un avatar
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier uploadé' });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);

        res.json({ avatar_url: avatarUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/users/:id/follow — Suivre un utilisateur
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

// DELETE /api/users/:id/follow — Ne plus suivre
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

module.exports = router;
