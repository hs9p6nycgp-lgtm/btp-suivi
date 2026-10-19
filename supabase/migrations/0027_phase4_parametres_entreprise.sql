-- ==============================================================
-- BTP Suivi Pro - Parametres de l'entreprise (REP-04, REP-05)
--
-- Nom, coordonnees et logo de l'entreprise : ils apparaissent en tete des
-- rapports, des fiches de chantier et des proces-verbaux, et les
-- destinataires par defaut des rapports sont enregistres ici.
--
-- Une seule ligne par compte.
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

create table if not exists parametres_entreprise (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null unique references profils(id) on delete cascade,
  nom text not null default '',
  sigle text,
  adresse text,
  ville text,
  telephone text,
  email text,
  nif text,
  rccm text,
  logo text,
  destinataires text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table parametres_entreprise is
  'Coordonnees, logo et destinataires par defaut des rapports (REP-04, REP-05)';

-- Acces : chaque compte gere ses propres parametres
alter table parametres_entreprise enable row level security;

drop policy if exists "parametres_entreprise - acces" on parametres_entreprise;
create policy "parametres_entreprise - acces"
  on parametres_entreprise for all to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());
