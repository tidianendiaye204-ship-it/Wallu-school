-- ============================================================
-- WALLU SCHOOL — Protection de l'historique financier (RESTRICT)
-- ============================================================

-- student_dues
ALTER TABLE student_dues DROP CONSTRAINT IF EXISTS student_dues_student_id_fkey;
ALTER TABLE student_dues ADD CONSTRAINT student_dues_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

-- student_payments
ALTER TABLE student_payments DROP CONSTRAINT IF EXISTS student_payments_student_id_fkey;
ALTER TABLE student_payments ADD CONSTRAINT student_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

-- student_inscription_payments (si la table existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_inscription_payments') THEN
    ALTER TABLE student_inscription_payments DROP CONSTRAINT IF EXISTS student_inscription_payments_student_id_fkey;
    ALTER TABLE student_inscription_payments ADD CONSTRAINT student_inscription_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;
  END IF;
END $$;
