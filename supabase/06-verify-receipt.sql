-- ============================================================
-- 06-verify-receipt.sql
-- Fonction RPC publique pour vérifier l'authenticité d'un reçu 
-- sans exposer les données via RLS.
-- ============================================================

create or replace function verify_receipt(p_receipt_number text)
returns json as $$
declare
  v_result json;
begin
  select json_build_object(
    'receipt_number', r.receipt_number,
    'school_name', sc.name,
    'student_name', st.full_name,
    'amount', sp.amount,
    'paid_at', sp.paid_at
  ) into v_result
  from receipts r
  join student_payments sp on r.payment_id = sp.id
  join students st on sp.student_id = st.id
  join schools sc on sp.school_id = sc.id
  where r.receipt_number = p_receipt_number;

  return coalesce(v_result, null);
end;
$$ language plpgsql security definer;
