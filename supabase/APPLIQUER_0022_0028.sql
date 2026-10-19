-- ==============================================================
-- BTP Suivi Pro - Migrations 0022 a 0028 (un seul fichier)
--
-- A coller dans le SQL Editor de Supabase
-- (SQL Editor > New query > Run).
--
-- Contenu :
--   0022  devis enregistres et exportables (MET-02, MET-03)
--   0023  planning : equipe et engins affectes aux taches
--   0024  conditions tarifaires : unite de l'offre + acces sans chantier
--   0025  declarations HSE (accidents, incidents, presqu'accidents)
--   0026  documents administratifs des fournisseurs (FOU-07)
--   0026  planning : poste DQE suivi par une tache (PLA-03)
--   0027  parametres de l'entreprise (logo, coordonnees, destinataires)
--   0028  check-list HSE quotidienne (EPI, echauffement, signalisation,
--         extincteur)
--
-- Tout est idempotent : le fichier peut etre relance sans risque
-- (c'est ce que l'on fait pour etre sur que rien n'a ete oublie).
--
-- Verification finale (a lancer apres le Run) :
--   select count(*) as "tables manquantes" from (
--     select 'devis' where not exists (select 1 from information_schema.tables where table_name = 'devis')
--     union all select 'devis_lignes' where not exists (select 1 from information_schema.tables where table_name = 'devis_lignes')
--     union all select 'hse_incidents' where not exists (select 1 from information_schema.tables where table_name = 'hse_incidents')
--     union all select 'hse_checklists' where not exists (select 1 from information_schema.tables where table_name = 'hse_checklists')
--     union all select 'documents_fournisseur' where not exists (select 1 from information_schema.tables where table_name = 'documents_fournisseur')
--     union all select 'parametres_entreprise' where not exists (select 1 from information_schema.tables where table_name = 'parametres_entreprise')
--   ) manquantes;
--   -> la colonne « manquantes » doit valoir 0
--
-- Puis, dans le projet : node scripts/audit-base.mjs
--   -> « Base a jour : toutes les migrations sont appliquees »
-- ==============================================================


-- ==============================================================
-- 0022 - Devis enregistres et exportables (MET-02, MET-03)
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


-- ==============================================================
-- 0023 - Planning : equipe et engins affectes aux taches
-- ==============================================================

alter table taches_planning
  add column if not exists equipe text,
  add column if not exists engins text;

comment on column taches_planning.equipe is
  'Equipe affectee a la tache (ex. : Terrassiers)';
comment on column taches_planning.engins is
  'Engins et materiels utilises sur la tache (ex. : 1 pelleteuse, 2 camions)';


-- ==============================================================
-- 0024 - Conditions tarifaires : unite de l'offre + acces
-- ==============================================================

alter table devis_fournisseurs
  add column if not exists unite text;

comment on column devis_fournisseurs.unite is
  'Unite de vente de l''offre (ex : sac, m3, tonne) — comparaison des offres';

drop policy if exists "devis_fournisseurs - acces" on devis_fournisseurs;

create policy "devis_fournisseurs - acces"
  on devis_fournisseurs for all to authenticated
  using (
    (chantier_id is not null and user_can_access_chantier(chantier_id))
    or exists (
      select 1 from fournisseurs f
      where f.id = devis_fournisseurs.fournisseur_id
        and f.proprietaire_id = auth.uid()
    )
  )
  with check (
    (chantier_id is not null and user_can_access_chantier(chantier_id))
    or exists (
      select 1 from fournisseurs f
      where f.id = devis_fournisseurs.fournisseur_id
        and f.proprietaire_id = auth.uid()
    )
  );


-- ==============================================================
-- 0025 - Declarations HSE (HSE-01)
-- ==============================================================

create table if not exists hse_incidents (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  type text not null default 'incident'
    check (type in ('accident_travail','accident_route','incident','presqu_accident')),
  date_occurrence date not null default current_date,
  lieu text,
  description text not null,
  personnes_concernees integer not null default 0,
  accident_avec_arret boolean not null default false,
  duree_arret_heures numeric(6,2),
  action_immediate text,
  responsable text,
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table hse_incidents is
  'Declarations HSE : accidents du travail, accidents de la route, incidents et presqu''accidents (HSE-01)';

create index if not exists idx_hse_incidents_chantier
  on hse_incidents(chantier_id, date_occurrence desc);

alter table hse_incidents enable row level security;

drop policy if exists "hse_incidents - acces" on hse_incidents;
create policy "hse_incidents - acces"
  on hse_incidents for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));


-- ==============================================================
-- 0026 - Documents administratifs des fournisseurs (FOU-07)
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


-- ==============================================================
-- 0026 - Planning : poste DQE suivi par une tache (PLA-03)
-- ==============================================================

alter table taches_planning
  add column if not exists poste_dqe_id uuid references postes_dqe(id) on delete set null;

comment on column taches_planning.poste_dqe_id is
  'Poste du DQE suivi par la tache : avancement calcule sur les quantites saisies (PLA-03)';


-- ==============================================================
-- 0027 - Parametres de l'entreprise (REP-04, REP-05)
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

alter table parametres_entreprise enable row level security;

drop policy if exists "parametres_entreprise - acces" on parametres_entreprise;
create policy "parametres_entreprise - acces"
  on parametres_entreprise for all to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());


-- ==============================================================
-- 0028 - Check-list HSE quotidienne (HSE-02)
-- ==============================================================

create table if not exists hse_checklists (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  date date not null default current_date,
  epi boolean not null default false,
  echauffement boolean not null default false,
  signalisation boolean not null default false,
  extincteur boolean not null default false,
  commentaire text,
  saisi_par uuid references profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chantier_id, date)
);

comment on table hse_checklists is
  'Check-list HSE quotidienne : EPI, echauffement, signalisation, extincteur (HSE-02)';

create index if not exists idx_hse_checklists_chantier
  on hse_checklists(chantier_id, date desc);

alter table hse_checklists enable row level security;

drop policy if exists "hse_checklists - acces" on hse_checklists;
create policy "hse_checklists - acces"
  on hse_checklists for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
