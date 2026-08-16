-- ============================================================
-- 09 - MIGRATION RLS : Séparation par rôles
-- ============================================================

-- On supprime les anciennes politiques génériques
drop policy if exists "school_isolation" on classes;
drop policy if exists "school_isolation" on students;
drop policy if exists "school_isolation" on student_payments;
drop policy if exists "school_isolation" on staff;
drop policy if exists "school_isolation" on staff_payments;
drop policy if exists "school_isolation" on expenses;
drop policy if exists "school_isolation" on student_dues;
drop policy if exists "school_isolation" on payment_allocations;
drop policy if exists "school_isolation" on receipts;

drop policy if exists "allow_update_school" on schools;

-- Nouvelles Politiques basées sur les rôles

-- 1. Écoles (Seul le directeur peut mettre à jour)
drop policy if exists "allow_update_school_director" on schools;
create policy "allow_update_school_director" on schools for update using (
  id in (select school_id from school_users where auth_user_id = auth.uid() and role = 'directeur')
);

-- 2. Classes (Directeur = read/write, autres = read)
drop policy if exists "classes_read" on classes;
drop policy if exists "classes_write" on classes;
drop policy if exists "classes_update" on classes;
create policy "classes_read" on classes for select using (
  school_id in (select school_id from school_users where auth_user_id = auth.uid())
);
create policy "classes_write" on classes for insert with check (
  school_id in (select school_id from school_users where auth_user_id = auth.uid() and role = 'directeur')
);
create policy "classes_update" on classes for update using (
  school_id in (select school_id from school_users where auth_user_id = auth.uid() and role = 'directeur')
);

-- 3. Staff (Seul le directeur a accès)
drop policy if exists "staff_all" on staff;
drop policy if exists "staff_payments_all" on staff_payments;
create policy "staff_all" on staff using (
  school_id in (select school_id from school_users where auth_user_id = auth.uid() and role = 'directeur')
);

create policy "staff_payments_all" on staff_payments using (
  school_id in (select school_id from school_users where auth_user_id = auth.uid() and role = 'directeur')
);

-- 4. Dépenses (Directeur et Comptable)
drop policy if exists "expenses_all" on expenses;
create policy "expenses_all" on expenses using (
  school_id in (select school_id from school_users where auth_user_id = auth.uid() and role in ('directeur', 'comptable'))
);

-- 5. Élèves, Paiements, Reçus (Tout le monde a accès, le staff encaisse)
drop policy if exists "students_all" on students;
drop policy if exists "student_dues_all" on student_dues;
drop policy if exists "student_payments_all" on student_payments;
drop policy if exists "payment_allocations_all" on payment_allocations;
drop policy if exists "receipts_all" on receipts;
create policy "students_all" on students using (
  school_id in (select school_id from school_users where auth_user_id = auth.uid())
);
create policy "student_dues_all" on student_dues using (
  student_id in (select id from students where school_id in (select school_id from school_users where auth_user_id = auth.uid()))
);
create policy "student_payments_all" on student_payments using (
  school_id in (select school_id from school_users where auth_user_id = auth.uid())
);
create policy "payment_allocations_all" on payment_allocations using (
  payment_id in (select id from student_payments where school_id in (select school_id from school_users where auth_user_id = auth.uid()))
);
create policy "receipts_all" on receipts using (
  payment_id in (select id from student_payments where school_id in (select school_id from school_users where auth_user_id = auth.uid()))
);
