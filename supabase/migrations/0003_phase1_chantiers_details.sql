-- ==============================================================
-- BTP Suivi Pro - Phase 1.2 : Chantiers detailles
-- A executer dans Supabase apres 0002_phase1_auth_roles.sql
-- ==============================================================

-- Informations de localisation du chantier
alter table chantiers
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6);

-- Intervenants d'un chantier
create table if not exists intervenants_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  fonction text,
  telephone text,
  email text,
  created_at timestamptz not null default now()
);

-- Decoupage : sections et PK (route) ou niveaux et lots (batiment)
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

-- Documents joints au chantier
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

-- Bucket de stockage (tentative automatique ; sinon le creer dans Storage)
insert into storage.buckets (id, name, public)
values ('chantiers-documents', 'chantiers-documents', false)
on conflict (id) do nothing;

-- Securite RLS (V1 : acces authentifie total, comme en V0)
alter table intervenants_chantier enable row level security;
alter table sections_chantier enable row level security;
alter table documents_chantier enable row level security;

create policy "acces authentifie - intervenants_chantier"
  on intervenants_chantier for all to authenticated using (true) with check (true);
create policy "acces authentifie - sections_chantier"
  on sections_chantier for all to authenticated using (true) with check (true);
create policy "acces authentifie - documents_chantier"
  on documents_chantier for all to authenticated using (true) with check (true);

-- Acces authentifie au bucket de documents
create policy "acces authentifie - storage chantiers-documents"
  on storage.objects for all to authenticated
  using (bucket_id = 'chantiers-documents')
  with check (bucket_id = 'chantiers-documents');