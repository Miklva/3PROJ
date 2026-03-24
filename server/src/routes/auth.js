const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');


const registerValidation = [
    body('username').notEmpty().withMessage("Le nom d'utilisateur est requis"),
    body('email').isEmail().withMessage('Un email valide est requis'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit faire au moins 6 caractères'),
];

const loginValidation = [
    body('email').isEmail().withMessage('Un email valide est requis'),
    body('password').notEmpty().withMessage('Le mot de passe est requis'),
];

router.post('/register', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {

        const users = await query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (users.length > 0) {
            return res.status(400).json({
                errors: [{ msg: 'Cet email ou nom d\'utilisateur est déjà utilisé' }],
            });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        const result = await query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        const userId = result.insertId;


        const token = jwt.sign(
            { id: userId },
            process.env.JWT_SECRET || 'dev_secret_key_123',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: { id: userId, username, email },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errors: [{ msg: 'Erreur serveur' }] });
    }
});

router.post('/login', loginValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const users = await query(
            'SELECT id, username, email, password FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(400).json({
                errors: [{ msg: 'Email ou mot de passe incorrect' }],
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                errors: [{ msg: 'Email ou mot de passe incorrect' }],
            });
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || 'dev_secret_key_123',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errors: [{ msg: 'Erreur serveur' }] });
    }
});

module.exports = router;
