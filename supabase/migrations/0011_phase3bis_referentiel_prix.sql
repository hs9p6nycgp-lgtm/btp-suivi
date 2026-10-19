-- ==============================================================
-- BTP Suivi Pro - Phase 3bis : Referentiel de prix (REF-01 a REF-04)
-- A executer dans Supabase apres 0010_phase1_3d_elements.sql
-- ==============================================================

-- Referentiel centralise des materiaux et materiels (REF-01)
create table if not exists referentiel_prix (
  id uuid primary key default gen_random_uuid(),
  code text,
  designation text not null,
  categorie text,
  unite text not null,
  prix_unitaire bigint not null default 0,
  source text,
  date_source date,
  date_validite date,
  statut text not null default 'a_verifier'
    check (statut in ('valide','a_verifier')),
  zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Historique des prix (REF-03)
create table if not exists historique_prix (
  id uuid primary key default gen_random_uuid(),
  referentiel_prix_id uuid not null references referentiel_prix(id) on delete cascade,
  ancien_prix bigint not null,
  nouveau_prix bigint not null,
  date_changement timestamptz not null default now(),
  auteur text,
  motif text,
  created_at timestamptz not null default now()
);

-- Securite RLS (V3 : données de référence partagees avec controle d'acces)
alter table referentiel_prix enable row level security;
alter table historique_prix enable row level security;

create policy "referentiel_prix - lecture"
  on referentiel_prix for select to authenticated using (true);
create policy "historique_prix - lecture"
  on historique_prix for select to authenticated using (true);