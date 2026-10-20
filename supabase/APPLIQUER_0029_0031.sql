-- ============================================================================
-- BTP Suivi Pro — APLICATION DES MIGRATIONS 0029, 0030 ET 0031
-- ----------------------------------------------------------------------------
-- A coller en UNE FOIS dans Supabase : Tableau de bord > SQL Editor > New query
--
-- Sans danger : ne supprime AUCUNE donnee et ne modifie AUCUN contenu existant.
-- Les trois migrations sont idempotentes (create table if not exists,
-- add column if not exists, policies recreees apres suppression) : elles
-- peuvent etre relancees sans risque.
--
--   0029  situations_paiement   -> les decomptes (cumul, retenue, net a payer)
--   0030  journal_versions       -> l'historique des journaux valides (RG-02)
--   0031  devis.remise_pct / devis.tva_pct / devis.conditions_paiement
--
-- Les tables et colonnes restent isolees par chantier (RLS), comme le reste.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- MIGRATION 0029 — SITUATIONS DE PAIEMENT (DECOMPTES)
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
-- MIGRATION 0030 — VERSIONS TRACEES DES JOURNAUX
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
-- MIGRATION 0031 — DEVIS : REMISE, TVA ET CONDITIONS DE PAIEMENT
-- ---------------------------------------------------------------------------
alter table devis
  add column if not exists remise_pct numeric(5,2) not null default 0,
  add column if not exists tva_pct numeric(5,2) not null default 0,
  add column if not exists conditions_paiement text;
comment on column devis.remise_pct is 'Remise commerciale en pourcentage du total brut (0 = aucune)';
comment on column devis.tva_pct is 'Taux de TVA en pourcentage (0 = prix hors taxes)';
comment on column devis.conditions_paiement is 'Conditions de paiement (ex. : 30 % a la commande, solde a la reception)';

-- ---------------------------------------------------------------------------
-- VERIFICATION (lisez le resultat affiche en bas)
--    Attendu : 3 tables creees, 0 colonne manquante, 0 table sans RLS.
-- ---------------------------------------------------------------------------
select
  (select count(*) from information_schema.tables
     where table_schema = 'public'
       and table_name in ('situations_paiement', 'journal_versions'))
    as "tables creees (attendu 2)",
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'devis'
       and column_name in ('remise_pct', 'tva_pct', 'conditions_paiement'))
    as "colonnes devis ajoutees (attendu 3)",
  (select count(*) from pg_tables
     where schemaname = 'public'
       and tablename in ('situations_paiement', 'journal_versions')
       and rowsecurity = false)
    as "RLS desactive (attendu 0)";
