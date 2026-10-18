-- ======================================================================
-- BTP Suivi Pro - Nettoyage des doublons de bpu_postes
--
-- Contexte (constate le 18/10/2026) :
--   La table bpu_postes contient 443 lignes pour seulement 289 postes
--   uniques : 154 doublons EXACTS (meme designation, meme unite, meme
--   prix, meme code). Cause : double chargement (import dans
--   l'application + rechargement SQL supabase/seed/reload_bpu.sql).
--   Ces doublons apparaissent dans la liste des prix du calcul de devis.
--
-- A executer dans le SQL Editor de Supabase, APRES accord de l'utilisateur.
-- Idempotent : peut etre relance sans risque (ne supprime que les copies).
--
-- Aucune autre table ne reference bpu_postes.id : la suppression est sure.
-- ======================================================================

-- ----------------------------------------------------------------------
-- ETAPE 1 : VOIR les doublons avant toute suppression (facultatif)
-- ----------------------------------------------------------------------
select designation, unite, prix_unitaire, code, count(*) as nb_copies
from bpu_postes
group by designation, unite, prix_unitaire, code
having count(*) > 1
order by designation;

-- ----------------------------------------------------------------------
-- ETAPE 2 : SUPPRIMER les copies
-- On garde la ligne LA PLUS ANCIENNE de chaque groupe (created_at, puis id).
-- ----------------------------------------------------------------------
with classement as (
  select id,
         row_number() over (
           partition by designation, unite, prix_unitaire
           order by created_at asc, id asc
         ) as rang
  from bpu_postes
)
delete from bpu_postes
where id in (select id from classement where rang > 1);

-- ----------------------------------------------------------------------
-- ETAPE 3 : VERIFIER (doit retourner 0 ligne apres suppression)
-- ----------------------------------------------------------------------
select designation, unite, prix_unitaire, count(*) as nb
from bpu_postes
group by designation, unite, prix_unitaire
having count(*) > 1;

-- ----------------------------------------------------------------------
-- OPTION (non activee) : empecher les doublons futurs
-- A activer seulement si vous acceptez qu'un import strictement en double
-- soit refuse (message « Cet enregistrement existe deja. »).
-- ----------------------------------------------------------------------
-- create unique index if not exists idx_bpu_postes_unique_triplet
--   on bpu_postes (designation, unite, prix_unitaire);
