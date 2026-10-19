-- ==============================================================
-- BTP Suivi Pro - Phase 2 : Chantiers complets (creation + suivi)
-- A executer dans Supabase : SQL Editor > New query > Run
--
-- Idempotente : peut etre relancee sans risque (uniquement des ajouts).
--
-- Contenu :
--   1. Identite du chantier enrichie (CHA-01) : ville, maitre d'oeuvre,
--      entreprise, numero de marche.
--   2. Avancement saisi par section / batiment (suivi CHA-02).
--   3. Creation de secours des tables intervenants / sections / documents
--      (si la migration 0003 n'a pas ete appliquee entierement).
--   4. Index + securite RLS + bucket de documents (idempotents).
-- ==============================================================

-- 1) Identite du chantier enrichie (CHA-01)
alter table chantiers
  add column if not exists ville text,
  add column if not exists maitre_oeuvre text,
  add column if not exists entreprise text,
  add column if not exists numero_marche text;

-- 2) Avancement saisi par section / batiment (suivi CHA-02)
alter table sections_chantier
  add column if not exists avancement_pct numeric(5,2) not null default 0;

-- 3) Creation de secours des tables (identiques a 0003 + 0010)
create table if not exists intervenants_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  fonction text,
  telephone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists sections_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  pk_debut numeric(10,3),
  pk_fin numeric(10,3),
  niveau text,
  lot text,
  type_ouvrage text,
  created_at timestamptz not null default now()
);

alter table sections_chantier
  add column if not exists longueur numeric(10,2),
  add column if not exists largeur numeric(10,2),
  add column if not exists hauteur numeric(10,2),
  add column if not exists couleur text;

create table if not exists documents_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  type text not null default 'autre'
    check (type in ('plan','marche','ordre_service','pv','autre')),
  chemin text not null,
  uploaded_by uuid references profils(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4) Index de lecture par chantier
create index if not exists idx_intervenants_chantier_chantier on intervenants_chantier(chantier_id);
create index if not exists idx_sections_chantier_chantier on sections_chantier(chantier_id);
create index if not exists idx_documents_chantier_chantier on documents_chantier(chantier_id);

-- 5) Securite RLS (isolation multitenant par proprietaire + membres)
alter table intervenants_chantier enable row level security;
alter table sections_chantier enable row level security;
alter table documents_chantier enable row level security;

drop policy if exists "intervenants_chantier - acces" on intervenants_chantier;
drop policy if exists "intervenants_chantier - gestion" on intervenants_chantier;
drop policy if exists "intervenants_chantier - modification" on intervenants_chantier;
drop policy if exists "intervenants_chantier - suppression" on intervenants_chantier;
create policy "intervenants_chantier - acces"
  on intervenants_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));

drop policy if exists "sections_chantier - acces" on sections_chantier;
create policy "sections_chantier - acces"
  on sections_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));

drop policy if exists "documents_chantier - acces" on documents_chantier;
create policy "documents_chantier - acces"
  on documents_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));

-- 6) Bucket de stockage des documents + acces authentifie
insert into storage.buckets (id, name, public)
values ('chantiers-documents', 'chantiers-documents', false)
on conflict (id) do nothing;

drop policy if exists "acces authentifie - storage chantiers-documents" on storage.objects;
create policy "acces authentifie - storage chantiers-documents"
  on storage.objects for all to authenticated
  using (bucket_id = 'chantiers-documents')
  with check (bucket_id = 'chantiers-documents');
