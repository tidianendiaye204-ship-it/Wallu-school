-- ============================================================
-- 13 - MIGRATION : Contrainte d'unicité sur le créateur de l'école
-- ============================================================

-- Cette contrainte garantit qu'un même compte utilisateur (directeur)
-- ne peut pas créer physiquement plus d'une école dans la base de données.
-- Elle empêche de manière préventive la création d'écoles "fantômes"
-- (doublons) en cas de rafraîchissement ou de re-soumission involontaire.

-- Attention : S'il y a déjà des doublons dans la table, cette commande
-- va échouer. Veillez à nettoyer les doublons (avec la requête fournie)
-- avant de lancer cette migration.

ALTER TABLE public.schools 
ADD CONSTRAINT unique_created_by UNIQUE (created_by);
