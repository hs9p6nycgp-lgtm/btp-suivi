# TODO_LOGIQUE — Bugs de calcul et de base à corriger

Ce fichier liste les bugs de calcul ou de base de données rencontrés
lors des tests. Chaque entrée référencie le bug correspondant dans
`BUGS.md` (BUG-005 à BUG-009) ; les corrections à prévoir y sont
décrites avec le détail.

*(Les entrées TODO-LOGIC-006 à 010 proviennent de l'audit métier du
19/10/2026 — ce sont des améliorations, sans bug associé dans `BUGS.md`.)*

| Réf  | Description courte                                                    |
|------|---------------------------------------------------------------------|
| TODO-LOGIC-001 | Indicateurs de la section 5 jamais appelés par les écrans          |
| TODO-LOGIC-002 | validerBasePrix jamais appelée lors de l’import                  |
| TODO-LOGIC-003 | estConforme jamais appelée dans la page qualité                   |
| TODO-LOGIC-004 | Date de fin prévue du planning copiée de la date de début        |
| TODO-LOGIC-005 | Isolation multitenant non fonctionnelle                          |
| TODO-LOGIC-006 | Plans de contrôle qualité : logique de création (T-LOG-36)       |
| TODO-LOGIC-007 | Enregistrer un devis : table + logique (T-LOG-37)                |
| TODO-LOGIC-008 | Planning : liens entre les tâches (T-LOG-38)                     |
| TODO-LOGIC-009 | Rapport complet : agrégats + export (T-LOG-39)                   |
| TODO-LOGIC-010 | BPU : dédoublonnage + conditions fournisseurs (T-LOG-40)         |
| TODO-LOGIC-011 | Calculateur de murs : prix dans la bonne unité + montants sans décimale (T-LOG-41) | ✅ CORRIGÉ (19/10) |
| TODO-LOGIC-012 | Base de prix : date de source obligatoire + lien avec le Référentiel (T-LOG-42) | ✅ CORRIGÉ (19/10) — date obligatoire à la saisie, référentiel alimenté (289 prix), historique REF-03, liste de travail des 131 postes « à vérifier ». |
| TODO-LOGIC-013 | Fournisseurs : conditions tarifaires (T-LOG-43) | ✅ CORRIGÉ (19/10) — module `src/lib/fournisseurs/conditions.ts` (11 tests) + écran « Conditions tarifaires » (migration `0024` à appliquer). |
| TODO-LOGIC-014 | Livraisons : matériau rattaché au BPU / DQE (T-LOG-44)            | 🔜 À FAIRE |

---

## TODO-LOGIC-001 — Indicateurs de la section 5 jamais appelés par les écrans (BUG-005)

- **Zone** : logique (calculs).
- **État** : CORRIGÉ — voir commits `8bd0a52`, `994c2ed`.
- **Intégré**
  1. ✅ `ChantierAvancement` appelle `avancementPoste` (5.1) et
     `avancementPhysiqueGlobal` (5.2). Intégré dans la page détail du chantier.
  2. ✅ `ecartQuantite` (5.1) affiché par poste avec alerte si dépasse
     `seuil_ecart_pct` (RG-07 / NOT-01).
  3. ✅ `avancementFinancier` (5.3) affiché en carte stat globale.
  4. ✅ `ecartBudgetaire` (5.5) utilisé dans la page coûts.
  5. ✅ `joursEcartDelai` (5.4) affiché dans la page planning (carte stat).
  6. ✅ 5.6 `rendementEngin` et 5.7 `tauxDisponiteEngin` affichés dans la
     liste des engins du journal (avec les heures de marche, la quantité
     produite et les heures prévues saisissables).
  7. ✅ 5.10 `indicePerformanceCoût` (CPI) et 5.11 `indicePerformanceDelai`
     (SPI) : la page coûts les affiche et `calculValeurAcquise` appelle
     désormais ces deux formules de référence.
- **Priorité** : haute (exigence M).

---

## TODO-LOGIC-002 — validerBasePrix jamais appelée lors de l’import (BUG-006)

- **Zone** : logique (import / validation des données).
- **État** : CORRIGÉ — la règle REF-04 passe maintenant par un point de repère
  unique, `validerBasePrix` (`src/lib/import/regles.ts`, réexporté par
  `src/lib/import/basePrix.ts`).
  1. ✅ L’import Excel / CSV du référentiel (`analyserImportReferentiel`,
     `src/lib/referentiel/prix.ts`) appelle `validerBasePrix` : une ligne sans
     source ou sans date de source est rejetée, avec le message de la règle
     (« la ligne est sans source » / « la ligne est sans date de source »).
  2. ✅ Test automatique dans `src/lib/referentiel/__tests__/prix.test.ts`
     (le motif du rejet vient bien de `validerBasePrix`).
  3. ✅ La règle vit dans un module sans dépendance (`regles.ts`) : elle est
     utilisable par tous les chemins d’import, sans charger la bibliothèque
     Excel.
