-- ==============================================================
-- BTP Suivi Pro - Indicateur 5.7 (taux de disponibilite d'un engin)
--
-- La formule 5.7 est : heures de marche / heures prevues x 100.
-- Il faut donc pouvoir saisir les heures prevues d'un engin dans le
-- journal de chantier (indicateur 5.6 : rendement = quantite produite
-- / heures de marche, deja couvert par la colonne existante).
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

alter table journal_engins
  add column if not exists heures_prevues numeric(6,2);

comment on column journal_engins.heures_prevues is
  'Heures prevues de l''engin (indicateur 5.7 : taux de disponibilite)';
