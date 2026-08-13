-- ============================================================
-- WALLU SCHOOL — Ajout du stockage pour les logos
-- ============================================================

-- 1. Ajout de la colonne logo_url à la table schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url text;

-- 2. Création du bucket 'logos' (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Politique d'accès pour lire (tout le monde peut lire)
CREATE POLICY "Logos are publicly accessible" 
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- 4. Politique d'accès pour insérer (authentifié)
CREATE POLICY "Authenticated users can upload logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'logos' 
  AND auth.role() = 'authenticated'
);

-- 5. Politique d'accès pour mettre à jour
CREATE POLICY "Authenticated users can update their logos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'logos' 
  AND auth.role() = 'authenticated'
);

-- 6. Politique d'accès pour supprimer
CREATE POLICY "Authenticated users can delete their logos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'logos' 
  AND auth.role() = 'authenticated'
);
