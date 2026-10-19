-- ==============================================================
-- BTP Suivi Pro - Phase 2.1 : Journal de chantier
-- A executer dans Supabase apres 0004_phase1_metre_bpu.sql
-- ==============================================================

create table if not exists journaux (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  date_journal date not null default current_date,
  meteo text,
  observations text,
  statut text not null default 'brouillon'
    check (statut in ('brouillon','valide')),
  created_by uuid references profils(id) on delete set null,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create table if not exists journal_effectifs (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  corps_metier text not null,
  nombre integer not null default 0
);

create table if not exists journal_engins (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  type_engin text not null,
  immatriculation text,
  heures_marche numeric(6,2) not null default 0,
  quantite_produite numeric(12,2)
);

create table if not exists incidents_journal (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  type text not null
    check (type in ('panne','intemperie','accident','arret','autre')),
  description text,
  duree_heures numeric(6,2) not null default 0
);

create table if not exists photos_journal (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  chemin text not null,
  legende text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now()
);

-- Lien journal / section pour les quantites realisees
alter table quantites_realisees
  add column if not exists journal_id uuid references journaux(id) on delete set null,
  add column if not exists section_id uuid references sections_chantier(id) on delete set null;

-- Securite RLS (V3 : isolation multitenant par chantier)
alter table journaux enable row level security;
alter table journal_effectifs enable row level security;
alter table journal_engins enable row level security;
alter table incidents_journal enable row level security;
alter table photos_journal enable row level security;

create policy "journaux - acces"
  on journaux for all to authenticated
  using (user_can_access_chantier(chantier_id));
create policy "journal_effectifs - acces"
  on journal_effectifs for all to authenticated
  using (user_can_access_journal(journal_id));
create policy "journal_engins - acces"
  on journal_engins for all to authenticated
  using (user_can_access_journal(journal_id));
create policy "incidents_journal - acces"
  on incidents_journal for all to authenticated
  using (user_can_access_journal(journal_id));
create policy "photos_journal - acces"
  on photos_journal for all to authenticated
  using (user_can_access_journal(journal_id));