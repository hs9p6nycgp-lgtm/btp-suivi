# BUGS — Suivi des anomalies constatées lors des tests

Ce fichier récapitule **tous** les bugs rencontrés pendant les tests
(scénario complet : compte, chantier, import, saisie, calcul d’écart,
alerte, calculs avec les données de démo).

Chaque entrée contient : numéro, écran, étapes pour le reproduire,
résultat attendu, résultat obtenu, et zone concernée (UI ou logique).
Les bugs d’affichage sont détaillés ici puis listés dans `TODO_UI.md`.
Les bugs de calcul ou de base de données sont détaillés ici puis
listés dans `TODO_LOGIQUE.md`.

| N°        | Zone        | Description courte                                        |
|-----------|-------------|----------------------------------------------------------|
| BUG-001   | UI          | Icône « Aucune alerte en cours » en vert                 |
| BUG-002   | UI          | Drapeau « English » incorrect dans la Sidebar            |
| BUG-003   | UI          | Libellé « Total items » identique en FR/EN              |
| BUG-004   | UI          | Boutons « Supprimer » sans effet sur le journal           |
| BUG-005   | logique     | Indicateurs de la section 5 jamais appelés par les écrans |
| BUG-006   | logique     | validerBasePrix jamais appelée lors de l’import         |
| BUG-007   | logique     | estConforme jamais appelée dans la page qualité          |
| BUG-008   | logique     | Date de fin prévue du planning copiée de la date de début |
| BUG-009   | logique     | Isolation multitenant non fonctionnelle                 |

---

## BUG-001 — Icône « Aucune alerte en cours » affichée en vert

- **Écran** : Accueil — section « Alertes en cours » (page `/`, fichier `src/app/page.tsx`).
- **Zone** : UI (affichage).
- **Étapes pour reproduire**
  1. Se connecter avec un compte authentifié.
  2. Ouvrir la page d’accueil (`/`).
  3. S’assurer qu’aucune alerte ni aucune non-conformité n’est ouverte.
- **Résultat attendu** : le message « Aucune alerte en cours. » est accompagné
  d’une icône neutre (gris/muted), cohérente avec l’absence d’alerte.
- **Résultat obtenu** : l’icône `<TriangleAlert>` porte la classe
  `text-success` (vert). Cette classe est réservée aux cas de succès
  (« conformité », « écart budgétaire négatif »…), pas au cas d’absence
  d’alerte. L’icône apparaît donc en vert alors qu’aucun problème n’est
  signalé.
- **Référence de code** : `src/app/page.tsx`, ligne 450.

---

## BUG-002 — Drapeau « English » incorrect dans la Sidebar

- **Écran** : Navigation latérale (Sidebar, `src/components/layout/Sidebar.tsx`).
- **Zone** : UI (affichage).
- **Étapes pour reproduire**
  1. Se connecter avec un compte authentifié.
  2. Observer le bas de la barre latérale : le bouton de changement de langue
     affiche le libellé de la langue vers laquelle on va se rendre
     (« English » quand la langue française est active).
  3. Comparer le drapeau affiché avec la signification habituelle de ce libellé.
- **Résultat attendu** : le drapeau « English » doit être celui du Royaume-Uni
  (🇬🇧). De même, le libellé en anglais (« Français ») utilise le drapeau
  de France (🇫🇷), ce qui est correct.
- **Résultat obtenu** : le bouton affiche « 🇫🇧 English ». Le drapeau 🇫🇧
  est le drapeau du Bénin (code pays `bj`), pas celui de l’anglais.
  Le symbole est donc erroné.
- **Référence de code** : `src/components/layout/Sidebar.tsx`, ligne 152.

---

## BUG-003 — Libellé « Total items » identique en français et en anglais (page BPU)

- **Écran** : Base de prix — page `/bpu` (`src/app/bpu/page.tsx`).
- **Zone** : UI (libellé).
- **Étapes pour reproduire**
  1. Ouvrir la page `/bpu` avec la langue française active (défaut).
- **Résultat attendu** : les libellés de l’interface sont bilingues : le titre
  de la carte doit être en français, par exemple « Total des postes ».
