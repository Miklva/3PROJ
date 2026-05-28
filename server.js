/* ==========================================================================
   KazaERP Backend Server - Express & SQLite3
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Gemini (Remplacez par votre clé API réelle)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyBH7LqdJo2cv16wnyq279MvU2Oecg6SqQg"); // Colle ta clé ici
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Configuration des middlewares (augmentation de la limite pour les photos en base64)
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir les fichiers frontend statiques directement
app.use(express.static(__dirname));

// ==========================================================================
// INITIALISATION DE LA BASE DE DONNÉES SQLITE
// ==========================================================================
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur lors de l\'ouverture de SQLite :', err.message);
    } else {
        console.log('Connecté avec succès à la base SQLite KazaERP.');
        initDatabaseTables();
    }
});

// Wrapper Promesse pour les requêtes SQLite
const dbQuery = {
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    },
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
};

async function initDatabaseTables() {
    try {
        // 1. Table Produits
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                qty REAL NOT NULL,
                unit TEXT NOT NULL,
                price REAL DEFAULT 0,
                alert_qty REAL DEFAULT 1,
                photo TEXT,
                date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Table Membres du foyer
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS family_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                avatar_color TEXT
            )
        `);

        // 3. Table Liste de courses (Stockage persistant pour cochages et manuels)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS shopping_list (
                id TEXT PRIMARY KEY,
                product_id INTEGER,
                name TEXT NOT NULL,
                qty_needed REAL DEFAULT 1,
                unit TEXT NOT NULL,
                price REAL DEFAULT 0,
                is_auto INTEGER DEFAULT 0,
                checked INTEGER DEFAULT 0
            )
        `);

        // 4. Table Historique d'activité
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS activity_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Table Historique financier à long terme (Achats)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                category TEXT NOT NULL,
                qty REAL NOT NULL,
                price REAL NOT NULL,
                total_cost REAL NOT NULL,
                purchase_date DATETIME NOT NULL
            )
        `);

        // 6. Table Paramètres de l'application (nom de famille, etc.)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // 8. Table Planning de repas
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS meal_plan (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meal_date DATE NOT NULL,
                meal_type TEXT NOT NULL, -- 'midi' ou 'soir'
                recipe_name TEXT NOT NULL
            )
        `);

        console.log('Tables SQLite initialisées et prêtes.');

        // 7. Table Sessions de courses (chaque trajet de courses = 1 session enregistrée)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS shopping_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_cost REAL DEFAULT 0,
                items_count INTEGER DEFAULT 0,
                notes TEXT
            )
        `);

        // Migrations : nouvelles colonnes (sans erreur si déjà existantes)
        const schemaMigrations = [
            `ALTER TABLE products ADD COLUMN consumption_score REAL DEFAULT NULL`,
            `ALTER TABLE products ADD COLUMN score_auto INTEGER DEFAULT 1`,
            `ALTER TABLE products ADD COLUMN score_manual REAL DEFAULT 5`,
            `ALTER TABLE purchases ADD COLUMN session_id INTEGER DEFAULT NULL`,
            `ALTER TABLE products ADD COLUMN brand TEXT`,
            `ALTER TABLE purchases ADD COLUMN store TEXT`,
            `ALTER TABLE purchases ADD COLUMN brand TEXT`,
            `ALTER TABLE shopping_sessions ADD COLUMN store TEXT`,
            `ALTER TABLE products ADD COLUMN expiry_date DATETIME`,
            `ALTER TABLE purchases ADD COLUMN expiry_date DATETIME`
        ];
        for (const sql of schemaMigrations) {
            try { await dbQuery.run(sql); } catch(e) { /* Colonne déjà existante, on ignore */ }
        }

        await seedDatabaseIfNeeded();

    } catch (err) {
        console.error('Erreur lors de la création des tables SQLite :', err);
    }
}

