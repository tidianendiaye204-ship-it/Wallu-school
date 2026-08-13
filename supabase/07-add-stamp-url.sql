-- ============================================================
-- 07-add-stamp-url.sql
-- Ajoute la colonne pour stocker le tampon de l'école
-- ============================================================

ALTER TABLE schools ADD COLUMN IF NOT EXISTS stamp_url text;
