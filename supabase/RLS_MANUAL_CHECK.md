# Vérification RLS — isolation multitenant (à exécuter dans Supabase)

Le code applicatif a été renforcé (filtre `proprietaire_id` sur les requêtes).
Toutefois, les politiques RLS définies dans
`supabase/migrations/0007_phase3_multitenant_isolation.sql` ne semblent pas
être actives dans le projet Supabase actuel (un chantier sans propriétaire
était visible de tous les comptes). Exécutez les commandes suivantes dans
l'éditeur SQL de Supabase pour vérifier et corriger.

## 1. Vérifier que la table a bien le RLS activé

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'chantiers';
```

Si `relrowsecurity` vaut `false`, activer :

```sql
alter table chantiers enable row level security;
```

## 2. Vérifier que les fonctions d'accès existent

```sql
select proname from pg_proc
where proname in ('user_can_access_chantier', 'user_can_manage_chantier', 'user_can_access_journal');
```

Si une fonction manque, ré-exécuter le fichier
`supabase/migrations/0007_phase3_multitenant_isolation.sql`.

## 3. Vérifier que les politiques sont bien présentes

```sql
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'chantiers';
```

Doit renvoyer au moins la politique `chantier - acces`.

## 4. Tester l'isolation avec deux comptes

1. Se connecter avec le compte A, créer un chantier.
2. Se connecter avec le compte B, lister les chantiers.
3. Le compte B ne doit **pas** voir le chantier du compte A.

Si le problème persiste après ces vérifications, le rôle utilisé par
PostgREST (`authenticated`) est peut-être le propriétaire des tables
(ce qui contourne le RLS). Dans ce cas, activer la sécurité forcée :

```sql
alter table chantiers force row level security;
```

Répéter pour les autres tables liées (postes_dqe, quantites_realisees,
alertes, journaux, etc.) si nécessaire.
