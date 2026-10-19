-- ==============================================================
-- BTP Suivi Pro - Hygiene, securite, environnement (HSE-01, HSE-03)
--
-- Declaration des incidents et accidents de chantier, avec photos, et
-- indicateurs de securite (jours sans accident, taux de frequence).
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

-- 1) Declarations HSE
create table if not exists hse_incidents (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  type text not null default 'incident'
    check (type in ('accident_travail','accident_route','incident','presqu_accident')),
  date_occurrence date not null default current_date,
  lieu text,
  description text not null,
  personnes_concernees integer not null default 0,
  accident_avec_arret boolean not null default false,
  duree_arret_heures numeric(6,2),
  action_immediate text,
  responsable text,
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table hse_incidents is
  'Declarations HSE : accidents du travail, accidents de la route, incidents et presqu''accidents (HSE-01)';

-- 2) Index de lecture par chantier
create index if not exists idx_hse_incidents_chantier
  on hse_incidents(chantier_id, date_occurrence desc);

-- 3) Securite RLS : acces comme les autres tables rattachees a un chantier
alter table hse_incidents enable row level security;

drop policy if exists "hse_incidents - acces" on hse_incidents;
create policy "hse_incidents - acces"
  on hse_incidents for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
