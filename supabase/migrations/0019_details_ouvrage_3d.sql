-- ==============================================================
-- BTP Suivi Pro - Phase 2 : description détaillée de l'ouvrage
-- pour un modèle 3D réaliste (bâtiment et route)
-- A exécuter dans Supabase : SQL Editor > New query > Run
--
-- Idempotente : peut etre relancee sans risque (uniquement des ajouts).
--
-- Contenu :
--   Bâtiment : nombre de sous-sols / étages, hauteur par niveau,
--              trame de poteaux (travées) et type de structure/toiture.
--   Route    : nombre de voies, largeur des accotements, revêtement.
-- ==============================================================

alter table chantiers
  add column if not exists nb_sous_sols integer,
  add column if not exists nb_etages integer,
  add column if not exists hauteur_niveau numeric(6,2),
  add column if not exists nb_travees_longueur integer,
  add column if not exists nb_travees_largeur integer,
  add column if not exists type_structure text,
  add column if not exists type_toiture text,
  add column if not exists nb_voies integer,
  add column if not exists largeur_accotement numeric(6,2),
  add column if not exists type_revetement text;

comment on column chantiers.nb_sous_sols is 'Bâtiment : nombre de niveaux en sous-sol';
comment on column chantiers.nb_etages is 'Bâtiment : nombre d''étages au-dessus du RDC (R+n)';
comment on column chantiers.hauteur_niveau is 'Bâtiment : hauteur d''un niveau en mètres';
comment on column chantiers.nb_travees_longueur is 'Bâtiment : nombre de travées dans le sens de la longueur (null = auto)';
comment on column chantiers.nb_travees_largeur is 'Bâtiment : nombre de travées dans le sens de la largeur (null = auto)';
comment on column chantiers.type_structure is 'Bâtiment : poteaux_poutres, voiles ou mixte';
comment on column chantiers.type_toiture is 'Bâtiment : terrasse ou tole';
comment on column chantiers.nb_voies is 'Route : nombre de voies de circulation';
comment on column chantiers.largeur_accotement is 'Route : largeur d''un accotement en mètres (null = 20 % de la chaussée)';
comment on column chantiers.type_revetement is 'Route : bitume, beton ou pave';

-- Vérification rapide (facultatif) :
-- select nom, nb_sous_sols, nb_etages, hauteur_niveau, type_toiture from chantiers limit 5;
