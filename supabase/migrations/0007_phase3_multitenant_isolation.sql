-- ==============================================================
-- BTP Suivi Pro - Multi-tenant : isolation des donnees par compte
-- A executer dans Supabase apres 0006_phase2_livraisons.sql
-- ==============================================================

-- Proprietaire d'un chantier
alter table chantiers
  add column if not exists proprietaire_id uuid references profils(id) on delete set null,
  alter column proprietaire_id set default auth.uid();

-- Fonctions d'acces (security definer pour eviter la recursion RLS)
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

-- Suppression des anciennes policies "acces total" pour les tables liees aux chantiers
drop policy if exists "acces authentifie - chantiers" on chantiers;
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
drop policy if exists "acces authentifie - chantier_utilisateurs" on chantier_utilisateurs;

-- Chantiers : acces restreint au proprietaire + membres
create policy "chantier - acces"
  on chantiers for all to authenticated
  using (user_can_access_chantier(id))
  with check (proprietaire_id = auth.uid() or user_can_manage_chantier(id));

-- Membres d'un chantier
create policy "chantier_utilisateurs - lecture"
  on chantier_utilisateurs for select to authenticated
  using (user_can_access_chantier(chantier_id));
create policy "chantier_utilisateurs - gestion"
  on chantier_utilisateurs for insert to authenticated
  with check (user_can_manage_chantier(chantier_id));
create policy "chantier_utilisateurs - modification"
  on chantier_utilisateurs for update to authenticated
  using (user_can_manage_chantier(chantier_id))
  with check (user_can_manage_chantier(chantier_id));
create policy "chantier_utilisateurs - suppression"
  on chantier_utilisateurs for delete to authenticated
  using (user_can_manage_chantier(chantier_id));

-- Tables directement liees a un chantier
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

-- Journaux
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

-- BPU reste partage (reference commune) ; pour le rendre prive, remplacez par user_can_access...
alter table bpu_postes enable row level security;
drop policy if exists "acces authentifie - bpu_postes" on bpu_postes;
create policy "bpu_postes - lecture partagee"
  on bpu_postes for select to authenticated using (true);
create policy "bpu_postes - ecriture partagee"
  on bpu_postes for insert to authenticated with check (true);
create policy "bpu_postes - modification partagee"
  on bpu_postes for update to authenticated using (true) with check (true);
create policy "bpu_postes - suppression partagee"
  on bpu_postes for delete to authenticated using (true);