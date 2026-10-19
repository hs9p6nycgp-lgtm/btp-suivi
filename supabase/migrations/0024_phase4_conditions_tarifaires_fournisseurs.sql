-- ==============================================================
-- BTP Suivi Pro - Conditions tarifaires des fournisseurs (FOU-03, FOU-04)
--
-- La table `devis_fournisseurs` existait (migration 0013) mais n'etait
-- exploitee par aucun ecran. Deux complements sont necessaires :
--
--   1. Une **unite** pour chaque offre : deux offres ne sont comparables
--      que si elles portent la meme unite (un sac et une tonne ne se
--      comparent pas).
--   2. L'**acces** aux offres : une offre peut etre rattachee a un chantier
--      (comparaison pour un achat) ou directement a un fournisseur (offre
--      generale). La politique d'isolation ne laissait passer que le
--      premier cas ; une offre sans chantier etait donc invisible.
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

-- 1) Unite de l'offre
alter table devis_fournisseurs
  add column if not exists unite text;

-- 2) Acces : chantier OU fournisseur proprietaire
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

comment on column devis_fournisseurs.unite is
  'Unite de vente de l''offre (ex : sac, m3, tonne) — comparaison des offres';
