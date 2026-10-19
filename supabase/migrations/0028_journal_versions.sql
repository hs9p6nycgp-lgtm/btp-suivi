-- ==============================================================
-- BTP Suivi Pro - Versions tracées des journaux de chantier
-- (cahier des charges, RG-02 : « un journal validé par le conducteur
-- de travaux n'est plus modifiable ; toute correction crée une nouvelle
-- version tracée »).
--
-- A chaque réouverture d'un journal validé, son contenu est copié ici :
-- on garde l'historique de ce qui a été validé, puis de corrigé.
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

create table if not exists journal_versions (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  version integer not null default 1,
  motif text,
  meteo text,
  observations text,
  effectif jsonb not null default '[]'::jsonb,
  engins jsonb not null default '[]'::jsonb,
  incidents jsonb not null default '[]'::jsonb,
  quantites jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_versions_journal
  on journal_versions (journal_id, version desc);

alter table journal_versions enable row level security;

drop policy if exists "journal_versions - acces" on journal_versions;
create policy "journal_versions - acces"
  on journal_versions for all to authenticated
  using (exists (
    select 1 from journaux j
    where j.id = journal_id and user_can_access_chantier(j.chantier_id)
  ));

-- Verification rapide (facultatif) :
-- select journal_id, version, motif, created_at from journal_versions order by created_at desc;
