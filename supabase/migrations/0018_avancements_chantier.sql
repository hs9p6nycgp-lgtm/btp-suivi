-- ==============================================================
-- BTP Suivi Pro - Phase 2 : Points d'avancement datés (suivi CHA-04)
-- A executer dans Supabase : SQL Editor > New query > Run
--
-- Idempotente : peut etre relancee sans risque (uniquement des ajouts).
--
-- Contenu :
--   1. Table avancements_chantier : un point d'avancement daté
--      (chantier, date, pourcentage, commentaire), relié en option
--      à une section / un bâtiment du découpage.
--   2. Index de lecture + securite RLS (isolation par chantier).
-- ==============================================================

-- 1) Points d'avancement datés (CHA-04)
create table if not exists avancements_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  section_id uuid references sections_chantier(id) on delete set null,
  date_point date not null,
  avancement_pct numeric(5,2) not null default 0
    check (avancement_pct >= 0 and avancement_pct <= 100),
  commentaire text,
  created_by uuid references profils(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2) Index de lecture (par chantier et par date, et par section)
create index if not exists idx_avancements_chantier_chantier
  on avancements_chantier(chantier_id, date_point);
create index if not exists idx_avancements_chantier_section
  on avancements_chantier(section_id);

-- 3) Securite RLS (isolation multitenant par proprietaire + membres)
alter table avancements_chantier enable row level security;

drop policy if exists "avancements_chantier - acces" on avancements_chantier;
create policy "avancements_chantier - acces"
  on avancements_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));

-- Verification rapide (facultatif) :
-- select count(*) as points from avancements_chantier;
