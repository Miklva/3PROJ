-- Migration : ajout des colonnes description et is_public à la table lists
-- À exécuter une seule fois sur la base de données existante

ALTER TABLE lists
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL AFTER name,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE AFTER is_default;

-- Vérification
SHOW COLUMNS FROM lists;
