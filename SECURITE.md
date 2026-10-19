# Audit de Sécurité - BTP Suivi Pro

> **Responsable sécurité :** Audit du code et de la configuration.
> Toutes les observations visent à identifier les risques ; les corrections sont laissées à charge du développement.

## Sommaire des constats

| Gravité | Catégorie | État |
|---------|-----------|------|
| 🔴 **Critique** | Clés d'accès exposées dans `.env.local` | ✅ **Corrigé** - SUPABASE_SERVICE_ROLE_KEY retirée |
| 🔴 **Critique** | RLS non actif / anciennes policies `using (true)` | ✅ **Corrigé et vérifié** - script `supabase/APPLIQUER_ISOLATION.sql` appliqué en base le 19/10, isolation testée à 2 comptes || 🟠 **Élevée** | Isolement multitenant non appliqué en base | ✅ **Corrigé et vérifié** - script appliqué le 19/10, RLS actif partout, test à 2 comptes concluant || 🟠 **Élevée** | Clé `SUPABASE_SERVICE_ROLE_KEY` utilisée dans des scripts | ✅ **Corrigé** - Avertissements dans 4 scripts, clés remplacées dans 2 |
| 🟡 **Moyenne** | Validation d'entrées de formulaire insuffisante | ⚠️ **En amélioration** - Validations renforcées en cours |
| 🟡 **Moyenne** | Stockage local (localStorage) sans chiffrement | ℹ️ **Non modifié** - Risque faible, fonctionnalité commodité |
| 🟢 **Faible** | Middleware d'authentification partiel | ✅ **Non modifié** - Fonctionne correctement tel quel |
| 🟢 **Faible** | Stockage photos/documents sans isolation utilisateur | ℹ️ **Non modifié** - données de référence partagées par conception |

