-- ========================================================================================
-- SCRIPT DE SÉCURISATION RLS DÉFINITIVE (MULTI-ÉCOLE INCASSABLE)
-- À exécuter dans le SQL Editor de Supabase
-- ========================================================================================

-- 1. Ajout de created_by sur schools pour une vraie défense en profondeur
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Associer les écoles existantes à leur créateur (le premier de school_users)
UPDATE public.schools s
SET created_by = (
  SELECT auth_user_id 
  FROM public.school_users su 
  WHERE su.school_id = s.id 
  LIMIT 1
)
WHERE created_by IS NULL;

-- 2. Activer RLS partout (incluant la nouvelle table)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_inscription_payments ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer toutes les anciennes politiques pour repartir au propre
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 4. POLITIQUES STRICTES (SELECT, INSERT, UPDATE, DELETE)

-- Schools
-- Lecture : On peut lire l'école si on est dans school_users
CREATE POLICY "schools_select" ON public.schools FOR SELECT USING (id IN (SELECT school_id FROM public.school_users WHERE auth_user_id = auth.uid()));
-- Insertion : N'importe qui peut créer, mais le created_by doit être lui-même
CREATE POLICY "schools_insert" ON public.schools FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
-- Modification : Seuls les membres peuvent modifier
CREATE POLICY "schools_update" ON public.schools FOR UPDATE USING (id IN (SELECT school_id FROM public.school_users WHERE auth_user_id = auth.uid())) WITH CHECK (id IN (SELECT school_id FROM public.school_users WHERE auth_user_id = auth.uid()));

-- School Users
-- Lecture : On peut voir les autres utilisateurs de son école
CREATE POLICY "school_users_select" ON public.school_users FOR SELECT USING (school_id IN (SELECT school_id FROM public.school_users WHERE auth_user_id = auth.uid()) OR auth_user_id = auth.uid());
-- Insertion : On peut s'insérer si on est le créateur de l'école (Défense contre l'auto-assignation pirate)
CREATE POLICY "school_users_insert" ON public.school_users FOR INSERT WITH CHECK (auth_user_id = auth.uid() AND school_id IN (SELECT id FROM public.schools WHERE created_by = auth.uid()));

-- Fonction utilitaire pour éviter la répétition (Performance)
CREATE OR REPLACE FUNCTION auth_user_schools() RETURNS SETOF uuid AS $$
  SELECT school_id FROM public.school_users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Classes
CREATE POLICY "classes_select" ON public.classes FOR SELECT USING (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "classes_insert" ON public.classes FOR INSERT WITH CHECK (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "classes_update" ON public.classes FOR UPDATE USING (school_id IN (SELECT auth_user_schools())) WITH CHECK (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "classes_delete" ON public.classes FOR DELETE USING (school_id IN (SELECT auth_user_schools()));

-- Students
CREATE POLICY "students_select" ON public.students FOR SELECT USING (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "students_insert" ON public.students FOR INSERT WITH CHECK (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "students_update" ON public.students FOR UPDATE USING (school_id IN (SELECT auth_user_schools())) WITH CHECK (school_id IN (SELECT auth_user_schools()));

-- Dues
CREATE POLICY "dues_select" ON public.student_dues FOR SELECT USING (student_id IN (SELECT id FROM public.students WHERE school_id IN (SELECT auth_user_schools())));
CREATE POLICY "dues_insert" ON public.student_dues FOR INSERT WITH CHECK (student_id IN (SELECT id FROM public.students WHERE school_id IN (SELECT auth_user_schools())));
CREATE POLICY "dues_update" ON public.student_dues FOR UPDATE USING (student_id IN (SELECT id FROM public.students WHERE school_id IN (SELECT auth_user_schools()))) WITH CHECK (student_id IN (SELECT id FROM public.students WHERE school_id IN (SELECT auth_user_schools())));

-- Payments
CREATE POLICY "payments_select" ON public.student_payments FOR SELECT USING (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "payments_insert" ON public.student_payments FOR INSERT WITH CHECK (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "payments_update" ON public.student_payments FOR UPDATE USING (school_id IN (SELECT auth_user_schools())) WITH CHECK (school_id IN (SELECT auth_user_schools()));

-- Allocations
CREATE POLICY "allocations_select" ON public.payment_allocations FOR SELECT USING (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools())));
CREATE POLICY "allocations_insert" ON public.payment_allocations FOR INSERT WITH CHECK (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools())));
CREATE POLICY "allocations_update" ON public.payment_allocations FOR UPDATE USING (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools()))) WITH CHECK (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools())));

-- Inscription Payments
CREATE POLICY "inscriptions_select" ON public.student_inscription_payments FOR SELECT USING (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "inscriptions_insert" ON public.student_inscription_payments FOR INSERT WITH CHECK (school_id IN (SELECT auth_user_schools()));

-- Receipts (n'a pas de school_id direct, utilise payment_id)
CREATE POLICY "receipts_select" ON public.receipts FOR SELECT USING (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools())));
CREATE POLICY "receipts_insert" ON public.receipts FOR INSERT WITH CHECK (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools())));
CREATE POLICY "receipts_update" ON public.receipts FOR UPDATE USING (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools()))) WITH CHECK (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools())));
CREATE POLICY "receipts_delete" ON public.receipts FOR DELETE USING (payment_id IN (SELECT id FROM public.student_payments WHERE school_id IN (SELECT auth_user_schools())));

-- Staff, Staff Payments, Expenses (tous directs avec school_id)
CREATE POLICY "staff_all" ON public.staff FOR ALL USING (school_id IN (SELECT auth_user_schools())) WITH CHECK (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "staff_payments_all" ON public.staff_payments FOR ALL USING (school_id IN (SELECT auth_user_schools())) WITH CHECK (school_id IN (SELECT auth_user_schools()));
CREATE POLICY "expenses_all" ON public.expenses FOR ALL USING (school_id IN (SELECT auth_user_schools())) WITH CHECK (school_id IN (SELECT auth_user_schools()));

ALTER FUNCTION public.allocate_student_payment(uuid) SET search_path = public;
ALTER FUNCTION public.trg_allocate_on_payment() SET search_path = public;

-- 6. Suppression des vues vulnérables
DROP VIEW IF EXISTS public.school_monthly_balance;
DROP VIEW IF EXISTS public.student_inscription_status;
