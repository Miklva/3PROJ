const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function tmdb(path, params = {}) {
    const res = await axios.get(`${TMDB_BASE}${path}`, {
        params: { api_key: TMDB_KEY, language: 'fr-FR', ...params },
    });
    return res.data;
}

router.get('/trending', async (req, res) => {
    try {
        const data = await tmdb('/trending/all/week');
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/genres/:type', async (req, res) => {
    const { type } = req.params;
    try {
        const data = await tmdb(`/genre/${type}/list`);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/search/:type', async (req, res) => {
    const { type } = req.params;
    const { query, page = 1 } = req.query;
    try {
        const data = await tmdb(`/search/${type}`, { query, page });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/discover/:type', async (req, res) => {
    const { type } = req.params;
    const { page = 1, with_genres, primary_release_year, first_air_date_year, sort_by } = req.query;
    try {
        const data = await tmdb(`/discover/${type}`, {
            page,
            ...(with_genres && { with_genres }),
            ...(primary_release_year && { primary_release_year }),
            ...(first_air_date_year && { first_air_date_year }),
            ...(sort_by && { sort_by }),
        });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/person/search', async (req, res) => {
    const { query } = req.query;
    try {
        const data = await tmdb('/search/person', { query });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

router.get('/person/:id/credits', async (req, res) => {
    const { id } = req.params;
    try {
        const data = await tmdb(`/person/${id}/combined_credits`);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

async function getMediaWithCache(type, id) {
    const rows = await db.query(
        'SELECT data, fetched_at FROM media_cache WHERE tmdb_id = ? AND media_type = ?',
        [id, type]
    );

    if (rows.length > 0) {
        const ageMs = Date.now() - new Date(rows[0].fetched_at).getTime();
        if (ageMs < CACHE_TTL_MS) {
            console.log(`[CACHE HIT]  ${type}/${id}`);
            return JSON.parse(rows[0].data);
        }
    }

    console.log(`[CACHE MISS] ${type}/${id} → appel TMDB`);
    const mediaData = await tmdb(`/${type}/${id}`, { append_to_response: 'credits' });
    const result = { ...mediaData, media_type: type };

    await db.query(
        `INSERT INTO media_cache (tmdb_id, media_type, data, fetched_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE data = VALUES(data), fetched_at = NOW()`,
        [id, type, JSON.stringify(result)]
    );

    return result;
}

router.get('/:type/:id', async (req, res) => {
    const { type, id } = req.params;

    if (type !== 'movie' && type !== 'tv') {
        return res.status(400).json({ error: 'Type invalide. Utilisez "movie" ou "tv".' });
    }

    try {
        const mediaData = await getMediaWithCache(type, id);
        res.json(mediaData);
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Œuvre introuvable.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;