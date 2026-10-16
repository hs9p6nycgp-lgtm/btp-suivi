# TODO_LOGIQUE — Bugs de calcul et de base à corriger

Ce fichier liste les bugs de calcul ou de base de données rencontrés
lors des tests. Chaque entrée référencie le bug correspondant dans
`BUGS.md` (BUG-005 à BUG-009) ; les corrections à prévoir y sont
décrites avec le détail.

| Réf  | Description courte                                                    |
|------|---------------------------------------------------------------------|
| TODO-LOGIC-001 | Indicateurs de la section 5 jamais appelés par les écrans          |
| TODO-LOGIC-002 | validerBasePrix jamais appelée lors de l’import                  |
| TODO-LOGIC-003 | estConforme jamais appelée dans la page qualité                   |
| TODO-LOGIC-004 | Date de fin prévue du planning copiée de la date de début        |
| TODO-LOGIC-005 | Isolation multitenant non fonctionnelle                          |

---

## TODO-LOGIC-001 — Indicateurs de la section 5 jamais appelés par les écrans (BUG-005)

- **Zone** : logique (calculs).
- **État** : en cours — `ChantierAvancement` utilise désormais `avancementPoste`
  (5.1) et `avancementPhysiqueGlobal` (5.2) au lieu des formules en interne.
  Les autres indicateurs restent à intégrer.
- **À corriger**
  1. ✅ `ChantierAvancement` appelle `avancementPoste` (5.1) et
     `avancementPhysiqueGlobal` (5.2).
  2. ⏳ Intégrer les indicateurs restants :
     - 5.3 `avancementFinancier` : afficher l’avancement financier ;
     - 5.4 `joursEcartDelai` : afficher l’écart de délai en jours ;
     - 5.6 `rendementEngin` et 5.7 `tauxDisponiteEngin` :
       afficher rendement et disponibilité des engins ;
     - 5.9 `margeTotaleTache` : afficher la marge totale d’une tâche PERT ;
     - 5.10 `indicePerformanceCoût` et 5.11 `indicePerformanceDelai` :
       afficher les indices de performance.
  3. ⏳ `ecartQuantite` (écart de quantité) : afficher l’écart par poste et
     appliquer le seuil `seuil_ecart_pct` (exigence RG-07 / NOT-01) ;
     le seuil n’est toujours lu que pour être affiché.
- **Priorité** : haute (le suivi comparatif prévu/non réalisé est au cœur
  du projet, exigence M).

---

## TODO-LOGIC-002 — validerBasePrix jamais appelée lors de l’import (BUG-006)

- **Zone** : logique (import / validation des données).
- **À corriger**
  1. Appeler `validerBasePrix` (`src/lib/import/basePrix.ts`, ligne 163)
     avant d’insérer chaque ligne du Base de prix.
  2. Bloquer (ou signaler) les lignes sans source ou sans date de source,
     conformément à l’exigence REF-04.
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
- **À corriger**
  1. Calculer `date_prevue_fin` comme `date_prevue_debut + durée`
     (en jours), et non comme une copie de la date de début.
  2. Vérifier que cette date est bien utilisée dans le calcul PERT
     (ES / EF / LS / LF) affiché par la page planning.
- **Priorité** : moyenne.

---

## TODO-LOGIC-005 — Isolation multitenant non fonctionnelle (BUG-009)

- **Zone** : logique (accès aux données par compte).
- **État** : correctif applicatif appliqué (filtre `proprietaire_id` ajouté
  sur le tableau de bord, la liste des chantiers, la page de détail et les
  pages enfant : qualité, planning, journaux, coûts, livraisons, métré,
  ainsi que la mise à jour du statut). Vérification RLS à faire côté base
  (voir `supabase/RLS_MANUAL_CHECK.md`).
- **À corriger**
  1. ✅ Filtrer les requêtes par propriétaire : `.eq("proprietaire_id", user.id)`
     ajouté dans les pages `/`, `/chantiers`, `/chantiers/[id]` et composant
     ChantierStatut, plus les pages enfant.
  2. ⏳ Faire fonctionner les politiques RLS de
     `supabase/migrations/0007_phase3_multitenant_isolation.sql` :
     voir `supabase/RLS_MANUAL_CHECK.md` pour les commandes SQL à exécuter
     dans Supabase (vérifier que `relrowsecurity = true`, que les fonctions
     `user_can_access_chantier` / `user_can_manage_chantier` existent et
     que les politiques sont présentes).
- **Priorité** : haute (risque de fuite de données entre comptes ; chaque
  compte doit n’avoir accès qu’à ses propres chantiers).

---

*Fin de TODO_LOGIQUE.md.*
