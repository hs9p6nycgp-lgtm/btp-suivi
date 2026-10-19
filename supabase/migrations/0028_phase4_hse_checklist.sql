-- ==============================================================
-- BTP Suivi Pro - Check-list HSE quotidienne (HSE-02)
--
-- Quatre points verifies chaque matin : port d'EPI, echauffement
-- muscular, signalisation du chantier, extincteur verifie.
-- Un etat par jour et par chantier.
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

create table if not exists hse_checklists (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  date date not null default current_date,
  epi boolean not null default false,
  echauffement boolean not null default false,
  signalisation boolean not null default false,
  extincteur boolean not null default false,
  commentaire text,
  saisi_par uuid references profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chantier_id, date)
);

comment on table hse_checklists is
  'Check-list HSE quotidienne : EPI, echauffement, signalisation, extincteur (HSE-02)';

create index if not exists idx_hse_checklists_chantier
  on hse_checklists(chantier_id, date desc);

-- Securite RLS : acces comme les autres tables rattachees a un chantier
alter table hse_checklists enable row level security;

drop policy if exists "hse_checklists - acces" on hse_checklists;
create policy "hse_checklists - acces"
  on hse_checklists for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
