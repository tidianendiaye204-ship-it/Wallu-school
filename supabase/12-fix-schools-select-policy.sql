-- ========================================================================================
-- 12 - CORRECTIF : Autoriser la lecture de l'école lors de sa création
-- ========================================================================================

-- Corrige l'erreur de "new row violates row-level security policy" lors de la création de l'école.
-- Le client Supabase effectue un INSERT puis un SELECT immédiat. Si l'utilisateur n'est pas encore 
-- dans 'school_users' (ce qui est le cas juste après la création), le SELECT échoue et annule l'opération.
-- Cette modification autorise le créateur (created_by) à lire la ligne.

DROP POLICY IF EXISTS "schools_select" ON public.schools;

CREATE POLICY "schools_select" ON public.schools
  FOR SELECT USING (
    id IN (SELECT auth_user_schools())
    OR created_by = auth.uid()
  );