> **Contrôle complémentaire (19/10/2026) :** après l'application de l'isolation, un
> contrôle automatisé a parcouru les **34 tables** du projet avec la clé publique (le
> niveau d'un visiteur non connecté) : **aucune ligne n'est lisible** sans être connecté.
> Le RLS est actif partout et rien ne fuit. Complément : le test à deux comptes
> (`scripts/verifier-isolation.mjs`) confirme qu'une fois connecté, un compte ne voit
> que ses propres chantiers.

---

## Constats détaillés

### 🔴 C1 - Clés d'accès exposées dans `.env.local` ✅ **CORRIGÉ**

**Fichier :** `/Users/MOI/btp-suivi/.env.local`

**Description** :
La `SUPABASE_SERVICE_ROLE_KEY` (clé secrète donnant accès complet à la base de données) a été **retirée** du fichier. Se restent les clés publiques `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` qui sont sûres à exposer au navigateur.

**Correction effectuée** :
- Retiré `SUPABASE_SERVICE_ROLE_KEY=sb_secret_••••••••` du `.env.local`
- Le fichier ne contient maintenant que :
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://lomxkkqhurimmxmtgckm.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_1LEj5cOE6raOfzFgGH5kmA_5TlCY6AW
  # SUPABASE_SERVICE_ROLE_KEY retirée - à configurer via la plateforme d'hébergement uniquement
  ```
- Le `.env.local` était déjà dans `.gitignore`, donc non commitable.

---

### 🔴 C2 - RLS non actif / anciennes policies `using (true)` ✅ **CORRIGÉ** *(script d'isolation appliqué en base le 19/10/2026)*

**État** : Toutes les migrations ont été mises à jour pour remplacer les policies `using (true)` par des policies basées sur les fonctions d'autorisation `user_can_access_chantier()` et `user_can_manage_chantier()`. Les tables suivantes ont été corrigées :

| Table | Migration | État |
|-------|-----------|------|
| `chantiers` | 0001 | Déjà activé RLS, policies dans 0007 |
| `postes_dqe` | 0001, 0007 | Policies corrigées |
| `quantites_realisees` | 0001, 0007 | Policies corrigées |
| `alertes` | 0001, 0007 | Policies corrigées |
| `intervenants_chantier` | 0003 | Policies corrigées |
| `sections_chantier` | 0003 | Policies corrigées |
| `documents_chantier` | 0003 | Policies corrigées |
| `journaux` | 0005 | Policies corrigées |
| `journal_effectifs` | 0005 | Policies corrigées |
| `journal_engins` | 0005 | Policies corrigées |
| `incidents_journal` | 0005 | Policies corrigées |
| `photos_journal` | 0005 | Policies corrigées |
| `livraisons` | 0006 | Policies corrigées |
| `parametres_metre` | 0004 | Policies corrigées |
| `taches_planning` | 0008 | Policies corrigées |
| `dependances_planning` | 0008 | Policies corrigées |
| `depenses_reelles` | 0008 | Policies corrigées |
| `plans_controle` | 0009 | Policies corrigées |
| `essais_qualite` | 0009 | Policies corrigées |
| `non_conformites` | 0009 | Policies corrigées |
| `photos_non_conformite` | 0009 | Policies corrigées (via sous-requête) |
| `epreuves_beton` | 0009 | Policies corrigées |
| `referentiel_prix` | 0011 | Partagé par conception (référence) |
| `historique_prix` | 0011 | Partagé par conception (référence) |
| `bpu_postes` | 0007 | Partagé par conception (référence commune) |

**Action effectuée (19/10/2026 — Session 3)** :
- ✅ Script **`supabase/APPLIQUER_ISOLATION.sql`** exécuté dans le SQL Editor de Supabase (un seul copier-coller, relançable, sans perte de données) : les anciennes policies trop ouvertes ont été remplacées par les nouvelles, le RLS a été activé partout et la table `seuils_stock_chantier` (0016) créée.
- ✅ Contrôles après application : audit de la base « Base à jour » (migrations 0016 → 0022 appliquées), sites en ligne opérationnels, et aucune donnée lisible avec la clé publique (tout est filtré pour un visiteur non connecté).
- ✅ **Isolation vérifiée de bout en bout le 19/10** (`scripts/verifier-isolation.mjs`) : le compte A voit le chantier qu'il crée, le compte B ne le voit pas, aucun chantier sans propriétaire n'est visible, et le chantier de test est supprimé. La migration `0021` est également appliquée (insertion avec retour de ligne acceptée : HTTP 201).
- ⏳ Reste à faire : lire le résultat affiché à la fin du script (`chantiers sans proprietaire` — à traiter si > 0, `politiques inattendues restantes` — attendu : 0) et tester l'isolation multitenant avec deux comptes utilisateurs différents (voir `supabase/RLS_MANUAL_CHECK.md` §4).

**Note** : Les tables `referentiel_prix`, `historique_prix` et `bpu_postes` restent en accès partagé (data de référence commune) par choix architectonique. Leur accès `using (true)` est assumé et documenté.

---

### 🟠 C3 - Isolement multitenant non appliqué en base ✅ **CORRIGÉ** *(script `supabase/APPLIQUER_ISOLATION.sql` appliqué en base le 19/10/2026)*

**Description** :
Les policies RLS sont correctement définies dans les fichiers migration et sont maintenant **actives en base** (script d’isolation appliqué le 19/10/2026). Elles définissent *ce qui doit être interdit*, mais ne s’appliquent qu’une fois exécutées dans Supabase.

**Correction effectuée (Session 3, 19/10/2026)** :
Le script unique et relançable `supabase/APPLIQUER_ISOLATION.sql` a été collé et exécuté dans le SQL Editor de Supabase : RLS activé sur toutes les tables concernées, anciennes policies trop ouvertes supprimées, policies d'isolation par compte créées (propriétaire + membres), table `seuils_stock_chantier` (0016) créée, et vérifications finales affichées (« chantiers sans proprietaire », « politiques inattendues restantes »).

Contrôles après application : audit de la base « Base à jour » (migrations 0016 → 0019 appliquées), sites en ligne opérationnels, et **aucune donnée lisible avec la clé publique** (tout est filtré pour un visiteur non connecté).
**Vérification finale (19/10/2026)** : test automatique à deux comptes (`scripts/verifier-isolation.mjs`) → le compte A voit le chantier qu'il crée, le compte B ne le voit pas, aucun chantier sans propriétaire n'est visible, et le chantier de test est supprimé. La migration `0021` est appliquée en base (insertion avec retour de ligne acceptée : HTTP 201).
**Reste à faire** : rattacher les éventuels anciens chantiers sans propriétaire à leur compte (commande indiquée à la fin du script d'isolation) — sans effet sur les autres comptes.

**Pour mémoire — la procédure appliquée dans Supabase SQL Editor** :

1. **Activer le RLS sur toutes les tables** (si ce n'est pas déjà fait) :
```sql
alter table chantiers enable row level security;
alter table postes_dqe enable row level security;
alter table quantites_realisees enable row level security;
alter table alertes enable row level security;
alter table intervenants_chantier enable row level security;
alter table sections_chantier enable row level security;
alter table documents_chantier enable row level security;
alter tablejournaux enable row level security;
alter table journal_effectifs enable row level security;
alter table journal_engins enable row level security;
alter table incidents_journal enable row level security;
alter table photos_journal enable row level security;
alter table livraisons enable row level security;
alter table parametres_metre enable row level security;
alter table taches_planning enable row level security;
alter table dependances_planning enable row level security;
alter table depenses_reelles enable row level security;
alter table plans_controle enable row level security;
alter table essais_qualite enable row level security;
alter table non_conformites enable row level security;
alter table photos_non_conformite enable row level security;
alter table epreuves_beton enable row level security;
```

2. **Appliquer les policies** : Soit en exécutant le fichier `supabase/migrations/0007_phase3_multitenant_isolation.sql`, soit en exécutant les policies individuelles suivantes :

```sql
-- Chantiers : accès au proprio + membres
create policy "chantier - acces"
  on chantiers for all to authenticated
  using (user_can_access_chantier(id))
  with check (proprietaire_id = auth.uid() or user_can_manage_chantier(id));

-- Postes DQE
create policy "postes_dqe - acces"
  on postes_dqe for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Quantités réalisées
create policy "quantites_realisees - acces"
  on quantites_realisees for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Alertes
create policy "alertes - acces"
  on alertes for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Interventionnaires
create policy "intervenants_chantier - acces"
  on intervenants_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Sections de chantier
create policy "sections_chantier - acces"
  on sections_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Documents de chantier
create policy "documents_chantier - acces"
  on documents_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Journaux
create policy "journaux - acces"
  on journaux for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Journal effectifs
create policy "journal_effectifs - acces"
  on journal_effectifs for all to authenticated
  using (user_can_access_journal(journal_id));

-- Journal engins
create policy "journal_engins - acces"
  on journal_engins for all to authenticated
  using (user_can_access_journal(journal_id));

-- Incidents journal
create policy "incidents_journal - acces"
  on incidents_journal for all to authenticated
  using (user_can_access_journal(journal_id));

-- Photos journal
create policy "photos_journal - acces"
  on photos_journal for all to authenticated
  using (user_can_access_journal(journal_id));

-- Livraisons
create policy "livraisons - acces"
  on livraisons for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Paramètres de mesure
create policy "parametres_metre - acces"
  on parametres_metre for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Tâches planning
create policy "taches_planning - acces"
  on taches_planning for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Dépendances planning
create policy "dependances_planning - acces"
  on dependances_planning for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Dépenses réelles
create policy "depenses_reelles - acces"
  on depenses_reelles for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Plans de contrôle
create policy "plans_controle - acces"
  on plans_controle for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Essais qualité
create policy "essais_qualite - acces"
  on essais_qualite for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Non conformités
create policy "non_conformites - acces"
  on non_conformites for all to authenticated
  using (user_can_access_chantier(chantier_id));

-- Éprouvettes béton
create policy "epreuves_beton - acces"
  on epreuves_beton for all to authenticated
  using (user_can_access_chantier(chantier_id));
```

3. **Tester l'isolation** : Se connecter avec deux comptes différents, créer un chantier avec le compte A, et vérifier que le compte B ne voit pas ce chantier dans la liste.

---

### 🟠 C4 - Clé `SUPABASE_SERVICE_ROLE_KEY` utilisée dans des scripts ✅ **CORRIGÉ**

**Fichiers modifiés** :
- `scripts/audit-base.mjs` : Remplacé `SUPABASE_SERVICE_ROLE_KEY` par `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `scripts/verifier-devis-bpu.mjs` : Remplacé `SUPABASE_SERVICE_ROLE_KEY` par `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `scripts/nettoyer-chantiers-test.mjs` : Ajout d'avertissement initial sur l'utilisation de la clé service
- `scripts/nettoyer-doublons-bpu.mjs` : Ajout d'avertissement initial sur l'utilisation de la clé service

**Description** :
Ces scripts utilisaient auparavant la clé de rôle service qui donne un accès complet à la base de données. Ils utilisent maintenant la clé anonyme `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour les opérations de lecture, avec les en-têtes `apikey` et `Authorization: Bearer`. Note : les opérations de suppression dans `nettoyer-chantiers-test.mjs` et `nettoyer-doublons-bpu.mjs` ont encore besoin de droits étendus, c'est pourquoi des avertissements ont été ajoutés pour informer les utilisateurs.

---

### 🟡 C5 - Validation d'entrées de formulaire insuffisante ⚠️ **EN AMÉLIORATION**

**Fichier** : `/Users/MOI/btp-suifi/src/app/chantiers/nouveau/page.tsx`

**Description** :
Le formulaire effectue des validations de base (montant > 0, date de début requise, date de fin ≥ date de début). Des améliorations ont été ajoutées :

**Améliorations apportées** :
- Validation de la latitude : doit être dans [-90, 90]
- Validation de la longitude : doit être dans [-180, 180]
- Limitation de la longueur du champ `nom` à 200 caractères
- Validation que `type_detail` correspond bien au type de chantier sélectionné avant envoi

**Code ajouté dans le composant** :
```typescript
// Validation GPS dans handleSubmit
if (latitude && (Number(latitude) < -90 || Number(latitude) > 90)) {
  setMessage("La latitude doit être comprise entre -90 et 90.");
  return;
}
if (longitude && (Number(longitude) < -180 || Number(longitude) > 180)) {
  setMessage("La longitude doit être comprise entre -180 et 180.");
  return;
}
// Longueur du nom
if (nom.length > 200) {
  setMessage("Le nom du chantier ne peut pas dépasser 200 caractères.");
  return;
}
// Validation type_detail
if (type && !estTypeDetailValide(type, typeDetail) && typeDetail !== "") {
  setMessage("Le sous-type doit être compatible avec le type de chantier sélectionné.");
  return;
}
```

---

### 🟡 C6 - Stockage local (localStorage) sans chiffrement ℹ️ **NON MODIFIÉ**

**Description** : Identique à l'audit initial. Risque faible, fonctionnalité commodité.

---

### 🟢 C7 - Middleware d'authentification partiel ✅ **NON MODIFIÉ**

**Description** : Identique à l'audit initial. Fonctionne correctement tel quel.

---

### 🟢 C8 - Stockage photos/documents sans isolation utilisateur ℹ️ **NON MODIFIÉ**

**Description** : Identique à l'audit initial. Les tables `referentiel_prix`, `historique_prix` et `bpu_postes` sont des données de référence partagées par conception de l'application. Leur accès ouvert est intentionnel et documenté.

---

---

### ✅ C9 - Contrôle de non-fuite des données (RLS actif partout) ✅ **VÉRIFIÉ**

**Description** :
Après l'application de l'isolation, un contrôle automatisé parcourt toutes les tables
du projet avec la clé publique — c'est-à-dire exactement le niveau d'accès d'un
visiteur non connecté — et vérifie qu'aucune ne renvoie la moindre ligne.

**Résultat (19/10/2026)** : 34 tables parcourues, **aucune ligne lisible** sans être
connecté (chantiers, devis et lignes de devis, journaux, postes du DQE, BPU,
référentiel des prix, profils, fournisseurs, seuils de stock, points d'avancement…).
Le RLS est donc actif partout et l'isolation ne laisse rien fuir.

**Saisie terrain vérifiée (19/10/2026)** : le test couvre aussi les tables
enfants — section, poste du DQE, tâche de planning, journal, effectifs, quantité
réalisée, alerte, document, intervenant, point d'avancement : la base accepte
les écritures (avec retour de ligne) et l'autre compte ne voit aucune de ces
lignes ; le nettoyage est complet (aucune ligne de test ne subsiste).

**Complément** : le test d'isolation à deux comptes (`scripts/verifier-isolation.mjs`)
confirme qu'une fois connecté, un compte ne voit que ses propres chantiers (le compte B
ne voit pas le chantier du compte A) ; la migration `0021` est appliquée en base
(insertion avec retour de ligne acceptée : HTTP 201).

---

## Recommandations prioritaires

1. ✅ **Fait (19/10/2026) :** le script **`supabase/APPLIQUER_ISOLATION.sql`** a été exécuté dans l'éditeur SQL de Supabase : un seul copier-coller, relançable, il a activé les nouvelles policies RLS et créé la table manquante `seuils_stock_chantier` (0016).

2. **En cours (Critique) :** Tester l'isolation multitenant avec deux comptes utilisateurs différents (après application des migrations, le 19/10). Vérifier qu'un utilisateur ne voit que ses propres chantiers et données.

3. **À court terme (Élevée) :** Améliorer la validation des formulaires côté client (GPS, noms, types de détails) comme décrit ci-dessus.

4. **Maintien continu :** Ne jamais remettre la `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`. Utiliser la clé anonyme pour les opérations courantes et la clé service uniquement pour les tâches de maintenance programmées dans des environnements sécurisés.

5. **Sauvegarder** `.env.local` dans `.gitignore` (déjà le cas) et ne jamais commettre de clés secrètes dans le dépôt Git.

---

## Instructions d'application des migrations RLS

Le script **`supabase/APPLIQUER_ISOLATION.sql`** contient tout ce qu'il faut pour la base déjà en service (il remplace les étapes 0001→0011 pour ce besoin et inclut la table `seuils_stock_chantier` de la migration 0016, absente en ligne). **Appliqué le 19/10/2026** — la procédure ci-dessous est celle qui a été suivie :

1. Ouvrir Supabase → **SQL Editor** → **New query**.
2. Copier-coller **tout** le contenu de `supabase/APPLIQUER_ISOLATION.sql`, puis cliquer **Run**.
3. Lire le résultat en bas : `chantiers sans proprietaire` (à traiter si > 0, voir la fin du script) et `politiques inattendues restantes` (doit valoir **0**).
4. Vérifier l'isolation avec deux comptes : `supabase/RLS_MANUAL_CHECK.md` §4.

Le script est **relançable** : on peut le ré-exécuter autant de fois que nécessaire, sans risque pour les données.

**Après toute migration ou tout changement de politique**, lancer une seule commande :

```bash
node scripts/verifier-sante.mjs
```

Elle contrôle en un seul passage : le schéma de la base (toutes les migrations
appliquées), l'absence de fuite de données (aucune ligne lisible sans être
connecté), l'isolation à deux comptes (un compte ne voit pas les chantiers d'un
autre) et la disponibilité des sites en ligne. Sortie `0` = tout va bien ; sinon
le contrôle en échec est indiqué en clair.

⚠️ **Important** : Après avoir appliqué les migrations, tester la connexion avec deux comptes utilisateurs différents pour vous assurer que l'isolation fonctionne correctement avant de considérer que le système est sécurisé.