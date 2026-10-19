-- ==============================================================
-- BTP Suivi Pro - Documents administratifs des fournisseurs (FOU-07)
--
-- Attestation fiscale, assurance, agrement : chaque document a une date
-- d'echeance, une alerte est levee 30 jours avant.
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

create table if not exists documents_fournisseur (
  id uuid primary key default gen_random_uuid(),
  fournisseur_id uuid not null references fournisseurs(id) on delete cascade,
  type text not null default 'autre'
    check (type in ('attestation_fiscale','assurance','agrement','autre')),
  libelle text not null,
  date_echeance date,
  chemin text,
  created_at timestamptz not null default now()
);

comment on table documents_fournisseur is
  'Documents administratifs du fournisseur avec date d''echeance (FOU-07)';

create index if not exists idx_documents_fournisseur_fournisseur
  on documents_fournisseur(fournisseur_id, date_echeance);

-- Acces : chaque compte gere ses propres fournisseurs
alter table documents_fournisseur enable row level security;

drop policy if exists "documents_fournisseur - acces" on documents_fournisseur;
create policy "documents_fournisseur - acces"
  on documents_fournisseur for all to authenticated
  using (exists (
    select 1 from fournisseurs f
    where f.id = documents_fournisseur.fournisseur_id
      and f.proprietaire_id = auth.uid()
  ))
  with check (exists (
    select 1 from fournisseurs f
    where f.id = documents_fournisseur.fournisseur_id
      and f.proprietaire_id = auth.uid()
  ));
