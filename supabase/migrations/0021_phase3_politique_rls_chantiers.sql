-- ==============================================================
-- BTP Suivi Pro - Correction de la politique RLS des chantiers
--
-- Symptome : la creation d'un chantier echoue avec
--   "new row violates row-level security policy for table chantiers"
-- alors que la ligne est bien ecrite en base.
--
-- Cause : la politique de lecture (USING) s'appuyait uniquement sur la
-- fonction user_can_access_chantier(id), qui interroge la table « chantiers »
-- elle-meme. Lors d'un « insert ... returning », la ligne vient d'etre
-- ecrite : le instantane de la fonction ne la voit pas encore, la ligne est
-- donc refusee a la lecture et l'insertion est signalee en erreur.
--
-- Correctif : le proprietaire voit sa propre ligne sans passer par la
-- fonction (membre d'un chantier : la fonction reste utilisee).
-- Aucun acces supplementaire n'est ouvert.
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

drop policy if exists "chantier - acces" on chantiers;

create policy "chantier - acces"
  on chantiers for all to authenticated
  using (proprietaire_id = auth.uid() or user_can_access_chantier(id))
  with check (proprietaire_id = auth.uid() or user_can_manage_chantier(id));

-- Verification : la politique doit maintenant Allow Select = true.
select
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where tablename = 'chantiers';
