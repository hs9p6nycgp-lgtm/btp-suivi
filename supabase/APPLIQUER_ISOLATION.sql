-- ============================================================================
-- BTP Suivi Pro — APPLIQUER L'ISOLATION DES DONNEES PAR COMPTE
-- ----------------------------------------------------------------------------
-- A coller en UNE FOIS dans Supabase : Tableau de bord > SQL Editor > New query
--
-- Sans danger : ne supprime AUCUNE donnée. Remplace uniquement d'anciennes
-- règles d'accès trop ouvertes par les nouvelles (isolation par compte).
-- Peut être relancé autant de fois que nécessaire.
--
-- Contenu :
--   1. Fonctions d'accès (propriétaire / membre d'un chantier)
--   2. Colonne « proprietaire_id » des chantiers (si absente)
--   3. Table des seuils de stock (migration 0016, absente en ligne)
--   4. Activation du RLS sur toutes les tables concernées
--   5. Suppression des anciennes politiques trop ouvertes
--   6. Nouvelles politiques d'isolation
--   7. Tables de référence partagées (BPU, référentiel des prix)
--   8. Vérifications finales (lisez le résultat affiché en bas)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) FONCTIONS D'ACCES
-- ----------------------------------------------------------------------------
create or replace function user_can_access_chantier(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from chantiers c
    where c.id = cid
      and (
        c.proprietaire_id = auth.uid()
        or exists (
          select 1
          from chantier_utilisateurs cu
          where cu.chantier_id = c.id
            and cu.utilisateur_id = auth.uid()
        )
      )
  );
$$;

create or replace function user_can_manage_chantier(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from chantiers c
    where c.id = cid
      and (
        c.proprietaire_id = auth.uid()
        or exists (
          select 1
          from chantier_utilisateurs cu
          where cu.chantier_id = c.id
            and cu.utilisateur_id = auth.uid()
            and cu.role = 'administrateur'
        )
      )
  );
$$;

create or replace function user_can_access_journal(jid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from journaux j
    where j.id = jid and user_can_access_chantier(j.chantier_id)
  );
$$;


-- ----------------------------------------------------------------------------
-- 2) COLONNE PROPRIETAIRE DES CHANTIERS (le créateur devient propriétaire)
-- ----------------------------------------------------------------------------
alter table chantiers
  add column if not exists proprietaire_id uuid references profils(id) on delete set null;
alter table chantiers
  alter column proprietaire_id set default auth.uid();


-- ----------------------------------------------------------------------------
-- 3) TABLE DES SEUILS DE STOCK (migration 0016, absente en ligne)
-- ----------------------------------------------------------------------------
create table if not exists seuils_stock_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  materiau text not null,
  seuil numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (chantier_id, materiau)
);


-- ----------------------------------------------------------------------------
-- 4) RLS ACTIVE SUR TOUTES LES TABLES CONCERNEES
-- ----------------------------------------------------------------------------
alter table profils enable row level security;
alter table chantier_utilisateurs enable row level security;
alter table chantiers enable row level security;
alter table postes_dqe enable row level security;
alter table quantites_realisees enable row level security;
alter table alertes enable row level security;
alter table intervenants_chantier enable row level security;
alter table sections_chantier enable row level security;
alter table documents_chantier enable row level security;
alter table parametres_metre enable row level security;
alter table journaux enable row level security;
alter table journal_effectifs enable row level security;
alter table journal_engins enable row level security;
alter table incidents_journal enable row level security;
alter table photos_journal enable row level security;
alter table livraisons enable row level security;
alter table taches_planning enable row level security;
alter table dependances_planning enable row level security;
alter table depenses_reelles enable row level security;
alter table plans_controle enable row level security;
alter table essais_qualite enable row level security;
alter table non_conformites enable row level security;
alter table photos_non_conformite enable row level security;
alter table epreuves_beton enable row level security;
alter table bpu_postes enable row level security;
alter table referentiel_prix enable row level security;
alter table historique_prix enable row level security;
alter table fournisseurs enable row level security;
alter table devis_fournisseurs enable row level security;
alter table evaluations_fournisseurs enable row level security;
alter table seuils_stock_chantier enable row level security;


