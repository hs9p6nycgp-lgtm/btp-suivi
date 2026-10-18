-- ==============================================================
-- BTP Suivi Pro - REPARATION : colonnes manquantes sur chantiers
-- A executer dans Supabase (SQL Editor). Idempotent : peut etre
-- relance sans risque, meme si certaines colonnes existent deja.
-- ==============================================================
-- Contexte (bug constate le 17/10/2026) :
--   La creation d'un chantier echouait avec l'erreur PostgREST
--   "Could not find the 'hauteur' column of 'chantiers' in the schema cache".
--   Cause : la migration 0009_phase3_qualite_non_conformite.sql n'a pas ete
--   appliquee jusqu'au bout sur cette base (la table non_conformites existe
--   mais les colonnes de dimensions ci-dessous manquent). Le formulaire
--   "Nouveau chantier" envoie longueur/largeur/hauteur : sans ces colonnes,
--   PostgREST refuse l'INSERT en entier.
--   S'y ajoute le champ type_detail (types de chantier detailles), prevu
--   par la migration 0014 d'origine.

alter table chantiers
  add column if not exists longueur numeric(10,2),
  add column if not exists largeur numeric(10,2),
  add column if not exists hauteur numeric(10,2),
  add column if not exists type_detail text;

-- Index pour la recherche par sous-type de chantier
create index if not exists idx_chantiers_type_detail on chantiers(type_detail);

comment on column chantiers.longueur is 'Dimension (m) pour la visualisation 3D';
comment on column chantiers.largeur is 'Dimension (m) pour la visualisation 3D';
comment on column chantiers.hauteur is 'Dimension (m) pour la visualisation 3D';
comment on column chantiers.type_detail is 'Sous-type de chantier (ex: terrassement, chaussee, assainissement, fondations, gros_oeuvre, charpente_couverture...)';
