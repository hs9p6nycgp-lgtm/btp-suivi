-- ==============================================================
-- BTP Suivi Pro - Module Fournisseurs (exigence FOU-01)
-- A executer dans Supabase apres 0010_phase1_3d_elements.sql
-- ==============================================================

create table if not exists fournisseurs (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid references profils(id) on delete set null default auth.uid(),
  raison_sociale text not null,
  type text not null default 'materiaux',
  adresse text,
  ville text,
  contact_nom text,
  contact_tel text,
  contact_email text,
  nif text,
  rccm text,
  created_at timestamptz not null default now()
);

alter table fournisseurs enable row level security;

drop policy if exists "fournisseurs - acces" on fournisseurs;
create policy "fournisseurs - acces"
  on fournisseurs for all to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

-- Index pour la recherche
create index if not exists idx_fournisseurs_proprietaire on fournisseurs(proprietaire_id);
create index if not exists idx_fournisseurs_ville on fournisseurs(ville);
create index if not exists idx_fournisseurs_type on fournisseurs(type);
