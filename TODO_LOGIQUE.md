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
- **État** : CORRIGÉ — voir commits `8bd0a52`, `994c2ed`.
- **Intégré**
  1. ✅ `ChantierAvancement` appelle `avancementPoste` (5.1) et
     `avancementPhysiqueGlobal` (5.2). Intégré dans la page détail du chantier.
  2. ✅ `ecartQuantite` (5.1) affiché par poste avec alerte si dépasse
     `seuil_ecart_pct` (RG-07 / NOT-01).
  3. ✅ `avancementFinancier` (5.3) affiché en carte stat globale.
  4. ✅ `ecartBudgetaire` (5.5) utilisé dans la page coûts.
  5. ✅ `joursEcartDelai` (5.4) affiché dans la page planning (carte stat).
- **Restant (priorité S)** : 5.6 `rendementEngin`, 5.7 `tauxDisponiteEngin`,
  5.10 `indicePerformanceCoût`, 5.11 `indicePerformanceDelai` — disponibles
  dans `metre.ts` pour intégration ultérieure.
- **Priorité** : haute (exigence M).

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

*Fin de TODO_LOGIQUE.md.*
