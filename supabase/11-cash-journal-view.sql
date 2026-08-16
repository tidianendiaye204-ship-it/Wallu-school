-- ============================================================
-- 11 - VUE : Journal de caisse (optimisation)
-- ============================================================

create or replace view cash_journal as
select
  p.id,
  p.school_id,
  p.paid_at as date,
  'Élève — ' || coalesce(s.full_name, 'Inconnu') || ' (Paiement)' as label,
  p.amount,
  'entree' as type
from student_payments p
left join students s on s.id = p.student_id

union all

select
  sp.id,
  sp.school_id,
  sp.paid_at as date,
  'Salaire — ' || coalesce(st.full_name, 'Inconnu') as label,
  sp.amount,
  'sortie' as type
from staff_payments sp
left join staff st on st.id = sp.staff_id

union all

select
  e.id,
  e.school_id,
  e.spent_at as date,
  e.label,
  e.amount,
  'sortie' as type
from expenses e;

-- Note: pas de RLS directement sur les vues standard (se fait sur les tables sous-jacentes)
-- mais pour plus de sécurité on peut forcer la vue avec security invoker
alter view cash_journal set (security_invoker = true);