- **Résultat obtenu** : le titre de la carte est
  `langue === "fr" ? "Total items" : "Total items"` — les deux branches sont
  identiques (copié-collé). L’interface affiche « Total items » dans les
  deux langues.
- **Référence de code** : `src/app/bpu/page.tsx`, ligne 125.

---

## BUG-004 — Boutons « Supprimer » sans effet sur le journal de chantier

- **Écran** : Journal de chantier — page d’un journal
  (`/chantiers/[id]/journaux/[journalId]`, fichier `src/app/chantiers/[id]/journaux/[journalId]/page.tsx`).
- **Zone** : UI (comportement).
- **Étapes pour reproduire**
  1. Ouvrir la liste des journaux d’un chantier et ouvrir un journal dont le
     statut est « Brouillon » (modifiable).
  2. Dans la page du journal, cliquer sur « Supprimer » :
     - dans la liste des **effectifs** (ligne ~241) ;
     - dans la liste des **engins** (ligne ~262) ;
     - dans la liste des **incidents** (ligne ~289) ;
     - dans la liste des **quantités réalisées** (ligne ~318).
- **Résultat attendu** : le retrait de la ligne concernée est bien enregistré
  (et la liste est mise à jour).
- **Résultat obtenu** : le clic ne déclenche aucune action : les quatre
  boutons n’ont aucun gestionnaire d’événement (`onClick` manquant ou vide,
  `onClick={() => { }}`). La ligne reste dans la liste.
- **Référence de code** : `src/app/chantiers/[id]/journaux/[journalId]/page.tsx`,
  lignes 241, 262, 289, 318.

---

## BUG-005 — Indicateurs de la section 5 jamais appelés par les écrans

- **Écran** : principalement la page du chantier
  (`/chantiers/[id]`, composant `ChantierAvancement`,
  `src/components/ChantierAvancement.tsx`), la page des coûts
  (`/chantiers/[id]/couts`) et la page planning
  (`/chantiers/[id]/planning`).
- **Zone** : logique (calculs).
- **Contexte** : `src/lib/calculs/metre.ts` définit les indicateurs de la
  section 5 du cahier des charges (indicateurs 5.1 à 5.11), avec leurs
  formules exactes et des tests unitaires
  (`src/lib/calculs/__tests__/metre.test.ts`). Parmi eux :
  5.1 `ecartQuantite` (écart de quantité en %), 5.2 `avancementPhysiqueGlobal`,
  5.3 `avancementFinancier`, 5.4 `joursEcartDelai` (écart de délai),
  5.5 `ecartBudgetaire`, 5.6 `rendementEngin`, 5.7 `tauxDisponiteEngin`,
  5.9 `margeTotaleTache` (marge PERT), 5.10 `indicePerformanceCoût`,
  5.11 `indicePerformanceDelai`.
- **Étapes pour reproduire**
  1. Ouvrir la page d’avancement d’un chantier avec au moins un poste
     du DQE et des quantités réalisées partielles.
  2. Ouvrir la page planning d’un chantier avec des tâches en PERT.
  3. Ouvrir la page coûts d’un chantier avec des dépenses réelles.
- **Résultat attendu**
  - **5.1** : l’écart de quantité (`(Qréelle − Qprévue) / Qprévue × 100`)
    est affiché par poste, et comparé au seuil paramétrable du chantier
    (`seuil_ecart_pct`, exigence RG-07/NOT-01) ; le dépassement déclenche
    une alerte.
  - **5.3** : l’avancement financier
    (`Montant réalisé / montant du marché × 100`) est affiché.
  - **5.4** : l’écart de délai (en jours) entre la date prévue et la
    date contractuelle est affiché.
  - **5.6 / 5.7** : le rendement d’un engin et le taux de disponibilité
    sont affichés.
  - **5.9 / 5.10 / 5.11** : la marge totale d’une tâche PERT, et les
    indices de performance coût et de délai, sont affichés.
  - Seul l’indicateur **5.8** (`tauxConformite`, conforme aux essais)
    est utilisé par la page qualité ; les autres ne le sont pas.
