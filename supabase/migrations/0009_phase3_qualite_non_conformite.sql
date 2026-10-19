-- ==============================================================
-- BTP Suivi Pro - Phase 3.3 : Qualité et Non-conformité
-- A executer dans Supabase apres 0008_phase3_planning_couts.sql
-- ==============================================================

-- Dimensions des chantiers pour la visualisation 3D
alter table chantiers
  add column if not exists longueur numeric(10,2),
  add column if not exists largeur numeric(10,2),
  add column if not exists hauteur numeric(10,2);

-- Plans de contrôle par type d'ouvrage (QUA-01)
create table if not exists plans_controle (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  type_ouvrage text not null,
  paramètre text not null,
  valeur_exigee numeric(12,2) not null,
  tolerance_pos numeric(12,2) not null default 0,
  tolerance_neg numeric(12,2) not null default 0,
  unite text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saisie des essais et contrôles (QUA-02)
create table if not exists essais_qualite (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  plan_controle_id uuid references plans_controle(id) on delete set null,
  section_id uuid references sections_chantier(id) on delete set null,
  type_controle text not null,
  valeur_mesuree numeric(12,2) not null,
  valeur_exigee numeric(12,2) not null,
  tolerance_pos numeric(12,2) not null default 0,
  tolerance_neg numeric(12,2) not null default 0,
  unite text not null,
  conforme boolean not null default true,
  date_controle date not null default current_date,
  responsable text,
  observations text,
  created_at timestamptz not null default now()
);

-- Fiches de non-conformité (QUA-03, RG-04)
create table if not exists non_conformites (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  essai_id uuid references essais_qualite(id) on delete set null,
  description text not null,
  gravite text not null default 'mineure'
    check (gravite in ('mineure','majeure','critique')),
  statut text not null default 'ouverte'
    check (statut in ('ouverte','en_cours','cloturee','rejetee')),
  responsable text,
  action_corrective text,
  echeance date,
  date_cloture date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Photos liées aux non-conformités
create table if not exists photos_non_conformite (
  id uuid primary key default gen_random_uuid(),
  non_conformite_id uuid not null references non_conformites(id) on delete cascade,
  chemin text not null,
  legende text,
  created_at timestamptz not null default now()
);

-- Suivi des éprouvettes béton (QUA-04)
create table if not exists epreuves_beton (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  section_id uuid references sections_chantier(id) on delete set null,
  date_coulage date not null,
  age_jours integer not null check (age_jours in (7, 14, 28)),
  resistance_mesuree numeric(12,2),
  resistance_exigee numeric(12,2) not null,
  conforme boolean not null default true,
  created_at timestamptz not null default now(),
  unique (section_id, age_jours)
);

-- Securite RLS (V3 : isolation multitenant par chantier)
alter table plans_controle enable row level security;
alter table essais_qualite enable row level security;
alter table non_conformites enable row level security;
alter table photos_non_conformite enable row level security;
alter table epreuves_beton enable row level security;

create policy "plans_controle - acces"
  on plans_controle for all to authenticated
  using (user_can_access_chantier(chantier_id));
create policy "essais_qualite - acces"
  on essais_qualite for all to authenticated
  using (user_can_access_chantier(chantier_id));
create policy "non_conformites - acces"
  on non_conformites for all to authenticated
  using (user_can_access_chantier(chantier_id));
create policy "photos_non_conformite - acces"
  on photos_non_conformite for all to authenticated
  using (exists (select 1 from non_conformites nc where nc.id = non_conformite_id and user_can_access_chantier(nc.chantier_id)));
create policy "epreuves_beton - acces"
  on epreuves_beton for all to authenticated
  using (user_can_access_chantier(chantier_id));