// Injection de données par défaut (Graines)
async function seedDatabaseIfNeeded() {
    try {
        // 1. Seed Foyer
        const members = await dbQuery.all('SELECT * FROM family_members');
        if (members.length === 0) {
            console.log('Injection des membres par défaut...');
            await dbQuery.run("INSERT INTO family_members (name, role, avatar_color) VALUES ('Rayan', 'Administrateur', '#6366f1')");
            await dbQuery.run("INSERT INTO family_members (name, role, avatar_color) VALUES ('Papa', 'Membre', '#a855f7')");
            await dbQuery.run("INSERT INTO family_members (name, role, avatar_color) VALUES ('Maman', 'Membre', '#10b981')");
        }

        // 2. Seed Produits
        const products = await dbQuery.all('SELECT * FROM products');
        if (products.length === 0) {
            console.log('Injection des produits par défaut...');
            const defaults = [
                ['Pâtes Penne Rigate', 'Epicerie', 3.0, 'packs', 1.45, 1.0, '🍝'],
                ['Lait Demi-Écrémé', 'ProduitsLaitiers', 6.0, 'litres', 1.15, 2.0, '🥛'],
                ['Oeufs Bio x12', 'ProduitsLaitiers', 1.0, 'boîtes', 3.80, 1.0, '🥚'],
                ['Bananes Cavendish', 'FruitsLegumes', 5.0, 'pièces', 0.40, 2.0, '🍌'],
                ['Blancs de Poulet x4', 'ViandesPoissons', 0.5, 'kg', 12.90, 0.8, '🍗'],
                ['Jus d\'Orange Tropicana', 'Boissons', 4.0, 'canettes', 2.10, 1.0, '🧃']
            ];
            for (const p of defaults) {
                await dbQuery.run(
                    'INSERT INTO products (name, category, qty, unit, price, alert_qty, photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    p
                );
            }
        }

        // 3. Seed Historique d'achats à long terme (Pour alimenter de magnifiques graphiques sur 4 mois !)
        const purchases = await dbQuery.all('SELECT * FROM purchases');
        if (purchases.length === 0) {
            console.log('Injection d\'un historique d\'achats fictif sur 4 mois pour les graphiques...');
            
            // Générateur de dates dans le passé
            const createPastDateString = (daysAgo) => {
                const d = new Date();
                d.setDate(d.getDate() - daysAgo);
                return d.toISOString();
            };

            // Achats simulés (Février, Mars, Avril, Mai)
            // Format: [Nom, Catégorie, Qté, PrixUnitaire, CoûtTotal, DateISO]
            const mockPurchasesData = [
                // Février (Il y a ~90-110 jours)
                ['Blancs de Poulet x4', 'ViandesPoissons', 2, 12.90, 25.80, createPastDateString(100)],
                ['Pâtes Penne Rigate', 'Epicerie', 5, 1.45, 7.25, createPastDateString(102)],
                ['Oeufs Bio x12', 'ProduitsLaitiers', 4, 3.80, 15.20, createPastDateString(95)],
                ['Bananes Cavendish', 'FruitsLegumes', 12, 0.40, 4.80, createPastDateString(95)],
                ['Filets de Saumon', 'ViandesPoissons', 1.5, 24.00, 36.00, createPastDateString(92)],
                ['Lait Demi-Écrémé', 'ProduitsLaitiers', 12, 1.15, 13.80, createPastDateString(90)],
                ['Jus d\'Orange', 'Boissons', 8, 2.10, 16.80, createPastDateString(90)],
                ['Baguette Trad', 'Boulangerie', 15, 1.20, 18.00, createPastDateString(89)],
                
                // Mars (Il y a ~60-80 jours)
                ['Pâtes Penne Rigate', 'Epicerie', 8, 1.45, 11.60, createPastDateString(75)],
                ['Riz Basmati 5kg', 'Epicerie', 1, 9.50, 9.50, createPastDateString(75)],
                ['Steaks Hachés x10', 'ViandesPoissons', 2, 14.50, 29.00, createPastDateString(70)],
                ['Lait Demi-Écrémé', 'ProduitsLaitiers', 18, 1.15, 20.70, createPastDateString(70)],
                ['Fruits et Carottes', 'FruitsLegumes', 1, 18.40, 18.40, createPastDateString(68)],
                ['Oeufs Bio x12', 'ProduitsLaitiers', 5, 3.80, 19.00, createPastDateString(65)],
                ['Pizzas Royales', 'Surgeles', 6, 4.50, 27.00, createPastDateString(65)],
                ['Baguette Trad', 'Boulangerie', 22, 1.20, 26.40, createPastDateString(62)],
                ['Jus et Cannettes', 'Boissons', 12, 2.10, 25.20, createPastDateString(60)],

                // Avril (Il y a ~30-50 jours)
                ['Filets de Saumon', 'ViandesPoissons', 2, 24.00, 48.00, createPastDateString(48)],
                ['Oeufs Bio x12', 'ProduitsLaitiers', 3, 3.80, 11.40, createPastDateString(45)],
                ['Bananes Cavendish', 'FruitsLegumes', 15, 0.40, 6.00, createPastDateString(45)],
                ['Lait Demi-Écrémé', 'ProduitsLaitiers', 12, 1.15, 13.80, createPastDateString(40)],
                ['Blancs de Poulet x4', 'ViandesPoissons', 2, 12.90, 25.80, createPastDateString(40)],
                ['Baguette Trad', 'Boulangerie', 18, 1.20, 21.60, createPastDateString(38)],
                ['Spaghetti Panzani', 'Epicerie', 10, 1.30, 13.00, createPastDateString(35)],
                ['Frites et Glaces', 'Surgeles', 1, 16.50, 16.50, createPastDateString(32)],
                ['Eau et Sodas', 'Boissons', 2, 8.90, 17.80, createPastDateString(30)],

                // Mai (Ce mois-ci, il y a ~2-20 jours)
                ['Steaks Hachés x10', 'ViandesPoissons', 1, 14.50, 14.50, createPastDateString(20)],
                ['Oeufs Bio x12', 'ProduitsLaitiers', 6, 3.80, 22.80, createPastDateString(18)],
                ['Lait Demi-Écrémé', 'ProduitsLaitiers', 18, 1.15, 20.70, createPastDateString(18)],
                ['Pâtes Penne Rigate', 'Epicerie', 12, 1.45, 17.40, createPastDateString(15)],
                ['Pack Yaourts x16', 'ProduitsLaitiers', 2, 3.20, 6.40, createPastDateString(15)],
                ['Baguette Trad', 'Boulangerie', 15, 1.20, 18.00, createPastDateString(12)],
                ['Blancs de Poulet x4', 'ViandesPoissons', 3, 12.90, 38.70, createPastDateString(10)],
                ['Assortiment Légumes', 'FruitsLegumes', 1, 24.50, 24.50, createPastDateString(8)],
                ['Jus de Fruits', 'Boissons', 8, 2.10, 16.80, createPastDateString(5)],
                ['Glace Vanille / Pizza', 'Surgeles', 1, 18.50, 18.50, createPastDateString(2)]
            ];

            for (const row of mockPurchasesData) {
                await dbQuery.run(
                    'INSERT INTO purchases (product_name, category, qty, price, total_cost, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
                    row
                );
            }
        }
        
        // 4. Seed Log initial
        const logs = await dbQuery.all('SELECT * FROM activity_history');
        if (logs.length === 0) {
            await dbQuery.run("INSERT INTO activity_history (type, message) VALUES ('add', 'Initialisation du KazaERP v2.0 - Base de données SQLite opérationnelle.')");
        }
    } catch (err) {
        console.error('Erreur lors du peuplement de la base SQLite :', err);
    }
}