- **Résultat obtenu** (CORRIGÉ — voir commits `8bd0a52`, `994c2ed`)
  - **5.1** : `ecartQuantite` appelé dans `ChantierAvancement` ; écart de quantité
    affiché par poste avec alerte si dépasse le seuil `seuil_ecart_pct`.
  - **5.2** : `avancementPhysiqueGlobal` appelé dans `ChantierAvancement`.
  - **5.3** : `avancementFinancier` appelé dans `ChantierAvancement` (carte stat globale).
  - **5.4** : `joursEcartDelai` appelé dans la page planning (écart vs `date_fin_prevue` du chantier).
  - **5.5** : `ecartBudgetaire` utilisé dans la page coûts pour l'écart par poste.
  - **5.9** : `margeTotaleTache` disponible dans `metre.ts` ; la marge PERT est calculée
    dans la page planning (LS − ES).
  - Les indicateurs 5.6, 5.7, 5.10, 5.11 restent disponibles dans `metre.ts` pour intégration
    ultérieure (priorité S).
  - `tsc --noEmit` et `next build` passent (18 routes).
- **Référence de code** : `src/lib/calculs/metre.ts` (lignes 45–129),
  composant `src/components/ChantierAvancement.tsx`,
  `src/app/chantiers/[id]/couts/page.tsx`,
  `src/app/chantiers/[id]/planning/page.tsx`,
  `src/app/chantiers/[id]/page.tsx` (intégration du composant).

---

## BUG-006 — validerBasePrix jamais appelée lors de l’import du BPU

- **Écran** : Import du Base de prix — page `/bpu` et composant
  `src/components/BasePrixImport.tsx`.
- **Zone** : logique (import / validation).
- **Contexte** : l’exigence **REF-04** — « chaque prix doit avoir une source
  et une date » — est implémentée par la fonction
  `validerBasePrix` dans `src/lib/import/basePrix.ts`
  (lignes 152–169), avec des tests unitaires
  (`src/lib/import/__tests__/basePrix.test.ts`). Elle renvoie `null` si la
  ligne est valide, sinon un message décrivant le problème.
- **Étapes pour reproduire**
  1. Simuler une ligne importée du classeur `Base_prix_CI_v2.xlsx` qui
     n’a **pas de source** renseignée (ou pas de date de source).
  2. Lancer l’import depuis la page `/bpu`.
- **Résultat attendu** : les lignes sans source ou sans date de source sont
  refusées (ou signalées), conformément à l’exigence REF-04.
- **Résultat obtenu** : `validerBasePrix` n’est **jamais appelée** par
  `BasePrixImport.tsx`. L’import construit le champ `source` à partir de
  la colonne du classeur sans vérifier qu’il est présent, et insère
  donc les lignes incomplètes.
- **Référence de code** : `src/components/BasePrixImport.tsx` (appel à
  validerBasePrix absent), définition dans `src/lib/import/basePrix.ts` ligne 163.

---

## BUG-007 — estConforme jamais appelée dans la page qualité

- **Écran** : Qualité — page `/chantiers/[id]/qualite`
  (fichier `src/app/chantiers/[id]/qualite/page.tsx`).
- **Zone** : logique (validation qualité).
- **Contexte** : l’exigence **QUA-02** — la valeur mesurée doit se situer
  dans la fourchette tolérée — est implémentée par la fonction
  `estConforme` dans `src/lib/calculs/qualite.ts`
  (lignes 1–18), avec des tests unitaires
  (`src/lib/calculs/__tests__/qualite.test.ts`).
- **Étapes pour reproduire**
  1. Saisir un contrôle qualité dont la valeur mesurée est hors tolérance.
  2. Enregistrer le contrôle depuis la page qualité.
- **Résultat attendu** : le contrôle est marqué non conforme parce que la
  valeur mesurée est hors de la fourchette de tolérance.
- **Résultat obtenu** : `estConforme` n’est **jamais appelée** dans la page
  qualité. La page calcule la tolérance et le résultat en interne sans
  appeler la fonction partagée ; aucune différence de comportement n’est
  observable, mais le point de repère central de l’exigence n’est pas
  utilisé.