-- ----------------------------------------------------------------------------
-- 5) ANCIENNES POLITIQUES TROP OUVERTES : SUPPRESSION
--    (sans effet si elles n'existent plus ; aucune donnée touchée)
-- ----------------------------------------------------------------------------
drop policy if exists "acces authentifie - profils" on profils;
drop policy if exists "acces authentifie - chantiers" on chantiers;
drop policy if exists "acces authentifie - chantier_utilisateurs" on chantier_utilisateurs;
drop policy if exists "acces authentifie - postes_dqe" on postes_dqe;
drop policy if exists "acces authentifie - quantites_realisees" on quantites_realisees;
drop policy if exists "acces authentifie - alertes" on alertes;
drop policy if exists "acces authentifie - intervenants_chantier" on intervenants_chantier;
drop policy if exists "acces authentifie - sections_chantier" on sections_chantier;
drop policy if exists "acces authentifie - documents_chantier" on documents_chantier;
drop policy if exists "acces authentifie - parametres_metre" on parametres_metre;
drop policy if exists "acces authentifie - journaux" on journaux;
drop policy if exists "acces authentifie - journal_effectifs" on journal_effectifs;
drop policy if exists "acces authentifie - journal_engins" on journal_engins;
drop policy if exists "acces authentifie - incidents_journal" on incidents_journal;
drop policy if exists "acces authentifie - photos_journal" on photos_journal;
drop policy if exists "acces authentifie - livraisons" on livraisons;
drop policy if exists "acces authentifie - bpu_postes" on bpu_postes;
drop policy if exists "referentiel_prix - acces" on referentiel_prix;
drop policy if exists "historique_prix - acces" on historique_prix;

-- Politiques déjà créées lors d'essais précédents (pour les recréer proprement) :
drop policy if exists "profils - acces proprietaire" on profils;
drop policy if exists "profils - lecture annuaire" on profils;
drop policy if exists "chantier - acces" on chantiers;
drop policy if exists "chantier_utilisateurs - lecture" on chantier_utilisateurs;
drop policy if exists "chantier_utilisateurs - gestion" on chantier_utilisateurs;
drop policy if exists "chantier_utilisateurs - modification" on chantier_utilisateurs;
drop policy if exists "chantier_utilisateurs - suppression" on chantier_utilisateurs;
drop policy if exists "postes_dqe - acces" on postes_dqe;
drop policy if exists "quantites_realisees - acces" on quantites_realisees;
drop policy if exists "alertes - acces" on alertes;
drop policy if exists "intervenants_chantier - acces" on intervenants_chantier;
drop policy if exists "intervenants_chantier - gestion" on intervenants_chantier;
drop policy if exists "intervenants_chantier - modification" on intervenants_chantier;
drop policy if exists "intervenants_chantier - suppression" on intervenants_chantier;
drop policy if exists "sections_chantier - acces" on sections_chantier;
drop policy if exists "documents_chantier - acces" on documents_chantier;
drop policy if exists "parametres_metre - acces" on parametres_metre;
drop policy if exists "journaux - acces" on journaux;
drop policy if exists "journal_effectifs - acces" on journal_effectifs;
drop policy if exists "journal_engins - acces" on journal_engins;
drop policy if exists "incidents_journal - acces" on incidents_journal;
drop policy if exists "photos_journal - acces" on photos_journal;
drop policy if exists "livraisons - acces" on livraisons;
drop policy if exists "taches_planning - acces" on taches_planning;
drop policy if exists "dependances_planning - acces" on dependances_planning;
drop policy if exists "depenses_reelles - acces" on depenses_reelles;
drop policy if exists "plans_controle - acces" on plans_controle;
drop policy if exists "essais_qualite - acces" on essais_qualite;
drop policy if exists "non_conformites - acces" on non_conformites;
drop policy if exists "photos_non_conformite - acces" on photos_non_conformite;
drop policy if exists "epreuves_beton - acces" on epreuves_beton;
drop policy if exists "fournisseurs - acces" on fournisseurs;
drop policy if exists "devis_fournisseurs - acces" on devis_fournisseurs;
drop policy if exists "evaluations_fournisseurs - acces" on evaluations_fournisseurs;
drop policy if exists "seuils stock - acces" on seuils_stock_chantier;
drop policy if exists "bpu_postes - lecture partagee" on bpu_postes;
drop policy if exists "bpu_postes - ecriture partagee" on bpu_postes;
drop policy if exists "bpu_postes - modification partagee" on bpu_postes;
drop policy if exists "bpu_postes - suppression partagee" on bpu_postes;
drop policy if exists "referentiel_prix - lecture" on referentiel_prix;
drop policy if exists "referentiel_prix - ecriture" on referentiel_prix;
drop policy if exists "referentiel_prix - modification" on referentiel_prix;
drop policy if exists "referentiel_prix - suppression" on referentiel_prix;
drop policy if exists "historique_prix - lecture" on historique_prix;
drop policy if exists "historique_prix - ecriture" on historique_prix;
drop policy if exists "historique_prix - modification" on historique_prix;
drop policy if exists "historique_prix - suppression" on historique_prix;


-- ----------------------------------------------------------------------------
-- 6) NOUVELLES POLITIQUES D'ISOLATION
-- ----------------------------------------------------------------------------

