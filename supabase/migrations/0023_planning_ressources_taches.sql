-- ==============================================================
-- BTP Suivi Pro - Planning : affectation des ressources aux taches
-- (audit metier du 19/10/2026, §2 : « pas d'affectation d'equipe/engin
-- aux taches »).
--
-- Deux colonnes sur taches_planning :
--   equipe  : corps de metre affecte a la tache (terrassiers, maconnerie...)
--   engins  : materiels utilises sur la tache
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

alter table taches_planning
  add column if not exists equipe text,
  add column if not exists engins text;

comment on column taches_planning.equipe is
  'Equipe affectee a la tache (ex. : Terrassiers)';
comment on column taches_planning.engins is
  'Engins et materiels utilises sur la tache (ex. : 1 pelleteuse, 2 camions)';
