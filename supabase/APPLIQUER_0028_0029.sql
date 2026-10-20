-- ============================================================================
-- BTP Suivi Pro — APLICATION DES MIGRATIONS 0028 (versions des journaux)
--                                   ET 0029 (situations de paiement)
-- ----------------------------------------------------------------------------
-- A coller en UNE FOIS dans Supabase : Tableau de bord > SQL Editor > New query
--
-- Sans danger : ne supprime AUCUNE donnée, ne modifie AUCUN contenu existant.
-- Les deux migrations sont idempotentes : elles peuvent etre relancees sans
-- risque (create table if not exists, create index if not exists, policies
-- recreees apres suppression).
--
-- Contenu :
--   1. 0028_journal_versions.sql
--      -> table journal_versions : a chaque reouverture d'un journal valide,
--         une version tracee est conservee (RG-02 : un journal valide n'est
--         plus modifiable, toute correction cree une nouvelle version).
--   2. 0029_phase4_situations_paiement.sql
--      -> table situations_paiement : les decomptes (cumul valorise, retenue
--         de garantie, acomptes, net a payer) et leur statut.
--
-- Les deux tables restent isolees par chantier (RLS), comme le reste.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) MIGRATION 0028 — VERSIONS TRACEES DES JOURNAUX
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 2) MIGRATION 0029 — SITUATIONS DE PAIEMENT (DECOMPTES)
-- ---------------------------------------------------------------------------
create table if not exists situations_paiement (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  numero text not null,
  periode_debut date not null,
  periode_fin date not null,
  cumul_avant numeric(14,2) not null default 0,
  cumul_periode numeric(14,2) not null default 0,
  decompte_anterieur numeric(14,2) not null default 0,
  acomptes numeric(14,2) not null default 0,
  taux_retenue numeric(5,2) not null default 10,
  montant_brut numeric(14,2) not null default 0,
  retenue numeric(14,2) not null default 0,
  net_a_payer numeric(14,2) not null default 0,
  statut text not null default 'brouillon'
    check (statut in ('brouillon','soumise','acceptee','paye','rejetee')),
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chantier_id, numero)
);

comment on table situations_paiement is
  'Situations de paiement (decomptes) : cumul valorise, retenue de garantie, net a payer';

create index if not exists idx_situations_paiement_chantier
  on situations_paiement(chantier_id, periode_fin desc);

alter table situations_paiement enable row level security;

drop policy if exists "situations_paiement - acces" on situations_paiement;
create policy "situations_paiement - acces"
  on situations_paiement for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));


-- ---------------------------------------------------------------------------
-- 3) VERIFICATION (lisez le resultat affiche en bas)
--    Attendu : 2 tables, 0 etat du RLS desactive.
-- ---------------------------------------------------------------------------
select
  (select count(*) from information_schema.tables
     where table_schema = 'public'
       and table_name in ('journal_versions', 'situations_paiement'))
    as "tables creees (attendu 2)",
  (select count(*) from pg_tables
     where schemaname = 'public'
       and tablename in ('journal_versions', 'situations_paiement')
       and rowsecurity = false)
    as "RLS desactive (attendu 0)";
