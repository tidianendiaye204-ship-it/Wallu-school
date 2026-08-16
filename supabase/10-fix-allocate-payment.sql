-- ============================================================
-- 10 - SÉCURISATION MÉTIER : Limite de report des paiements
-- ============================================================
-- Empêche la fonction d'allocation de boucler indéfiniment
-- si un utilisateur saisit un montant aberrant (ex: 50 000 000 FCFA).

create or replace function allocate_student_payment(p_payment_id uuid)
returns void as $$
declare
  v_payment student_payments%rowtype;
  v_remaining numeric(12,2);
  v_due record;
  v_to_allocate numeric(12,2);
  v_last_period date;
  v_monthly_fee numeric(12,2);
  v_next_due_id uuid;
  v_loop_count int := 0;
begin
  select * into v_payment from student_payments where id = p_payment_id;
  v_remaining := v_payment.amount;

  -- 1. Éponger les échéances existantes non soldées, de la plus ancienne à la plus récente
  for v_due in
    select * from student_dues
    where student_id = v_payment.student_id
      and amount_allocated < amount_due
    order by period asc
  loop
    exit when v_remaining <= 0;
    v_to_allocate := least(v_remaining, v_due.amount_due - v_due.amount_allocated);

    update student_dues
      set amount_allocated = amount_allocated + v_to_allocate
      where id = v_due.id;

    insert into payment_allocations (payment_id, student_due_id, amount_allocated)
      values (p_payment_id, v_due.id, v_to_allocate);

    v_remaining := v_remaining - v_to_allocate;
    v_last_period := v_due.period;
  end loop;

  -- 2. S'il reste un excédent, le reporter sur le(s) mois suivant(s)
  if v_remaining > 0 then
    select coalesce(monthly_fee, (select monthly_fee from classes where id = (select class_id from students where id = v_payment.student_id)))
      into v_monthly_fee
      from students where id = v_payment.student_id;

    if v_last_period is null then
      select min(period) into v_last_period from student_dues where student_id = v_payment.student_id;
      v_last_period := coalesce(v_last_period, date_trunc('month', now())::date);
    end if;

    while v_remaining > 0 loop
      v_loop_count := v_loop_count + 1;
      
      -- SÉCURITÉ : Bloquer au-delà de 24 mois d'avance (montant sûrement erroné)
      if v_loop_count > 24 then
        raise exception 'Montant trop élevé : impossible de reporter sur plus de 24 mois. Veuillez vérifier la saisie.';
      end if;

      v_last_period := (v_last_period + interval '1 month')::date;

      insert into student_dues (student_id, period, amount_due, amount_allocated)
        values (v_payment.student_id, v_last_period, coalesce(v_monthly_fee, 0), least(v_remaining, coalesce(v_monthly_fee, v_remaining)))
        on conflict (student_id, period)
        do update set amount_allocated = student_dues.amount_allocated + least(v_remaining, coalesce(v_monthly_fee, v_remaining))
        returning id into v_next_due_id;

      insert into payment_allocations (payment_id, student_due_id, amount_allocated)
        values (p_payment_id, v_next_due_id, least(v_remaining, coalesce(v_monthly_fee, v_remaining)));

      v_remaining := v_remaining - least(v_remaining, coalesce(v_monthly_fee, v_remaining));

      -- sécurité anti-boucle infinie si monthly_fee = 0
      exit when coalesce(v_monthly_fee, 0) = 0;
    end loop;
  end if;
end;
$$ language plpgsql;