// ==========================================================================
// MOTEUR DE CALCUL DU SCORE DE CONSOMMATION (RELATIF & AUTOMATIQUE)
// ==========================================================================

async function recalculateAllScores() {
    const products = await dbQuery.all('SELECT * FROM products');
    const scoredEntries = [];

    for (const product of products) {
        if (product.score_auto === 0) continue; // Mode manuel, on skip

        const addedDate = new Date(product.date_added);
        const daysSinceAdded = (Date.now() - addedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAdded < 30) continue; // Produit trop récent (< 30 jours)

        const lookbackDays = Math.min(daysSinceAdded, 90);
        const dateLimit = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

        const purchaseData = await dbQuery.get(
            `SELECT COUNT(*) as cnt FROM purchases WHERE LOWER(product_name) LIKE LOWER(?) AND purchase_date >= ?`,
            [`%${product.name}%`, dateLimit]
        );
        const consumeData = await dbQuery.get(
            `SELECT COUNT(*) as cnt FROM activity_history WHERE type = 'minus' AND message LIKE ? AND timestamp >= ?`,
            [`%${product.name}%`, dateLimit]
        );

        const totalEvents = (purchaseData ? purchaseData.cnt : 0) + (consumeData ? consumeData.cnt : 0);
        if (totalEvents < 2) continue; // Pas assez de données

        const eventsPerMonth = (totalEvents / lookbackDays) * 30;
        scoredEntries.push({ id: product.id, eventsPerMonth });
    }

    if (scoredEntries.length === 0) return 0;

    // Normalisation relative : le plus consommé = 10, le moins consommé = 1
    const maxEPM = Math.max(...scoredEntries.map(e => e.eventsPerMonth));
    const minEPM = Math.min(...scoredEntries.map(e => e.eventsPerMonth));

    for (const entry of scoredEntries) {
        let score = maxEPM === minEPM
            ? 5.0
            : 1 + ((entry.eventsPerMonth - minEPM) / (maxEPM - minEPM)) * 9;
        score = Math.round(score * 10) / 10;
        await dbQuery.run('UPDATE products SET consumption_score = ? WHERE id = ?', [score, entry.id]);
    }

    return scoredEntries.length;
}

// ==========================================================================
// ROUTES API - GESTION DES PRODUITS (ERP STOCK)
// ==========================================================================

