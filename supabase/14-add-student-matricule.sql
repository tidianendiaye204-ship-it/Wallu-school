-- ============================================================
-- WALLU SCHOOL — Ajout de la colonne matricule
-- ============================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS matricule text;
