-- ==============================================================
-- BTP Suivi Pro - Phase 1.4 : dimensions 3D des sections / elements
-- A executer dans Supabase apres 0009_phase3_qualite_non_conformite.sql
-- ==============================================================
-- Permet de modeliser des elements (mur, dalle, pilier, section) en 3D
-- directement dans la fiche chantier (onglet modelisation 3D).

alter table sections_chantier
  add column if not exists longueur numeric(10,2),
  add column if not exists largeur numeric(10,2),
  add column if not exists hauteur numeric(10,2),
  add column if not exists couleur text;

-- Securite : RLS deja activee sur sections_chantier (0003_phase1_chantiers_details.sql).