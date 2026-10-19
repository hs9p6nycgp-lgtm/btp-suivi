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
- **À corriger**
  1. Faire appeler `estConforme` (`src/lib/calculs/qualite.ts`, ligne 9)
     depuis la page qualité
     (`src/app/chantiers/[id]/qualite/page.tsx`), afin d’utiliser le point
     de repère central de l’exigence QUA-02.
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

## TODO-LOGIC-010 — BPU : finir le dédoublonnage + conditions fournisseurs (T-LOG-40)

- **Zone** : base + logique (BPU, fournisseurs). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : après le nettoyage 443 → 289 postes, des lignes très proches subsistent (enrobé à 95 000, 98 000 et **35 000 FCFA/t** ; latérite 40 000 en deux unités) — risque de choisir la mauvaise ligne dans un devis. La table `devis_fournisseurs` (conditions tarifaires) n'est utilisée par aucun écran.
- **À faire**
  1. Finir le dédoublonnage (même désignation + même unité) ; sauvegarde JSON avant toute suppression ; vérifier les prix aberrants (enrobé 35 000 FCFA/t).
  2. Rendre `devis_fournisseurs` exploitable par la logique (lecture des conditions, comparaison FOU-03 / FOU-04).
  3. Script de vérification (`scripts/verifier-devis-bpu.mjs`).
- **Priorité** : moyenne.

---

## TODO-LOGIC-011 — Calculateur de murs : prix dans la bonne unité + montants sans décimale (T-LOG-41)

- **Zone** : logique (calculateurs de métré). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : les **volumes sont exacts** (mur 20 × 3 m, ép. 0,20 → 60 m² brut, 57 m² net, 11,4 m³, 1 497 blocs, mortier 0,382 m³, ciment 107 kg, sable 0,306 m³) mais le **prix du sac de ciment est appliqué à des kilos** : 107 kg × 4 800 = **513 516 FCFA** affichés au lieu de 2,14 sacs × 4 800 = **10 272 FCFA** (soit **×50** ; sur le mur de 400 m² : 3 472 896 au lieu de 69 458). Le total est aussi affiché **avec des décimales** (« 9 662 799,56 FCFA ») alors que RG-06 impose des montants en FCFA **sans décimale**, et les volumes utilisent le point décimal anglais (« 4.750 m³ »).
- **À faire**
  1. Convertir la quantité dans l'unité du prix du BPU avant de multiplier (ciment : kg → sacs de 50 kg ; même règle pour tout poste dont l'unité diffère).
  2. Arrondir chaque poste et le total à l'entier (FCFA sans décimale).
  3. Format français : virgule décimale, unité « m³ ».
  4. Tests automatiques avec les cas de recette (mur 20 × 3 × 0,20 et 10 × 2,5 × 0,20) + un test « unité de prix ≠ unité de quantité ».
- **Suite** : écran **T-UI-26** (Session 1).
- **Priorité** : **haute** (un devis de mur part avec un total faux).

---

## TODO-LOGIC-012 — Base de prix : date de source obligatoire + lien avec le Référentiel (T-LOG-42)

- **Zone** : base + logique (référentiel de prix). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : 289 postes, dont **158 « valides » et 131 « à vérifier »** ; **aucune date de source** (ni colonne, ni champ à la saisie) alors que l'exigence REF-04 impose « source **et date** » ; et la page **Référentiel de prix est vide (0 prix)** alors que la base de prix en compte 289 → deux bases distinctes, historique REF-03 et import/export REF-05 inopérants, « Exporter CSV (0) » sans contenu.
- **À faire**
  1. Rendre la **date de source obligatoire** à l'enregistrement et à la lecture (un prix sans date est refusé, comme dans l'import REF-05).
  2. Aligner la base de prix sur le **Référentiel** (une seule source de vérité) — ou les brancher explicitement (propagation des prix + historique).
  3. Fournir une liste de travail des **131 postes « à vérifier »** (tri par importance).
  4. Tests automatiques (refus d'un prix sans date, propagation, historique REF-03).
- **Suite** : écran **T-UI-27** (Session 1).
- **Priorité** : **haute** (traçabilité des prix — exigence M).

---

## TODO-LOGIC-013 — Fournisseurs : conditions tarifaires (T-LOG-43)

- **Zone** : logique + base (fournisseurs). Amélioration issue de l'audit métier du 19/10/2026.
- **Constaté (test ingénieur)** : le module fournisseurs fonctionne (liste, filtres par type, formulaire complet) mais **aucune section « conditions tarifaires »** : la table `devis_fournisseurs` n'est utilisée par aucun écran → impossible de saisir une offre, de comparer deux offres sur un même poste ou de tracer le choix motivé (FOU-03, FOU-04).
- **À faire**
  1. Fonctions d'enregistrement / lecture des conditions tarifaires (fournisseur, poste, prix unitaire, unité, date de validité, référence du devis).
  2. Comparaison de plusieurs offres pour un même poste, avec **choix motivé et trace de la décision** (FOU-04).
  3. Propagation du prix retenu vers la base de prix / le devis (comme le référentiel).
  4. Tests automatiques (comparaison, tri par prix, traçabilité du choix).
- **Suite** : écran **T-UI-28** (Session 1).
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