- **Priorité** : moyenne (import des données déjà fonctionnel, mais les
  prix sans source doivent être identifiés).

---

## TODO-LOGIC-003 — estConforme jamais appelée dans la page qualité (BUG-007)

- **Zone** : logique (validation qualité).
- **État** : CORRIGÉ — `estConforme` est appelé par la page qualité.
  1. ✅ `src/app/chantiers/[id]/qualite/page.tsx` appelle `estConforme`
     (`src/lib/calculs/qualite.ts`) pour chaque essai saisi (valeur mesurée,
     valeur exigée, tolérances +/−).
  2. ✅ Le résultat pilote l’affichage « Conforme / NON CONFORME » et la
     création automatique de la fiche de non-conformité (RG-04).
- **Priorité** : faible (le calcul de tolérance est déjà correct en interne).

---

## TODO-LOGIC-004 — Date de fin prévue du planning copiée de la date de début (BUG-008)

- **Zone** : logique (module planning).
- **État** : CORRIGÉ — voir commit `8bd0a52`.
- **Corrigé**
  1. ✅ `date_prevue_fin` calculé comme `date_prevue_debut + durée`
     (en jours) lors de l'ajout d'une tâche (ligne ~221).
  2. ✅ La date est stockée en base et utilisée comme entrée du PERT.
- **Priorité** : moyenne.

---

## TODO-LOGIC-005 — Isolation multitenant non fonctionnelle (BUG-009)

- **Zone** : logique (accès aux données par compte).
- **État** : CORRIGÉ côté applicatif — voir commits `8b16bbd`, `ce17b03`.
  Vérification RLS côté base documentée (`supabase/RLS_MANUAL_CHECK.md`).
- **Corrigé (applicatif)**
  1. ✅ Filtrer les requêtes par propriétaire : `.eq("proprietaire_id", user.id)`
     ajouté dans les pages `/`, `/chantiers`, `/chantiers/[id]` et composant
     ChantierStatut, plus les pages enfant.
- **À vérifier côté base (Supabase)**
  2. ⏳ Exécuter les commandes SQL dans `supabase/RLS_MANUAL_CHECK.md` pour
     vérifier que `relrowsecurity = true`, que les fonctions
     `user_can_access_chantier` / `user_can_manage_chantier` existent et
     que les politiques sont présentes.
- **Priorité** : haute (risque de fuite de données entre comptes).

---

## TODO-LOGIC-006 — Plans de contrôle qualité : logique de création (T-LOG-36)

- **Zone** : logique + base (qualité). Amélioration issue de l'audit métier du 19/10/2026 — pas de bug associé dans `BUGS.md`.
- **Constaté (test ingénieur)** : la table `plans_controle` n'est que **lue** par l'écran Qualité ; aucun moyen d'en créer un. Sans plan de contrôle, impossible de saisir un essai (QUA-02) ni de déclencher la fiche de non-conformité automatique (RG-04).
- **À faire**
  1. Fonctions lecture / création / modification d'un plan de contrôle (`parametre`, `valeur_exigee`, `tolerance_plus`, `tolerance_moins`, `unite`).
  2. Modèles par type d'ouvrage (route / bâtiment) : épaisseur, dévers, compacité, slump, résistance du béton, implantation (QUA-01).
  3. Migration idempotente si une colonne ou une politique manque (à faire appliquer par l'utilisateur).
  4. Tests automatiques (création, validation des valeurs, modèles fournis).
- **Suite** : écran **T-UI-22** (Session 1), à brancher après cette tâche.
- **Priorité** : **haute — bloquante métier** (module Qualité inutilisable).

---

## TODO-LOGIC-007 — Enregistrer un devis : table + logique (T-LOG-37)

- **Zone** : logique + base (devis). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : le calculateur affiche un total exact (230 120 800 FCFA vérifiés) mais **aucun bouton Enregistrer / Exporter / Imprimer** — le devis disparaît dès qu'on quitte la page. Aucune table `devis` n'existe (seule `devis_fournisseurs` existe, phase 4).
- **À faire**
  1. Nouvelle migration : table `devis` + table `devis_lignes` (client, numéro, date, chantier ; lignes : désignation, unité, quantité, prix unitaire, total) + politiques d'accès par propriétaire.
  2. Fonctions : composer / enregistrer / relire un devis, total, export des données (PDF / Excel côté logique).
  3. Tests automatiques (total, montants FCFA sans décimale, relecture).
- **Suite** : écran **T-UI-23** (Session 1), à brancher après cette tâche ; migration à appliquer par l'utilisateur.
- **Priorité** : **haute** (« faire des devis » est le cœur du besoin).

---

## TODO-LOGIC-008 — Planning : liens entre les tâches (T-LOG-38)

- **Zone** : logique + base (planning). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : la table `dependances_planning` existe mais **aucune tâche n'a de prédécesseur** : tout démarre à J0 et le « chemin critique » se réduit à la tâche la plus longue (20 j sur 6 tâches). Pas de planning réaliste (décapage → remblai → base → revêtement).
- **À faire**
  1. Fonctions : ajouter / supprimer un lien finition-début, refuser les cycles, recalculer le chemin critique (PLA-01, PLA-02).
  2. Brancher le PERT existant (`src/lib/calculs/pert.ts`) sur les liens réels.
  3. Édition / suppression d'une tâche (aujourd'hui : ajouter et cocher « terminé » seulement).
  4. Tests automatiques (liens, cycle refusé, ES/EF, marges, chemin critique).