// Lister les produits
app.get('/api/products', async (req, res) => {
    try {
        const rows = await dbQuery.all('SELECT * FROM products ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ajouter ou mettre à jour un produit
app.post('/api/products', async (req, res) => {
    const { id, name, brand, category, qty, unit, price, alertQty, expiryDate, photo, scoreAuto, scoreManual } = req.body;
    const safeScoreAuto = scoreAuto !== undefined ? (scoreAuto ? 1 : 0) : 1;
    const safeScoreManual = parseFloat(scoreManual) || 5;
    try {
        if (id) {
            // Mise à jour
            await dbQuery.run(
                'UPDATE products SET name = ?, brand = ?, category = ?, qty = ?, unit = ?, price = ?, alert_qty = ?, expiry_date = ?, photo = ?, score_auto = ?, score_manual = ? WHERE id = ?',
                [name, brand || '', category, qty, unit, price, alertQty, expiryDate || null, photo, safeScoreAuto, safeScoreManual, id]
            );
            res.json({ success: true, id: parseInt(id) });
        } else {
            // Création
            const result = await dbQuery.run(
                'INSERT INTO products (name, brand, category, qty, unit, price, alert_qty, expiry_date, photo, score_auto, score_manual) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [name, brand || '', category, qty, unit, price, alertQty, expiryDate || null, photo, safeScoreAuto, safeScoreManual]
            );
            res.json({ success: true, id: result.lastID });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Modifier partiellement (ajustement rapide de stock +/-)
app.put('/api/products/:id', async (req, res) => {
    const { qty } = req.body;
    const { id } = req.params;
    try {
        await dbQuery.run('UPDATE products SET qty = ? WHERE id = ?', [qty, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer un produit
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbQuery.run('DELETE FROM products WHERE id = ?', [id]);
        // Nettoyer aussi les potentiels cochages automatiques dans la liste de courses
        await dbQuery.run('DELETE FROM shopping_list WHERE product_id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Recalculer les scores de consommation manuellement
app.post('/api/products/recalculate-scores', async (req, res) => {
    try {
        const updated = await recalculateAllScores();
        res.json({ success: true, updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Suggestions d'achat intelligentes : score de valeur × urgence stock
app.get('/api/products/suggestions', async (req, res) => {
    try {
        const products = await dbQuery.all('SELECT * FROM products');

        const suggestions = products.map(p => {
            const effectiveScore = (p.score_auto !== 0)
                ? (p.consumption_score || null)
                : (p.score_manual || 5);

            // Urgence : 0 = stock plein, 1 = épuisé
            const maxNormal = Math.max(p.alert_qty * 3, 0.01);
            const urgency = Math.max(0, Math.min(1, 1 - (p.qty / maxNormal)));

            // Priorité finale (60% score, 40% urgence)
            const scorePart = effectiveScore ? (effectiveScore / 10) : 0.3;
            const priority = Math.round((scorePart * 0.6 + urgency * 0.4) * 100) / 100;
            
            // Calcul du risque de péremption
            let expiryRisk = false;
            if (p.expiry_date) {
                const daysLeft = (new Date(p.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
                if (daysLeft >= 0 && daysLeft <= 3) expiryRisk = true;
            }

            let reason = '';
            if (p.qty === 0) reason = '🚨 Épuisé';
            else if (p.qty <= p.alert_qty) reason = '⚠️ Stock faible';
            else if (expiryRisk) reason = '⌛ Périme bientôt';
            else if (urgency > 0.35) reason = '📉 Stock en baisse';
            else reason = '📦 Consommation régulière';

            return { ...p, effectiveScore, urgency: Math.round(urgency * 100), priority, reason };
        })
        .filter(p => p.priority >= 0.25)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 12);

        res.json(suggestions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// ROUTES API - GESTION DE LA FAMILLE
// ==========================================================================

app.get('/api/family', async (req, res) => {
    try {
        const rows = await dbQuery.all('SELECT * FROM family_members');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/family', async (req, res) => {
    const { name, role, avatarColor } = req.body;
    try {
        const result = await dbQuery.run(
            'INSERT INTO family_members (name, role, avatar_color) VALUES (?, ?, ?)',
            [name, role, avatarColor]
        );
        res.json({ success: true, id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/family/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbQuery.run('DELETE FROM family_members WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// ROUTES API - PARAMÈTRES ET HISTORIQUE D'ACTIVITÉ
// ==========================================================================

app.get('/api/history', async (req, res) => {
    try {
        const rows = await dbQuery.all('SELECT * FROM activity_history ORDER BY id DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/history', async (req, res) => {
    const { type, message } = req.body;
    try {
        await dbQuery.run('INSERT INTO activity_history (type, message) VALUES (?, ?)', [type, message]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/history', async (req, res) => {
    try {
        await dbQuery.run('DELETE FROM activity_history');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nom de famille
app.get('/api/settings/family-name', async (req, res) => {
    try {
        const row = await dbQuery.get("SELECT value FROM settings WHERE key = 'familyName'");
        res.json({ familyName: row ? row.value : 'Famille' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/family-name', async (req, res) => {
    const { familyName } = req.body;
    try {
        await dbQuery.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('familyName', ?)", [familyName]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// ROUTES API - LISTE DE COURSES CRITICAL INTEGRATION
// ==========================================================================

// Récupérer la liste complète combinée (automatique + manuelle)
app.get('/api/shopping', async (req, res) => {
    try {
        // 1. Lire tous les articles stockés dans le panier (manuels et auto cochés)
        const dbList = await dbQuery.all('SELECT * FROM shopping_list');
        
        // 2. Extraire les produits dont le stock est faible
        const lowProducts = await dbQuery.all('SELECT * FROM products WHERE qty <= alert_qty');
        
        // 3. Fusionner :
        // Pour chaque produit en alerte, on crée un item automatique
        const autoItems = lowProducts.map(p => {
            // Chercher s'il y a déjà un cochage persistant dans la base
            const dbEntry = dbList.find(item => item.product_id === p.id);
            const qtyNeeded = p.alert_qty * 3 - p.qty <= 0 ? 1 : Math.ceil(p.alert_qty * 3 - p.qty);
            
            return {
                id: `auto-${p.id}`,
                productId: p.id,
                name: p.name,
                qtyNeeded: qtyNeeded,
                unit: p.unit,
                price: p.price || 0,
                isAuto: 1,
                checked: dbEntry ? dbEntry.checked : 0
            };
        });
        
        // Les articles manuels stockés en base
        const manualItems = dbList
            .filter(item => !item.product_id)
            .map(item => ({
                id: item.id,
                name: item.name,
                qtyNeeded: item.qty_needed,
                unit: item.unit,
                price: item.price || 0,
                isAuto: 0,
                checked: item.checked
            }));
            
        // Renvoyer la fusion
        res.json([...autoItems, ...manualItems]);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ajouter un article manuel ou sauvegarder/cocher un article automatique
app.post('/api/shopping', async (req, res) => {
    const { id, productId, name, qtyNeeded, unit, price, isAuto, checked } = req.body;
    try {
        await dbQuery.run(
            'INSERT OR REPLACE INTO shopping_list (id, product_id, name, qty_needed, unit, price, is_auto, checked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, productId || null, name, qtyNeeded, unit, price, isAuto ? 1 : 0, checked ? 1 : 0]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer un article manuel
app.delete('/api/shopping/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbQuery.run('DELETE FROM shopping_list WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Action critique : Compléter les courses (Replenish Stock + Log finances à long terme)
app.post('/api/shopping/complete', async (req, res) => {
    const { checkedItems } = req.body; // Array d'articles validés
    try {
        if (!checkedItems || checkedItems.length === 0) {
            return res.json({ success: true, count: 0 });
        }
        
        const now = new Date().toISOString();
        let replenishLog = [];

        for (const item of checkedItems) {
            const totalCost = (item.price || 0) * (item.qtyNeeded || 1);
            
            // 1. Enregistrer la dépense financière à long terme !
            await dbQuery.run(
                'INSERT INTO purchases (product_name, category, qty, price, total_cost, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    item.name, 
                    item.category || 'Epicerie', 
                    item.qtyNeeded || 1, 
                    item.price || 0, 
                    totalCost, 
                    now
                ]
            );

            // 2. Mettre à jour le stock dans le tableau produits si c'est lié à un produit
            if (item.isAuto || item.productId) {
                const prodId = item.productId || parseInt(item.id.replace('auto-', ''));
                const p = await dbQuery.get('SELECT * FROM products WHERE id = ?', [prodId]);
                if (p) {
                    const newQty = p.qty + item.qtyNeeded;
                    await dbQuery.run('UPDATE products SET qty = ? WHERE id = ?', [newQty, prodId]);
                    replenishLog.push(`${item.name} (+${item.qtyNeeded} ${item.unit})`);
                }
            } else {
                // C'est un article manuel. S'il correspond exactement à un produit existant en stock (même nom)
                // on le recharge aussi automatiquement !
                const p = await dbQuery.get('SELECT * FROM products WHERE LOWER(name) = LOWER(?)', [item.name]);
                if (p) {
                    const newQty = p.qty + (item.qtyNeeded || 1);
                    await dbQuery.run('UPDATE products SET qty = ? WHERE id = ?', [newQty, p.id]);
                    replenishLog.push(`${p.name} (+${item.qtyNeeded} ${p.unit})`);
                } else {
                    replenishLog.push(`${item.name} (Achat libre)`);
                }
            }

            // 3. Supprimer de la liste de courses de la base
            await dbQuery.run('DELETE FROM shopping_list WHERE id = ?', [item.id]);
        }

        // Ajouter l'action au journal d'activités
        const logMessage = `Achat complété : **${checkedItems.length} articles achetés**. Réapprovisionnement de : ${replenishLog.join(', ')}.`;
        await dbQuery.run("INSERT INTO activity_history (type, message) VALUES ('add', ?)", [logMessage]);

        // Créer une session de courses (enregistrement du trajet d'achat)
        const totalCostSession = checkedItems.reduce((acc, i) => acc + ((i.price || 0) * (i.qtyNeeded || 1)), 0);
        const sessionResult = await dbQuery.run(
            'INSERT INTO shopping_sessions (session_date, total_cost, items_count) VALUES (?, ?, ?)',
            [now, Math.round(totalCostSession * 100) / 100, checkedItems.length]
        );
        // Lier les achats récents à cette session
        await dbQuery.run(
            `UPDATE purchases SET session_id = ? WHERE session_id IS NULL AND purchase_date = ?`,
            [sessionResult.lastID, now]
        );

        // Recalculer les scores de consommation après chaque achat
        try { await recalculateAllScores(); } catch(e) { console.warn('Score recalc warning:', e.message); }

        res.json({ success: true, count: checkedItems.length, sessionId: sessionResult.lastID });

    } catch (err) {
        console.error('Erreur lors de la complétion des courses :', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// ROUTES API - SESSIONS DE COURSES & CLASSEMENT PRODUITS
// ==========================================================================

// Ajouter une session de courses avec produits (mise à jour du stock incluse)
app.post('/api/shopping-sessions', async (req, res) => {
    const { id, session_date, store, notes, items, total_cost_override } = req.body;
    try {
        const now = session_date ? new Date(session_date).toISOString() : new Date().toISOString();
        const sessionItems = Array.isArray(items) ? items : [];
        let sessionId = id;

        // Calcul du total depuis les articles, ou utilisation du montant saisi manuellement
        const calculatedTotal = sessionItems.reduce((acc, i) => acc + ((i.price || 0) * (i.qty || 1)), 0);
        const actualTotal = (total_cost_override !== null && total_cost_override !== undefined && total_cost_override !== '')
            ? parseFloat(total_cost_override)
            : calculatedTotal;

        if (id) {
            // --- MODE ÉDITION : RÉVERSION DU STOCK ---
            const oldPurchases = await dbQuery.all('SELECT * FROM purchases WHERE session_id = ?', [id]);
            for (const oldP of oldPurchases) {
                // Retrouver le produit par nom pour déduire l'ancien stock
                const product = await dbQuery.get('SELECT * FROM products WHERE LOWER(name) = LOWER(?)', [oldP.product_name]);
                if (product) {
                    const revertedQty = parseFloat((product.qty - oldP.qty).toFixed(2));
                    await dbQuery.run('UPDATE products SET qty = ? WHERE id = ?', [revertedQty, product.id]);
                }
            }
            // Supprimer les anciens enregistrements d'achats liés
            await dbQuery.run('DELETE FROM purchases WHERE session_id = ?', [id]);
            
            // Mettre à jour la session
            await dbQuery.run(
                'UPDATE shopping_sessions SET session_date = ?, store = ?, total_cost = ?, items_count = ?, notes = ? WHERE id = ?',
                [now, store || '', Math.round(actualTotal * 100) / 100, sessionItems.length, notes || '', id]
            );
        } else {
            // --- MODE CRÉATION ---
            const result = await dbQuery.run(
                'INSERT INTO shopping_sessions (session_date, store, total_cost, items_count, notes) VALUES (?, ?, ?, ?, ?)',
                [now, store || '', Math.round(actualTotal * 100) / 100, sessionItems.length, notes || '']
            );
            sessionId = result.lastID;
        }

        // Traiter chaque article acheté
        for (const item of sessionItems) {
            const itemTotal = Math.round((item.price || 0) * (item.qty || 1) * 100) / 100;
            let targetProductId = item.product_id;

            // Si pas d'ID produit, on cherche par nom pour voir s'il existe déjà
            if (!targetProductId) {
                const existing = await dbQuery.get('SELECT id FROM products WHERE LOWER(name) = LOWER(?)', [item.name.trim()]);
                if (existing) {
                    targetProductId = existing.id;
                } else {
                    // CRÉATION AUTOMATIQUE DU PRODUIT S'IL N'EXISTE PAS
                    const newProd = await dbQuery.run(
                        'INSERT INTO products (name, brand, category, qty, unit, price, alert_qty, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [item.name, item.brand || '', item.category || 'Autre', 0, item.unit || 'pièces', item.price || 0, 1, '📦']
                    );
                    targetProductId = newProd.lastID;
                }
            }

            // Déterminer la date de péremption pour cet article
            let itemExpiryDate = item.expiry_date || null; // Priorité à la date fournie (ex: par le scan)

            if (!itemExpiryDate) {
                // Calculer une date de péremption par défaut si non fournie
                const sessionDateObj = new Date(now);
                let daysToAdd = 30; // Par défaut pour Epicerie, Boissons, Autre

                switch (item.category) {
                    case 'FruitsLegumes':
                        daysToAdd = 7;
                        break;
                    case 'ProduitsLaitiers':
                        daysToAdd = 14;
                        break;
                    case 'ViandesPoissons':
                        daysToAdd = 5;
                        break;
                    case 'Boulangerie':
                        daysToAdd = 3;
                        break;
                    case 'Surgeles':
                        daysToAdd = 180;
                        break;
                }
                sessionDateObj.setDate(sessionDateObj.getDate() + daysToAdd);
                itemExpiryDate = sessionDateObj.toISOString().split('T')[0]; // Format YYYY-MM-DD
            }

            // Mettre à jour le stock si lié à un produit existant
            if (targetProductId) {
                const product = await dbQuery.get('SELECT * FROM products WHERE id = ?', [targetProductId]);
                const newQty = parseFloat((product.qty + (item.qty || 1)).toFixed(2));
                
                let newProductEarliestExpiry = product.expiry_date;
                if (itemExpiryDate) {
                    if (!newProductEarliestExpiry || new Date(itemExpiryDate) < new Date(newProductEarliestExpiry)) {
                        newProductEarliestExpiry = itemExpiryDate;
                    }
                }
                await dbQuery.run('UPDATE products SET qty = ?, expiry_date = ? WHERE id = ?', [newQty, newProductEarliestExpiry, targetProductId]);
            }

            // Enregistrer dans l'historique des achats (finances)
            await dbQuery.run(
                'INSERT INTO purchases (product_name, brand, store, category, qty, price, total_cost, purchase_date, session_id, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [item.name, item.brand || '', store || '', item.category || 'Epicerie', item.qty || 1, item.price || 0, itemTotal, now, sessionId, itemExpiryDate]
            );
        }

        // Journal d'activité
        const stockMsg = sessionItems.some(i => i.product_id) ? ' · Stocks mis à jour.' : '';
        await dbQuery.run("INSERT INTO activity_history (type, message) VALUES ('add', ?)",
            [`${id ? 'Modification' : 'Session'} de courses : **${actualTotal.toFixed(2)} €** · ${sessionItems.length} article(s)${stockMsg}`]
        );

        // Recalcul des scores si des produits ont été ajoutés
        if (sessionItems.length > 0) {
            try { await recalculateAllScores(); } catch(e) { console.warn('Score recalc:', e.message); }
        }

        res.json({ success: true, id: sessionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Récupérer les articles d'une session spécifique
app.get('/api/shopping-sessions/:id/items', async (req, res) => {
    const { id } = req.params;
    try {
        const items = await dbQuery.all('SELECT * FROM purchases WHERE session_id = ?', [id]);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer une session de courses
app.delete('/api/shopping-sessions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbQuery.run('DELETE FROM shopping_sessions WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Historique des sessions de courses avec stats par période
app.get('/api/shopping-sessions', async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let dateFilter = '';
        if (period === 'week')  dateFilter = `AND session_date >= datetime('now', '-7 days', 'localtime')`;
        if (period === 'month') dateFilter = `AND session_date >= datetime('now', 'start of month', 'localtime')`;
        if (period === 'year')  dateFilter = `AND session_date >= datetime('now', 'start of year', 'localtime')`;

        const sessions = await dbQuery.all(`
            SELECT * FROM shopping_sessions WHERE 1=1 ${dateFilter}
            ORDER BY session_date DESC
        `);

        const stats = await dbQuery.get(`
            SELECT
                COUNT(*) as session_count,
                ROUND(SUM(total_cost), 2) as total_spent,
                ROUND(AVG(total_cost), 2) as avg_cost,
                SUM(items_count) as total_items
            FROM shopping_sessions WHERE 1=1 ${dateFilter}
        `);

        res.json({ sessions, stats: stats || { session_count: 0, total_spent: 0, avg_cost: 0, total_items: 0 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Classement des produits les plus achetés par période
app.get('/api/analytics/top-products', async (req, res) => {
    try {
        const { period = 'month', limit = 10 } = req.query;

        let dateFilter = '';
        if (period === 'week')  dateFilter = `AND purchase_date >= datetime('now', '-7 days', 'localtime')`;
        if (period === 'month') dateFilter = `AND purchase_date >= datetime('now', 'start of month', 'localtime')`;
        if (period === 'year')  dateFilter = `AND purchase_date >= datetime('now', 'start of year', 'localtime')`;

        const topProducts = await dbQuery.all(`
            SELECT
                product_name as name,
                category,
                COUNT(*) as purchase_count,
                ROUND(SUM(qty), 2) as total_qty,
                ROUND(SUM(total_cost), 2) as total_spent
            FROM purchases
            WHERE 1=1 ${dateFilter}
            GROUP BY LOWER(product_name)
            ORDER BY total_spent DESC
            LIMIT ?
        `, [parseInt(limit)]);

        res.json(topProducts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// ROUTES API - ANALYSES FINANCIÈRES (LONG TERME)
// ==========================================================================

app.get('/api/analytics', async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let currentFilter = '';
        let prevFilter = '';

        if (period === 'week') {
            currentFilter = "purchase_date >= datetime('now', '-7 days', 'localtime')";
            prevFilter = "purchase_date < datetime('now', '-7 days', 'localtime') AND purchase_date >= datetime('now', '-14 days', 'localtime')";
        } else if (period === 'year') {
            currentFilter = "strftime('%Y', purchase_date) = strftime('%Y', 'now', 'localtime')";
            prevFilter = "strftime('%Y', purchase_date) = strftime('%Y', 'now', '-1 year', 'localtime')";
        } else { // month
            currentFilter = "strftime('%Y-%m', purchase_date) = strftime('%Y-%m', 'now', 'localtime')";
            prevFilter = "strftime('%Y-%m', purchase_date) = strftime('%Y-%m', 'now', '-1 month', 'localtime')";
        }


        // 1. Dépenses selon la période choisie
        let expensesByPeriod = [];
        if (period === 'week') {
            // Par jour sur les 7 derniers jours
            expensesByPeriod = await dbQuery.all(`
                SELECT
                    strftime('%Y-%m-%d', purchase_date) AS label,
                    ROUND(SUM(total_cost), 2) AS total
                FROM purchases
                WHERE purchase_date >= datetime('now', '-7 days', 'localtime')
                GROUP BY label
                ORDER BY label ASC
            `);
        } else if (period === 'month') {
            // Par jour du mois en cours
            expensesByPeriod = await dbQuery.all(`
                SELECT
                    strftime('%Y-%m-%d', purchase_date) AS label,
                    ROUND(SUM(total_cost), 2) AS total
                FROM purchases
                WHERE strftime('%Y-%m', purchase_date) = strftime('%Y-%m', 'now', 'localtime')
                GROUP BY label
                ORDER BY label ASC
            `);
        } else { // year
            // Par mois de l'année en cours
            expensesByPeriod = await dbQuery.all(`
                SELECT
                    strftime('%Y-%m', purchase_date) AS label,
                    ROUND(SUM(total_cost), 2) AS total
                FROM purchases
                WHERE strftime('%Y', purchase_date) = strftime('%Y', 'now', 'localtime')
                GROUP BY label
                ORDER BY label ASC
            `);
        }

        // 2. Dépenses par catégorie (pour la période sélectionnée)
        const expensesByCategoryThisMonth = await dbQuery.all(`
            SELECT 
                category, 
                ROUND(SUM(total_cost), 2) AS total 
            FROM purchases 
            WHERE ${currentFilter}
            GROUP BY category
            ORDER BY total DESC
        `);

        // 3. Coût total période en cours vs période précédente
        const totalThisMonth = await dbQuery.get(`
            SELECT ROUND(SUM(total_cost), 2) AS total FROM purchases WHERE ${currentFilter}
        `);

        const totalLastMonth = await dbQuery.get(`
            SELECT ROUND(SUM(total_cost), 2) AS total FROM purchases WHERE ${prevFilter}
        `);

        // 4. Liste récente des grosses transactions / factures
        const recentBills = await dbQuery.all(`
            SELECT 
                strftime('%Y-%m-%d %H:%M', purchase_date) AS date,
                product_name AS name,
                category,
                qty,
                price,
                total_cost AS total
            FROM purchases
            ORDER BY purchase_date DESC
            LIMIT 30
        `);

        // 5. Comparaison des magasins (Indice de prix)
        const storeComparison = await dbQuery.all(`
            SELECT 
                store, 
                COUNT(*) as items_bought,
                ROUND(AVG(price_index), 2) as price_index
            FROM (
                SELECT 
                    p.store, 
                    p.price / avg_prices.avg_p as price_index
                FROM purchases p
                JOIN (
                    SELECT product_name, AVG(price) as avg_p 
                    FROM purchases 
                    WHERE price > 0 
                    GROUP BY product_name
                ) avg_prices ON p.product_name = avg_prices.product_name
                WHERE p.store IS NOT NULL AND p.store != ''
            ) 
            GROUP BY store
            ORDER BY price_index ASC
        `);

        res.json({
            expensesByMonth: expensesByPeriod,
            chartGrouping: period === 'year' ? 'month' : 'day',
            expensesByCategoryThisMonth,
            thisMonth: totalThisMonth ? totalThisMonth.total : 0,
            lastMonth: totalLastMonth ? totalLastMonth.total : 0,
            recentBills,
            storeComparison
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route pour récupérer les achats d'un mois spécifique (clic sur graphique)
app.get('/api/analytics/details/:month', async (req, res) => {
    const { month } = req.params; // Format YYYY-MM
    try {
        const rows = await dbQuery.all(
            "SELECT product_name, total_cost, purchase_date, store FROM purchases WHERE strftime('%Y-%m', purchase_date) = ? ORDER BY purchase_date DESC",
            [month]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nouvelle route pour le Chat avec l'IA Réelle
app.post('/api/ai/chat', async (req, res) => {
    const { message } = req.body;
    try {
        // 1. Récupérer le contexte actuel du stock pour "spécialiser" l'IA
        const products = await dbQuery.all('SELECT name, qty, unit, category FROM products WHERE qty > 0');
        const family = await dbQuery.all('SELECT name, role FROM family_members');
        const history = await dbQuery.all('SELECT message, timestamp FROM activity_history ORDER BY id DESC LIMIT 20');
        
        const inventoryContext = products.map(p => `- ${p.name}: ${p.qty} ${p.unit} (${p.category})`).join('\n');
        const familyContext = family.map(f => `- ${f.name} (${f.role})`).join('\n');
        const historyContext = history.map(h => `[${h.timestamp}] ${h.message}`).join('\n');

        // 2. Construire le prompt système (Spécialisation)
        const systemPrompt = `
        Tu es KazaChef, l'assistant IA de l'ERP domestique KazaERP.
        Ton rôle est d'aider la famille à gérer sa cuisine et ses repas.
        
        CONTEXTE DU FOYER :
        ${familyContext}
        
        INVENTAIRE ACTUEL (Produits en stock) :
        ${inventoryContext}
        
        HISTORIQUE RÉCENT DES ACTIVITÉS :
        ${historyContext}
        
        DIRECTIVES :
        - Utilise en priorité les ingrédients déjà présents en stock.
        - Sois concis et amical.
        - Si on te demande une recette, donne les étapes clairement.
        - Si un ingrédient manque pour une recette, mentionne-le comme "à acheter".
        - Réponds en Markdown.
        `;

        // 3. Appel à Gemini
        const chat = model.startChat({
            history: [{ role: "user", parts: [{ text: systemPrompt }] }],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        res.json({ text: response.text() });
    } catch (err) {
        res.status(500).json({ error: "L'IA est indisponible : " + err.message });
    }
});

// Route pour scanner un ticket de caisse via l'IA
app.post('/api/ai/scan-receipt', async (req, res) => {
    const { image } = req.body; // Image en base64
    try {
        if (!image) throw new Error("Aucune image fournie");

        // Préparation de la partie image pour Gemini
        const imagePart = {
            inlineData: {
                data: image.split(',')[1],
                mimeType: "image/jpeg"
            }
        };

        const prompt = `
        Analyse ce ticket de caisse et extrais la liste des produits achetés.
        Pour chaque produit, trouve :
        1. Le nom simplifié (ex: "Pâtes Penne" au lieu de "PATE PENN REG 500G")
        2. La marque (si visible, sinon laisse vide)
        3. La quantité (nombre ou poids)
        4. Le prix unitaire (si non visible, divise le total de la ligne par la quantité)
        5. La catégorie probable (Epicerie, FruitsLegumes, ProduitsLaitiers, ViandesPoissons, Boissons, Surgeles, Boulangerie, Autre)

        Réponds UNIQUEMENT avec un objet JSON au format suivant :
        \`\`\`json
        {
          "store": "Nom du magasin",
          "items": [
            { "name": "...", "brand": "...", "qty": 1, "price": 0.00, "category": "...", "unit": "pièces", "expiry_date": "YYYY-MM-DD" }
          ]
        }
        \`\`\`
        Ne mets aucune autre phrase, seulement le JSON.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();
        
        // Extraction robuste : on cherche le premier '{' et le dernier '}'
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }
        text = text.trim();
        
        const receiptData = JSON.parse(text);
        res.json(receiptData);
    } catch (err) {
        console.error("Erreur Scan Ticket:", err);
        res.status(500).json({ error: "L'IA n'a pas pu lire le ticket correctement." });
    }
});

// --- ROUTES PLANNING DE REPAS ---
app.get('/api/meals', async (req, res) => {
    try {
        const rows = await dbQuery.all('SELECT * FROM meal_plan ORDER BY meal_date ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/meals', async (req, res) => {
    const { meal_date, meal_type, recipe_name } = req.body;
    try {
        await dbQuery.run(
            'INSERT OR REPLACE INTO meal_plan (meal_date, meal_type, recipe_name) VALUES (?, ?, ?)',
            [meal_date, meal_type, recipe_name]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/meals/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbQuery.run('DELETE FROM meal_plan WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Démarrer l'application sur le port spécifié
app.listen(PORT, () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIp = 'localhost';
    
    for (const name in networkInterfaces) {
        for (const net of networkInterfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                localIp = net.address;
                break;
            }
        }
    }

    console.log(`===================================================`);
    console.log(`   KazaERP v2.0 lancé en Full-Stack avec SQLite !`);
    console.log(`   Accédez sur votre ordinateur : http://localhost:${PORT}`);
    console.log(`   Accédez sur vos mobiles/tablettes : http://${localIp}:${PORT}`);
    console.log(`===================================================`);
});
