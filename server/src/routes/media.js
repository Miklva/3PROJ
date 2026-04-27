const express = require('express');
const router = express.Router();
const axios = require('axios');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;

router.get('/:type/:id', async (req, res) => {
    const { type, id } = req.params;

    if (type !== 'movie' && type !== 'tv') {
        return res.status(400).json({ error: 'Type invalide. Utilisez "movie" ou "tv".' });
    }

    try {
        const response = await axios.get(`${TMDB_BASE}/${type}/${id}`, {
            params: {
                api_key: TMDB_KEY,
                language: 'fr-FR',
                append_to_response: 'credits',
            },
        });

        res.json({ ...response.data, media_type: type });
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Œuvre introuvable.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;