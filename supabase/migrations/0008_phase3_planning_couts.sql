-- ==============================================================
-- BTP Suivi Pro - Phase 3.1 : Planning et Coûts
-- A executer dans Supabase apres 0007_phase3_multitenant_isolation.sql
-- ==============================================================

-- Tâches du planning (PLA-01)
create table if not exists taches_planning (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  description text,
  duree_jours integer not null default 1,
  date_prevue_debut date,
  date_prevue_fin date,
  date_reelle_debut date,
  date_reelle_fin date,
  avancement_pct numeric(5,2) not null default 0.00 check (avancement_pct between 0 and 100),
  est_jalon boolean not null default false,
  statut text not null default 'a_faire'
    check (statut in ('a_faire','en_cours','termine','retarde','annule')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dépendances entre tâches (PERT) (PLA-01)
create table if not exists dependances_planning (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  tache_predecesseur_id uuid not null references taches_planning(id) on delete cascade,
  tache_successeur_id uuid not null references taches_planning(id) on delete cascade,
  type_dependance text not null default 'fin_debut'
    check (type_dependance in ('fin_debut','debut_debut','fin_fin','debut_fin')),
  decalage_jours integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tache_predecesseur_id, tache_successeur_id)
);

-- Dépenses réelles (COU-02)
create table if not exists depenses_reelles (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  categorie text not null
    check (categorie in ('materiaux','main_doeuvre','engins','sous_traitance','carburant','autre')),
  designation text not null,
  quantite numeric(12,2) not null default 0,
  unite text,
  prix_unitaire bigint not null default 0,
  montant_total bigint not null default 0,
  date_depense date not null default current_date,
  reference text, -- n° de bon, facture, etc.
  notes text,
  created_at timestamptz not null default now()
);

-- Securite RLS
alter table taches_planning enable row level security;
alter table dependances_planning enable row level security;
alter table depenses_reelles enable row level security;

create policy "taches_planning - acces"
  on taches_planning for all to authenticated
  using (true) with check (true);
create policy "dependances_planning - acces"
  on dependances_planning for all to authenticated
  using (true) with check (true);
create policy "depenses_reelles - acces"
  on depenses_reelles for all to authenticated
  using (true) with check (true);