-- Profils : chacun gère sa fiche ; l'annuaire (noms) reste lisible par les
-- comptes connectés pour l'affichage des équipes de chantier.
create policy "profils - acces proprietaire"
  on profils for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
create policy "profils - lecture annuaire"
  on profils for select to authenticated
  using (true);

-- Chantiers : accès au propriétaire + aux membres ; création/mise à jour
-- réservées au propriétaire ou à un membre administrateur.
create policy "chantier - acces"
  on chantiers for all to authenticated
  using (user_can_access_chantier(id))
  with check (proprietaire_id = auth.uid() or user_can_manage_chantier(id));

-- Équipe d'un chantier : lecture par les membres ; gestion par le
-- propriétaire ou un membre administrateur.
create policy "chantier_utilisateurs - lecture"
  on chantier_utilisateurs for select to authenticated
  using (user_can_access_chantier(chantier_id));
create policy "chantier_utilisateurs - gestion"
  on chantier_utilisateurs for all to authenticated
  using (user_can_manage_chantier(chantier_id))
  with check (user_can_manage_chantier(chantier_id));

-- Tables rattachées à un chantier : accès aux membres du chantier.
create policy "postes_dqe - acces"
  on postes_dqe for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "quantites_realisees - acces"
  on quantites_realisees for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "alertes - acces"
  on alertes for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "intervenants_chantier - acces"
  on intervenants_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "sections_chantier - acces"
  on sections_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "documents_chantier - acces"
  on documents_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "parametres_metre - acces"
  on parametres_metre for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "livraisons - acces"
  on livraisons for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "taches_planning - acces"
  on taches_planning for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "dependances_planning - acces"
  on dependances_planning for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "depenses_reelles - acces"
  on depenses_reelles for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "plans_controle - acces"
  on plans_controle for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "essais_qualite - acces"
  on essais_qualite for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "non_conformites - acces"
  on non_conformites for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "photos_non_conformite - acces"
  on photos_non_conformite for all to authenticated
  using (exists (
    select 1 from non_conformites nc
    where nc.id = non_conformite_id and user_can_access_chantier(nc.chantier_id)
  ))
  with check (exists (
    select 1 from non_conformites nc
    where nc.id = non_conformite_id and user_can_access_chantier(nc.chantier_id)
  ));
create policy "epreuves_beton - acces"
  on epreuves_beton for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));

-- Journaux : accès aux membres du chantier du journal.
create policy "journaux - acces"
  on journaux for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "journal_effectifs - acces"
  on journal_effectifs for all to authenticated
  using (user_can_access_journal(journal_id))
  with check (user_can_access_journal(journal_id));
create policy "journal_engins - acces"
  on journal_engins for all to authenticated
  using (user_can_access_journal(journal_id))
  with check (user_can_access_journal(journal_id));
create policy "incidents_journal - acces"
  on incidents_journal for all to authenticated
  using (user_can_access_journal(journal_id))
  with check (user_can_access_journal(journal_id));
create policy "photos_journal - acces"
  on photos_journal for all to authenticated
  using (user_can_access_journal(journal_id))
  with check (user_can_access_journal(journal_id));

-- Fournisseurs : chacun gère les siens ; devis et évaluations rattachés
-- au chantier ou au fournisseur.
create policy "fournisseurs - acces"
  on fournisseurs for all to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());
create policy "devis_fournisseurs - acces"
  on devis_fournisseurs for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "evaluations_fournisseurs - acces"
  on evaluations_fournisseurs for all to authenticated
  using (exists (
    select 1 from fournisseurs f
    where f.id = evaluations_fournisseurs.fournisseur_id
      and f.proprietaire_id = auth.uid()
  ))
  with check (exists (
    select 1 from fournisseurs f
    where f.id = evaluations_fournisseurs.fournisseur_id
      and f.proprietaire_id = auth.uid()
  ));

-- Seuils de stock (APP-04)
create policy "seuils stock - acces"
  on seuils_stock_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));


