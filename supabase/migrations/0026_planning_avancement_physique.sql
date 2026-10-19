-- ==============================================================
-- BTP Suivi Pro - Planning : poste DQE suivi par une tache
-- (cahier des charges, section 4.6, exigence PLA-03 : « avancement
-- physique par tache, mis a jour a partir des quantites saisies »).
--
-- Une tache peut pointer vers un poste du DQE : son avancement est alors
-- calcule automatiquement (quantite realisee / quantite de marche).
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

alter table taches_planning
  add column if not exists poste_dqe_id uuid references postes_dqe(id) on delete set null;

comment on column taches_planning.poste_dqe_id is
  'Poste du DQE suivi par la tache : avancement calcule sur les quantites saisies (PLA-03)';
