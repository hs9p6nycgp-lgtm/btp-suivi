-- ==============================================================
-- BTP Suivi Pro - Module Fournisseurs (FOU-02, FOU-04, FOU-06)
-- A executer dans Supabase apres 0011_phase4_fournisseurs.sql
-- ==============================================================

-- FOU-02 : conditions commerciales sur la fiche fournisseur
alter table fournisseurs
  add column if not exists delai_paiement_jours integer,
  add column if not exists conditions_livraison text,
  add column if not exists validite_prix_jours integer,
  add column if not exists franco_port boolean default false;

-- FOU-04 : devis fournisseurs (comparaison de plusieurs devis pour un poste)
create table if not exists devis_fournisseurs (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid references chantiers(id) on delete cascade,
  fournisseur_id uuid references fournisseurs(id) on delete cascade,
  poste text not null,
  prix_unitaire bigint not null default 0,
  delai_livraison_jours integer,
  conditions text,
  date_devis date not null default current_date,
  choisi boolean not null default false,
  motif_choix text,
  created_at timestamptz not null default now()
);

-- FOU-06 : evaluation des fournisseurs
create table if not exists evaluations_fournisseurs (
  id uuid primary key default gen_random_uuid(),
  fournisseur_id uuid not null references fournisseurs(id) on delete cascade,
  respect_delais integer check (respect_delais between 1 and 5),
  conformite_livraisons integer check (conformite_livraisons between 1 and 5),
  ecarts_prix integer check (ecarts_prix between 1 and 5),
  note_globale numeric(3,2),
  commentaire text,
  date_evaluation date not null default current_date,
  created_at timestamptz not null default now()
);

-- Securite RLS
alter table devis_fournisseurs enable row level security;
alter table evaluations_fournisseurs enable row level security;

create policy "devis_fournisseurs - acces"
  on devis_fournisseurs for all to authenticated using (true) with check (true);
create policy "evaluations_fournisseurs - acces"
  on evaluations_fournisseurs for all to authenticated using (true) with check (true);