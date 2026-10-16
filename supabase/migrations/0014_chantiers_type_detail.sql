-- ==============================================================
-- BTP Suivi Pro - Types de chantier détaillés
-- A executer dans Supabase apres 0013_phase2_livraisons_suivi.sql
-- ==============================================================
-- Permet de specifier un sous-type de chantier (ex: ossature, charpente
-- pour un batiment ; terrassement, chaussée, assainissement pour une route).

alter table chantiers
  add column if not exists type_detail text;

-- Index pour la recherche par sous-type
create index if not exists idx_chantiers_type_detail on chantiers(type_detail);