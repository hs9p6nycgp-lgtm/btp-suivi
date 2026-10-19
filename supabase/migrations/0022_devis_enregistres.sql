-- ==============================================================
-- BTP Suivi Pro - Devis enregistres et exportables
-- (exigences MET-02 / MET-03 — audit metier du 19/10/2026, T-LOG-37)
--
-- Constat : le calculateur de devis affiche un total exact
-- (230 120 800 FCFA verifie) mais aucun bouton « Enregistrer / Exporter /
-- Imprimer » : le devis disparait des la fermeture de la page.
--
-- Cette migration cree :
--   devis        : l'en-tete (client, numero, date, chantier, objet, total)
--   devis_lignes : les lignes (designation, unite, quantite, prix unitaire, total)
--
-- Montants en FCFA : entiers, sans decimale (regle du projet).
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

create table if not exists devis (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references profils(id) on delete cascade default auth.uid(),
  chantier_id uuid references chantiers(id) on delete set null,
  numero text not null,
  client text not null,
  objet text,
  date_devis date not null default current_date,
  notes text,
  total bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists devis_lignes (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid not null references devis(id) on delete cascade,
  ordre integer not null default 0,
  designation text not null,
  unite text not null default '',
  quantite numeric(12,2) not null default 0,
  prix_unitaire numeric(12,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists devis_proprietaire_idx on devis (proprietaire_id, date_devis desc);
create index if not exists devis_lignes_devis_idx on devis_lignes (devis_id, ordre);

-- Securite RLS : un devis et ses lignes appartiennent a leur auteur seul.
alter table devis enable row level security;
alter table devis_lignes enable row level security;

drop policy if exists "devis - acces" on devis;
create policy "devis - acces"
  on devis for all to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

drop policy if exists "devis_lignes - acces" on devis_lignes;
create policy "devis_lignes - acces"
  on devis_lignes for all to authenticated
  using (exists (select 1 from devis d where d.id = devis_id and d.proprietaire_id = auth.uid()))
  with check (exists (select 1 from devis d where d.id = devis_id and d.proprietaire_id = auth.uid()));

-- Verification rapide (facultatif) :
-- select count(*) from devis;
-- select policyname, cmd from pg_policies where tablename in ('devis','devis_lignes');
