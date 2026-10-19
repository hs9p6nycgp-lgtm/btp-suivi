-- ==============================================================
-- BTP Suivi Pro - V0 (demo) - schema initial
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

-- Chantiers
create table if not exists chantiers (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text not null check (type in ('route', 'batiment')),
  maitre_ouvrage text,
  montant_marche bigint not null default 0,
  date_debut date,
  date_fin_prevue date,
  seuil_ecart_pct numeric(5,2) not null default 10.00,
  statut text not null default 'en_preparation'
    check (statut in ('en_preparation','en_cours','suspendu','receptionne_provisoirement','cloture')),
  created_at timestamptz not null default now()
);

-- Postes du DQE
create table if not exists postes_dqe (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  code text,
  designation text not null,
  unite text not null,
  quantite_marche numeric(12,2) not null default 0,
  prix_unitaire bigint not null default 0,
  created_at timestamptz not null default now()
);

-- Quantites realisees (saisie terrain)
create table if not exists quantites_realisees (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  poste_dqe_id uuid not null references postes_dqe(id) on delete cascade,
  quantite numeric(12,2) not null,
  date_saisie date not null default current_date,
  created_at timestamptz not null default now()
);

-- Alertes
create table if not exists alertes (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  poste_dqe_id uuid references postes_dqe(id) on delete set null,
  type text not null default 'ecart_quantite',
  valeur numeric(12,2) not null,
  seuil numeric(12,2) not null,
  statut text not null default 'ouverte' check (statut in ('ouverte','acquittee','cloturee')),
  date_alerte timestamptz not null default now()
);

-- Securite (V0 : base - avant application de l'isolation multitenant V3)
-- Note : ces policies sont remplacées par la migration 0007 Phase 3.
-- Elles sont conservees ici pour reference historique mais ne doivent pas
-- etre actives dans le projet Supabase si la migration 0007 a ete appliquee.

-- Activation du RLS (les policies reelles sont definies dans la migration 0007)
alter table chantiers enable row level security;
alter table postes_dqe enable row level security;
alter table quantites_realisees enable row level security;
alter table alertes enable row level security;