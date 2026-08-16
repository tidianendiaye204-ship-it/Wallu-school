-- 1. Ajouter la colonne status à la table schools (par défaut 'actif')
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status text DEFAULT 'actif';

-- 2. Créer des politiques RLS permettant au Super Admin (votre email) d'avoir tous les droits sur schools et school_users
-- Note : Dans Supabase, les politiques se cumulent (OR), donc cela s'ajoute aux droits existants.

CREATE POLICY "super_admin_all_schools" 
ON schools 
FOR ALL 
USING ( (auth.jwt() ->> 'email') = 'maboul1847@gmail.com' );

CREATE POLICY "super_admin_all_school_users" 
ON school_users 
FOR ALL 
USING ( (auth.jwt() ->> 'email') = 'maboul1847@gmail.com' );
