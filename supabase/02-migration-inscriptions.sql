-- À exécuter après wallu-school-schema.sql
-- Ajoute la gestion des frais d'inscription (distincts de la mensualité)

alter table classes add column if not exists inscription_fee numeric(12,2) not null default 0;

create table if not exists student_inscription_payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  method text default 'especes',
  created_at timestamptz default now()
);

-- Vue pratique : combien chaque élève a payé sur son inscription
create or replace view student_inscription_status as
select
  s.id as student_id,
  s.full_name,
  c.inscription_fee,
  coalesce(sum(sip.amount), 0) as amount_paid,
  c.inscription_fee - coalesce(sum(sip.amount), 0) as remaining
from students s
join classes c on c.id = s.class_id
left join student_inscription_payments sip on sip.student_id = s.id
group by s.id, s.full_name, c.inscription_fee;
