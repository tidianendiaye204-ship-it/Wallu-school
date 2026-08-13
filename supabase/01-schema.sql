-- ============================================================
-- WALLU SCHOOL — Schéma Supabase (PostgreSQL)
-- Gestion financière scolaire : paiements élèves, report de
-- solde, paiements profs, reçus, bilan entrées/sorties.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ÉCOLES ----------
create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  director_name text not null,
  phone text not null,          -- utilisé aussi pour WhatsApp
  city text,
  code text unique not null,    -- ex: WS-ETO-4821
  created_at timestamptz default now()
);

-- ---------- UTILISATEURS (directeur, comptable, etc.) ----------
create table school_users (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  role text not null default 'directeur', -- directeur | comptable | staff
  phone text,
  created_at timestamptz default now()
);

-- ---------- CLASSES ----------
create table classes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,           -- ex: CM2 B
  academic_year text not null,  -- ex: 2026-2027
  monthly_fee numeric(12,2) not null default 0, -- frais mensuel par défaut de la classe
  created_at timestamptz default now()
);

-- ---------- ÉLÈVES ----------
create table students (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  full_name text not null,
  parent_phone text,            -- pour l'envoi des reçus WhatsApp
  monthly_fee numeric(12,2),    -- surcharge si différent de la classe
  status text not null default 'actif', -- actif | parti | exclu
  created_at timestamptz default now()
);

-- ---------- ÉCHÉANCES MENSUELLES ----------
-- Une ligne générée par élève par mois : ce qui est dû, ce qui a
-- été alloué (payé), et le solde. C'est la base du report.
create table student_dues (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  period date not null,          -- premier jour du mois concerné, ex: 2026-09-01
  amount_due numeric(12,2) not null,
  amount_allocated numeric(12,2) not null default 0, -- rempli par le moteur d'allocation
  created_at timestamptz default now(),
  unique (student_id, period)
);

-- ---------- PAIEMENTS ÉLÈVES ----------
-- Un paiement brut, non encore réparti. Le moteur d'allocation
-- (fonction ci-dessous) le répartit sur les échéances les plus
-- anciennes d'abord, puis reporte l'excédent sur les mois suivants.
create table student_payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  method text default 'especes', -- especes | wave | orange_money | virement
  received_by uuid references school_users(id),
  created_at timestamptz default now()
);

-- ---------- ALLOCATIONS ----------
-- Détaille comment un paiement a été réparti entre échéances.
-- Un paiement de 35 000 sur une dette de 25 000 génère deux lignes :
-- 25 000 sur le mois courant, 10 000 sur le mois suivant.
create table payment_allocations (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid references student_payments(id) on delete cascade,
  student_due_id uuid references student_dues(id) on delete cascade,
  amount_allocated numeric(12,2) not null,
  created_at timestamptz default now()
);

-- ---------- REÇUS ----------
create table receipts (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid references student_payments(id) on delete cascade,
  receipt_number text unique not null,
  pdf_url text,
  sent_whatsapp boolean default false,
  sent_whatsapp_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- PERSONNEL (PROFS / STAFF) ----------
create table staff (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  full_name text not null,
  role text not null default 'professeur', -- professeur | staff | direction
  monthly_salary numeric(12,2) not null default 0,
  phone text,
  status text not null default 'actif',
  created_at timestamptz default now()
);

-- ---------- PAIEMENTS PERSONNEL ----------
create table staff_payments (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  period date not null,          -- mois concerné
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  method text default 'especes',
  created_at timestamptz default now()
);

-- ---------- AUTRES DÉPENSES (facultatif, pour bilan complet) ----------
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null,
  category text default 'autre',
  spent_at timestamptz not null default now(),
  created_at timestamptz default now()
);

-- ============================================================
-- MOTEUR D'ALLOCATION : répartit un paiement élève sur les
-- échéances impayées les plus anciennes, puis crée/complète
-- l'échéance du mois suivant avec l'excédent.
-- ============================================================
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

-- Déclenche l'allocation automatiquement à chaque nouveau paiement
create or replace function trg_allocate_on_payment()
returns trigger as $$
begin
  perform allocate_student_payment(new.id);
  return new;
end;
$$ language plpgsql;

create trigger after_student_payment_insert
  after insert on student_payments
  for each row execute function trg_allocate_on_payment();

-- ============================================================
-- VUE : BILAN ENTRÉES / SORTIES PAR ÉCOLE ET PAR MOIS
-- ============================================================
create or replace view school_monthly_balance as
select
  s.school_id,
  date_trunc('month', s.paid_at)::date as period,
  sum(s.amount) as total_encaisse
from student_payments s
group by s.school_id, date_trunc('month', s.paid_at)

union all

select
  sp.school_id,
  sp.period,
  -sum(sp.amount) as montant
from staff_payments sp
group by sp.school_id, sp.period

union all

select
  e.school_id,
  date_trunc('month', e.spent_at)::date as period,
  -sum(e.amount) as montant
from expenses e
group by e.school_id, date_trunc('month', e.spent_at);

-- Note : agréger côté application (sum par school_id + period) pour
-- obtenir le solde net, ou créer une vue matérialisée si le volume grandit.

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Activer le RLS sur toutes les tables
alter table schools enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table student_dues enable row level security;
alter table student_payments enable row level security;
alter table payment_allocations enable row level security;
alter table receipts enable row level security;
alter table staff enable row level security;
alter table staff_payments enable row level security;
alter table expenses enable row level security;
alter table school_users enable row level security;

-- Création d'écoles (Autoriser l'insertion si l'utilisateur est authentifié)
create policy "allow_insert_school" on schools for insert with check (auth.role() = 'authenticated');
create policy "allow_read_school" on schools for select using (
  id in (select school_id from school_users where auth_user_id = auth.uid())
);
create policy "allow_update_school" on schools for update using (
  id in (select school_id from school_users where auth_user_id = auth.uid())
);

-- Création de school_users (Autoriser l'insertion par le propriétaire, et la lecture)
create policy "allow_insert_school_users" on school_users for insert with check (auth_user_id = auth.uid());
create policy "allow_read_school_users" on school_users for select using (auth_user_id = auth.uid());

-- Politique globale d'isolation par école pour le reste des tables
-- (Seuls les membres de school_users liés à cette école y ont accès)
create policy "school_isolation" on classes using (school_id in (select school_id from school_users where auth_user_id = auth.uid()));
create policy "school_isolation" on students using (school_id in (select school_id from school_users where auth_user_id = auth.uid()));
create policy "school_isolation" on student_payments using (school_id in (select school_id from school_users where auth_user_id = auth.uid()));
create policy "school_isolation" on staff using (school_id in (select school_id from school_users where auth_user_id = auth.uid()));
create policy "school_isolation" on staff_payments using (school_id in (select school_id from school_users where auth_user_id = auth.uid()));
create policy "school_isolation" on expenses using (school_id in (select school_id from school_users where auth_user_id = auth.uid()));

-- Pour les tables dépendantes d'autres entités (qui n'ont pas directement school_id)
create policy "school_isolation" on student_dues using (
  student_id in (select id from students where school_id in (select school_id from school_users where auth_user_id = auth.uid()))
);
create policy "school_isolation" on payment_allocations using (
  payment_id in (select id from student_payments where school_id in (select school_id from school_users where auth_user_id = auth.uid()))
);
create policy "school_isolation" on receipts using (
  payment_id in (select id from student_payments where school_id in (select school_id from school_users where auth_user_id = auth.uid()))
);

