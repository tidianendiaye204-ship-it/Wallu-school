-- ========================================================================================
-- FIX RLS — Casse la récursion infinie sur school_users et schools
-- À exécuter dans le SQL Editor de Supabase APRÈS 03-rls-secure.sql
-- ========================================================================================

-- 1. Fonction SECURITY DEFINER pour lire school_users sans RLS (casse la boucle)
--    Elle est déjà créée dans 03-rls-secure.sql mais on la recrée pour être sûr.
CREATE OR REPLACE FUNCTION auth_user_schools() RETURNS SETOF uuid AS $$
  SELECT school_id FROM public.school_users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Fonction SECURITY DEFINER pour vérifier si un user est créateur d'une école
CREATE OR REPLACE FUNCTION auth_user_created_school(p_school_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools WHERE id = p_school_id AND created_by = auth.uid()
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Supprimer les anciennes policies récursives
DROP POLICY IF EXISTS "schools_select" ON public.schools;
DROP POLICY IF EXISTS "schools_insert" ON public.schools;
DROP POLICY IF EXISTS "schools_update" ON public.schools;
DROP POLICY IF EXISTS "school_users_select" ON public.school_users;
DROP POLICY IF EXISTS "school_users_insert" ON public.school_users;

-- 4. Recréer les policies SANS récursion

-- Schools : utilise auth_user_schools() (SECURITY DEFINER, donc pas de récursion)
CREATE POLICY "schools_select" ON public.schools
  FOR SELECT USING (id IN (SELECT auth_user_schools()));

-- Schools INSERT : tout utilisateur authentifié peut créer, created_by doit être soi-même
CREATE POLICY "schools_insert" ON public.schools
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (created_by IS NULL OR created_by = auth.uid()));

-- Schools UPDATE : seuls les membres de l'école
CREATE POLICY "schools_update" ON public.schools
  FOR UPDATE USING (id IN (SELECT auth_user_schools()))
  WITH CHECK (id IN (SELECT auth_user_schools()));

-- School Users SELECT : utilise auth_user_schools() au lieu de s'auto-référencer
CREATE POLICY "school_users_select" ON public.school_users
  FOR SELECT USING (
    school_id IN (SELECT auth_user_schools())
    OR auth_user_id = auth.uid()
  );

-- School Users INSERT : on peut s'ajouter à une école qu'on a créée
-- Utilise auth_user_created_school() (SECURITY DEFINER) pour éviter la récursion vers schools
CREATE POLICY "school_users_insert" ON public.school_users
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid()
    AND auth_user_created_school(school_id)
  );