- **Suite** : écran **T-UI-24** (Session 1).
- **Priorité** : **haute** (le chemin critique affiché est faux).

---

## TODO-LOGIC-009 — Rapport complet : agrégats + export (T-LOG-39)

- **Zone** : logique + exports (rapports). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : le rapport ne contient que **8 chiffres** — ni détail des journaux (météo, effectifs, engins, incidents), ni photos, ni non-conformités, ni dépenses par catégorie. « Coût réalisé » (valorisation du DQE) et « Dépenses » (argent dépensé) sont deux notions différentes aux noms trop proches.
- **À faire**
  1. Agrégats : journaux de la période, dépenses par catégorie, non-conformités ouvertes / clôturées, photos (vignettes), comparaison délai (retard / avance).
  2. Libellés : « Valorisation travaux » (quantités × prix) et « Dépenses réelles » — les croiser.
  3. Export PDF / Excel du rapport (REP-02, REP-03).
  4. Tests automatiques des agrégats.
- **Suite** : écran **T-UI-25** (Session 1).
- **Priorité** : moyenne.

---

## TODO-LOGIC-010 — BPU : incohérences de prix, doublons et unités (T-LOG-40)

- **Zone** : base + logique (BPU, fournisseurs). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : après le nettoyage 443 → 289 postes, des lignes très proches subsistent (enrobé à 95 000, 98 000 et **35 000 FCFA/t** ; latérite 40 000 en deux unités) — risque de choisir la mauvaise ligne dans un devis. *(Les conditions tarifaires fournisseurs font l'objet de TODO-LOGIC-013.)*
- **État mesuré directement en base** (`bpu_postes`, 289 lignes) — la liste de travail exacte :
  1. **Enrobé : 35 000 vs 95 000 FCFA/t** — `MAT-008` « Enrobé à chaud » 35 000/**tonne** marqué **valide** ; `BIT-02` et `ENR-01` à 95 000/**t** marqués « à vérifier ». **63 % d'écart sur le poste le plus cher de la route**, et c'est la ligne « valide » qui est la moins crédible.
  2. **Vrai doublon** : `MAT-001` « Ciment CPJ 42,5 - sac 50kg » 4 500/**sac** (valide) et `MB-02` « Ciment CPJ 42,5 (sac 50 kg) » 4 800/**sac 50 kg** (à vérifier) — même produit, 300 FCFA d'écart.
  3. **Quasi-doublons à prix identiques** : latérite `LTR-01` 40 000 et `MB-06` 40 000 ; enrobé `BIT-02` 95 000 et `ENR-01` 95 000 (« Enrobé » / « Enrobe »).
  4. **Unités non normalisées** pour un même produit : « tonne » vs « t », « m3 » (95 postes) vs « m³ », « m2 » vs « m² », « sac » vs « sac 50 kg » → le devis prend « le premier poste correspondant » : une unité mal écrite fait manquer le bon prix ou choisir le mauvais.
  5. **131 postes « à vérifier »** sur 289, avec une source générique « Marché ivoirien 2026 (estimation) – à vérifier ».
- **À faire**
  1. Fusionner les doublons en conservant la ligne la plus complète (source + date + statut), l'autre passant en « inactif » ou supprimée **après sauvegarde JSON** (outil existant : `scripts/nettoyer-doublons-bpu.mjs`, lecture seule par défaut).
  2. Arbitrer le prix de l'enrobé (35 000 contre 95 000) : obtenir une source datée ou repasser le poste en « à vérifier » — **ne pas trancher seul**.
  3. Normaliser les unités (`t`, `m3`, `m2`, `sac 50 kg`) avec une table de correspondance si besoin.
  4. Fournir une liste de travail des 131 postes « à vérifier ».
  5. Étendre `scripts/verifier-devis-bpu.mjs` : plus aucun devis ne doit trouver deux prix concurrents pour un même poste.
- **Attention** : aucune suppression sans sauvegarde et sans accord de l'utilisateur.
- **Suite** : écran **T-UI-27** (colonne « Date de source »).
- **Priorité** : **haute** (un devis d'enrobé sous-précé de 63 % n'est pas défendable).

---

## TODO-LOGIC-011 — Calculateur de murs : prix dans la bonne unité + montants sans décimale (T-LOG-41)

- **Zone** : logique (calculateurs de métré). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : les **volumes sont exacts** (mur 20 × 3 m, ép. 0,20 → 60 m² brut, 57 m² net, 11,4 m³, 1 497 blocs, mortier 0,382 m³, ciment 107 kg, sable 0,306 m³) mais le **prix du sac de ciment est appliqué à des kilos** : 107 kg × 4 800 = **513 516 FCFA** affichés au lieu de 2,14 sacs × 4 800 = **10 272 FCFA** (soit **×50** ; sur le mur de 400 m² : 3 472 896 au lieu de 69 458). Le total est aussi affiché **avec des décimales** (« 9 662 799,56 FCFA ») alors que RG-06 impose des montants en FCFA **sans décimale**, et les volumes utilisent le point décimal anglais (« 4.750 m³ »).
- **État** : CORRIGÉ — module pur testé `src/lib/calculs/mur.ts` (16 tests),
  branché sur l'écran `/calculateurs/mur`.
  1. ✅ La quantité est convertie dans l'unité du prix du BPU avant de
     multiplier (`normaliserUnite`, `convertirQuantite`, `choisirQuantite`) :
     ciment au sac de 50 kg, sable au m³ ou à la tonne, enduit au m² / kg / sac,
     agglos à l'unité, au m² ou au m³.
  2. ✅ Chaque poste et le total sont arrondis à l'entier (`arrondirFcfa`).
  3. ✅ Format français : virgule décimale, « m³ » / « m² ».
  4. ✅ Un poste dont l'unité de prix est incompatible est signalé
     (« unité incompatible ») et n'est pas chiffré de travers.
  5. ✅ Tests avec les cas de recette : mur 20 × 3 × 0,20 (60 m² bruts,
     57 m² nets, 11,4 m³, 1 497 blocs, mortier 0,382 m³, 106,98 kg de ciment)
     et mur de 400 m² → ciment **69 458 FCFA** (au lieu de 3 472 896).
- **Suite** : écran **T-UI-26** → ✅ fait.
- **Priorité** : **haute** (un devis de mur part avec un total faux).

---

## TODO-LOGIC-012 — Base de prix : date de source obligatoire + lien avec le Référentiel (T-LOG-42)

- **Zone** : base + logique (référentiel de prix). Amélioration issue de l'audit métier du 19/10/2026.
- **État mesuré directement en base (précis, 19/10/2026)** :
  - Les colonnes **`date_source` et `date_validite` existent déjà** dans `bpu_postes` et sont **renseignées sur les 289 lignes** (14/10, 15/10, 16/10/2026). **Aucune migration n'est donc nécessaire** : le correctif porte sur l'**affichage** (colonne « Date de source ») et sur la **saisie** (champ date obligatoire dans le formulaire d'ajout, comme le refus d'un prix sans date dans l'import REF-05).
  - **`referentiel_prix` = 0 ligne** et **`historique_prix` = 0 ligne** : les 289 prix ne vivent que dans `bpu_postes`. Le Référentiel (historique REF-03, import/export REF-05) n'a jamais été alimenté → « Exporter CSV (0) » est normal.
- **État** : CORRIGÉ — module pur testé `src/lib/referentiel/alignement.ts`
  (12 tests), branché sur la page `/bpu` + script
  `scripts/synchroniser-referentiel.mjs`.
  1. ✅ **Date de source obligatoire à la saisie** : champ date dans le
     formulaire de la base de prix (obligatoire), statut déduit de la source
     **et** de la date (« valide » seulement si les deux sont présentes —
     même règle que le refus d'un prix sans date dans l'import REF-05) et
     colonne « Date de source » affichée en JJ/MM/AAAA.
  2. ✅ **Référentiel alimenté** : bouton « Reprendre dans le référentiel »
     (reconnaissance par code puis par désignation + unité, création des prix
     absents, mise à jour des prix modifiés **avec trace dans l'historique
     REF-03**) ; les prix sans source ni date ne sont pas repris (REF-04).
     **Appliqué en base le 19/10** : le référentiel est passé de **0 à 289
     prix** (script `scripts/synchroniser-referentiel.mjs --appliquer`,
     idempotent) — l'export CSV et l'import REF-05 sont de nouveau
     opérationnels.
  3. ✅ **Liste de travail** des 131 postes « à vérifier » : bouton de filtre
     « À vérifier » + encart listant les postes du plus cher au moins cher
     (ceux qui pèsent le plus sur un devis). Le champ de recherche, présent
     dans le code mais affiché nulle part, est rétabli.
  4. ✅ Tests automatiques (refus d'un prix sans date, reconnaissance, mise à
     jour, historique REF-03, tri de la liste de travail).
- **Suite** : écran **T-UI-27** → fait (recherche, filtres, date de source,
  synchronisation, liste de travail).
- **Priorité** : **haute** (traçabilité des prix — exigence M).

---

## TODO-LOGIC-013 — Fournisseurs : conditions tarifaires (T-LOG-43)

- **Zone** : logique + base (fournisseurs). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : le module fournisseurs fonctionne (liste, filtres par type, formulaire complet) mais **aucune section « conditions tarifaires »** : la table `devis_fournisseurs` n'est utilisée par aucun écran → impossible de saisir une offre, de comparer deux offres sur un même poste ou de tracer le choix motivé (FOU-03, FOU-04).
- **État** : CORRIGÉ — module pur testé `src/lib/fournisseurs/conditions.ts`
  (11 tests) + écran « Conditions tarifaires » dans `/fournisseurs`.
  1. ✅ **Saisie des offres** (FOU-03) : poste, prix unitaire, unité, délai
     de livraison, conditions, date du devis, chantier facultatif.
  2. ✅ **Comparaison** des offres d'un même poste : tri par prix croissant,
     meilleure offre, offre la plus rapide, écart de prix en %.
  3. ✅ **Choix motivé et tracé** (FOU-04) : le motif est obligatoire pour
     retenir une offre ; l'offre retenue est signalée et son motif affiché.
     Les offres hors validité (validité annoncée par le fournisseur) sont
     signalées.
  4. ✅ **Propagation du prix retenu** vers la base de prix (source = devis du
     fournisseur, date = date du devis, REF-04) et vers le référentiel avec
     trace dans l'historique (REF-03).
  5. ✅ Migration `0024` : colonne `unite` sur `devis_fournisseurs` et accès
     aux offres sans chantier (fournisseur propriétaire) — **à exécuter dans
     Supabase** (sans elle, l'unité n'est pas enregistrée et une offre
     générale reste invisible ; l'écran reste utilisable).
- **Suite** : écran **T-UI-28** → fait.
- **Priorité** : moyenne.

---

## TODO-LOGIC-014 — Livraisons : matériau rattaché au BPU / DQE (T-LOG-44)

- **Zone** : logique + base (stocks). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : le module livraisons fonctionne (comparaison commandé / livré / mis en œuvre, stock théorique = entrées − sorties, seuil d'alerte paramétrable par chantier et par matériau) mais le **matériau est saisi en texte libre** (« Laterite ») → une faute de frappe (« Latérite », « LAT-01 ») crée une deuxième ligne de stock et un seuil d'alerte qui ne s'applique plus.
- **À faire**
  1. Liste des matériaux alimentée par le **BPU** et/ou les **postes du DQE** du chantier (désignation + unité, recherche).
  2. Seuils d'alerte rattachés au même identifiant matériau (et non à une chaîne libre).
  3. Reprise des livraisons existantes (chaîne libre → identifiant matériau) sans perte de données.
  4. Tests automatiques (stock théorique, écart, surconsommation, seuil).
- **Suite** : écran **T-UI-29** (Session 1).
- **Priorité** : moyenne.

---

*Fin de TODO_LOGIQUE.md.*