-- ----------------------------------------------------------------------------
-- 7) TABLES DE REFERENCE PARTAGEES (lecture + écriture pour les comptes
--    connectés) : BPU/DQE et référentiel des prix (choix assumé, voir
--    SECURITE.md — ces données sont communes à l'entreprise).
-- ----------------------------------------------------------------------------
create policy "bpu_postes - lecture partagee"
  on bpu_postes for select to authenticated using (true);
create policy "bpu_postes - ecriture partagee"
  on bpu_postes for insert to authenticated with check (true);
create policy "bpu_postes - modification partagee"
  on bpu_postes for update to authenticated using (true) with check (true);
create policy "bpu_postes - suppression partagee"
  on bpu_postes for delete to authenticated using (true);

create policy "referentiel_prix - lecture"
  on referentiel_prix for select to authenticated using (true);
create policy "referentiel_prix - ecriture"
  on referentiel_prix for insert to authenticated with check (true);
create policy "referentiel_prix - modification"
  on referentiel_prix for update to authenticated using (true) with check (true);
create policy "referentiel_prix - suppression"
  on referentiel_prix for delete to authenticated using (true);

create policy "historique_prix - lecture"
  on historique_prix for select to authenticated using (true);
create policy "historique_prix - ecriture"
  on historique_prix for insert to authenticated with check (true);
create policy "historique_prix - modification"
  on historique_prix for update to authenticated using (true) with check (true);
create policy "historique_prix - suppression"
  on historique_prix for delete to authenticated using (true);


-- ----------------------------------------------------------------------------
-- 8) VERIFICATIONS (lisez le résultat affiché en bas de l'écran)
--    Attendu : « chantiers sans proprietaire » = 0 si tous vos chantiers
--    ont bien un propriétaire ; « politiques inattendues restantes » = 0.
-- ----------------------------------------------------------------------------
select
  (select count(*) from chantiers where proprietaire_id is null)
    as "chantiers sans proprietaire",
  (select count(*) from pg_policies
     where schemaname = 'public'
       and tablename in (
         'profils','chantier_utilisateurs','chantiers','postes_dqe',
         'quantites_realisees','alertes','intervenants_chantier',
         'sections_chantier','documents_chantier','parametres_metre',
         'journaux','journal_effectifs','journal_engins','incidents_journal',
         'photos_journal','livraisons','taches_planning',
         'dependances_planning','depenses_reelles','plans_controle',
         'essais_qualite','non_conformites','photos_non_conformite',
         'epreuves_beton','bpu_postes','referentiel_prix','historique_prix',
         'fournisseurs','devis_fournisseurs','evaluations_fournisseurs',
         'seuils_stock_chantier'
       )
       and policyname not in (
         'profils - acces proprietaire','profils - lecture annuaire',
         'chantier - acces',
         'chantier_utilisateurs - lecture','chantier_utilisateurs - gestion',
         'postes_dqe - acces','quantites_realisees - acces','alertes - acces',
         'intervenants_chantier - acces','sections_chantier - acces',
         'documents_chantier - acces','parametres_metre - acces',
         'journaux - acces','journal_effectifs - acces','journal_engins - acces',
         'incidents_journal - acces','photos_journal - acces','livraisons - acces',
         'taches_planning - acces','dependances_planning - acces',
         'depenses_reelles - acces','plans_controle - acces',
         'essais_qualite - acces','non_conformites - acces',
         'photos_non_conformite - acces','epreuves_beton - acces',
         'fournisseurs - acces','devis_fournisseurs - acces',
         'evaluations_fournisseurs - acces','seuils stock - acces',
         'bpu_postes - lecture partagee','bpu_postes - ecriture partagee',
         'bpu_postes - modification partagee','bpu_postes - suppression partagee',
         'referentiel_prix - lecture','referentiel_prix - ecriture',
         'referentiel_prix - modification','referentiel_prix - suppression',
         'historique_prix - lecture','historique_prix - ecriture',
         'historique_prix - modification','historique_prix - suppression'
       ))
    as "politiques inattendues restantes";

-- Si « chantiers sans proprietaire » est supérieur à 0 : ces chantiers
-- anciens n'appartiendront à personne (invisibles). Pour les rattacher à
-- votre compte, remplacez l'adresse par la vôtre, puis exécutez la ligne :
-- update chantiers set proprietaire_id =
--   (select id from profils where email = 'VOTRE-ADRESSE@EXEMPLE.COM' limit 1)
--   where proprietaire_id is null;