- **Référence de code** : `src/lib/calculs/qualite.ts` ligne 9,
  page qualité `src/app/chantiers/[id]/qualite/page.tsx`.

---

## BUG-008 — Date de fin prévue du planning copiée de la date de début

- **Écran** : Planning — page `/chantiers/[id]/planning`
  (fichier `src/app/chantiers/[id]/planning/page.tsx`).
- **Zone** : logique (module planning).
- **Étapes pour reproduire**
  1. Créer une tâche avec une date de début (ex. 20/10/2026) et une
     durée (ex. 10 jours).
- **Résultat attendu** : la date de fin prévue doit être calculée à partir
  de la date de début + la durée (soit le 30/10/2026). Cette date est
  une entrée du calcul PERT (ES / EF / LS / LF).
- **Résultat obtenu** : la valeur enregistrée pour `date_prevue_fin` est la
  même date que `date_prevue_debut` :
  `date_prevue_fin: dateDebutTache ? new Date(dateDebutTache).toISOString() : null`
  ne prend pas en compte la durée de la tâche.
- **Référence de code** : `src/app/chantiers/[id]/planning/page.tsx`, ligne 217.

---

## BUG-009 — Isolation multitenant non fonctionnelle

- **Écran** : toutes les pages affichant des données de chantiers
  (tableau de bord `/`, liste des chantiers, pages chantier, planning,
  qualité, journaux, coûts…).
- **Zone** : logique (accès aux données par compte).
- **Contexte** : la base de données définit, dans
  `supabase/migrations/0007_phase3_multitenant_isolation.sql`, des
  politiques RLS et les fonctions `user_can_access_chantier` /
  `user_can_manage_chantier` (un chantier est visible par son propriétaire
  ou par les membres inscrits). Le champ `proprietaire_id` permet pourtant
  d’identifier le compte propriétaire.
- **Étapes pour reproduire**
  1. Se connecter avec le compte A et créer un chantier
     (il devient visible par le compte A).
  2. Se connecter avec le compte B et ouvrir la liste des chantiers
     (page `/chantiers`) et le tableau de bord (`/`).
  3. Vérifier ce que compte B peut voir.
- **Résultat attendu** : compte B ne voit que les chantiers qui lui sont
  accessibles (les siens, et les chantiers dont il est membre) ; il ne voit
  jamais les chantiers des autres comptes.
- **Résultat obtenu** (vérifié expérimentalement le 16/10/2026)
  - Aucun appel à `auth.uid()` n’existe dans le code :
    `src/app/page.tsx` (ligne 210), `src/app/chantiers/page.tsx` (ligne 61),
    `src/app/chantiers/[id]/page.tsx` (ligne 72), `src/components/ChantierStatut.tsx`
    (ligne 31), etc. toutes les requêtes lisent toutes les lignes visibles
    côté base.
  - La base de données n’applique pas les politiques RLS : les deux comptes
    voient l’ensemble des chantiers, y compris ceux créés par l’autre compte.
    (Exemple observé : compte B voyait le chantier « Chantier TEST isolation
    A », créé par le compte A ; et inversement. Un chantier sans
    proprietaire (`proprietaire_id` NULL) était visible de tous.)
  - **Correctif applicatif appliqué** : filtre `proprietaire_id` ajouté sur
    le tableau de bord, la liste des chantiers, la page de détail et les pages
    enfant (qualité, planning, journaux, coûts, livraisons, métré), ainsi que
    la mise à jour du statut. La vérification RLS côté base reste à faire
    (voir `supabase/RLS_MANUAL_CHECK.md`).
- **Référence de code** : requêtes dans `src/app/page.tsx`,
  `src/app/chantiers/page.tsx`, `src/app/chantiers/[id]/page.tsx`,
  `src/components/ChantierStatut.tsx` ;
  politiques dans `supabase/migrations/0007_phase3_multitenant_isolation.sql`.

---

*Fin de BUGS.md — à compléter au fil des nouvelles vérifications.*
