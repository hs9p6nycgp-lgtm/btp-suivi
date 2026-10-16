# TACHES — Tableau de bord du projet BTP Suivi Pro

## Règles de fonctionnement (AGENTS.md)

- **Un propriétaire unique par tâche** :
  - Session 1 : apparence (`src/components`, `src/app`)
  - Session 2 : logique et base (`src/lib`, `supabase/`)
  - Session 3 : migrations et déploiements (`supabase/migrations`, déploiement)
  - Session 4 : tests (`BUGS.md`)
- Quand une session termine une tâche, elle la coche ; le manager assigne la suivante.
- Si deux tâches touchent le même fichier, elles sont mises **en séquence, jamais en parallèle**.
- Avant chaque commit, vérifier qu'aucune autre session n'est en cours sur les mêmes fichiers.
- Le manager ne code pas ; il tient à jour ce fichier et répartit les tâches.

---

## À faire

| Réf | Tâche | Propriétaire | Fichiers concernés | Code exigence | Priorité |
|-----|-------|--------------|--------------------|---------------|----------|
| T-UI-01 | Corriger l'icône « Aucune alerte en cours » (vert → neutre) | Session 1 | `src/app/page.tsx` (ligne ~450) | BUG-001 | faible | Terminé (déjà dans le code) |
| T-UI-02 | Corriger le drapeau « English » (🇫🇧 → 🇬🇧) dans la Sidebar | Session 1 | `src/components/layout/Sidebar.tsx` (ligne ~152) | BUG-002 | faible | Terminé (déjà dans le code) |
| T-UI-03 | Corriger le libellé « Total items » identique FR/EN sur la page BPU | Session 1 | `src/app/bpu/page.tsx` (ligne ~125) | BUG-003 | faible | Terminé (déjà dans le code) |
| T-UI-04 | Ajouter les gestionnaires d'événement aux 4 boutons « Supprimer » du journal | Session 1 | `src/app/chantiers/[id]/journaux/[journalId]/page.tsx` (lignes ~241, ~262, ~289, ~318) | BUG-004 | moyenne | Terminé (déjà dans le code) |
| T-LOG-04 | Calculer `date_prevue_fin` = `date_prevue_debut + durée` (planning) | Session 2 (logique) + Session 1 (intégration écrans — séquencer après T-UI sur les mêmes fichiers) | `src/lib/calculs/metre.ts`, `src/components/ChantierAvancement.tsx`, `src/app/chantiers/[id]/couts/page.tsx`, `src/app/chantiers/[id]/planning/page.tsx` | BUG-008 | moyenne | Non (fichier UI — Session 1 attend Session 2) |
| T-MIG-01 | Vérifier et activer les politiques RLS d'isolation multitenant côté base | Session 3 | `supabase/migrations/0007_phase3_multitenant_isolation.sql`, `supabase/RLS_MANUAL_CHECK.md` | BUG-009 | haute |
| T-TEST-01 | Maintenir `BUGS.md` à jour (ajouter les nouveaux bugs, fermer les corrigés) | Session 4 | `BUGS.md` | — | continue |

---

## En cours (avec le nom de la session)

| Réf | Tâche | Session | Fichiers concernés | Démarré le |
|-----|-------|---------|--------------------|------------|
| — | — | — | — | — |

---

## Terminé

| Réf | Tâche | Session | Fichiers concernés | Coché le |
|-----|-------|---------|--------------------|----------|
| T-LOG-01 | Indicateurs section 5 (écart quantité, avancement physique/financier, écart délai, écart budgétaire, rendement engin, disponibilité, conformité, marge PERT, indices de performance) | 2 | `src/lib/calculs/metre.ts`, `src/lib/calculs/qualite.ts` | 16/10/2026 |
| T-LOG-02 | `validerBasePrix` (REF-04 : source + date obligatoires) | 2 | `src/lib/import/basePrix.ts` | 16/10/2026 |
| T-LOG-03 | `estConforme` (QUA-02 : conformité automatique avec tolérance) | 2 | `src/lib/calculs/qualite.ts` | 16/10/2026 |
| T-LOG-05 | Référentiel de prix (REF-01 à REF-09) : tables, historique, propagation, recherche, zones, export CSV | 2 | `supabase/migrations/0011_phase3bis_referentiel_prix.sql`, `src/lib/referentiel/` | 16/10/2026 |
| T-LOG-06 | Module Fournisseurs (FOU-01 à FO-06) : tables, validation, comparaison devis, note fournisseur | 2 | `supabase/migrations/0011_phase4_fournisseurs.sql`, `supabase/migrations/0012_phase4_fournisseurs_conditions.sql`, `src/lib/fournisseurs/` | 16/10/2026 |
| T-LOG-07 | Indicateurs HSE (HSE-03 : taux fréquence, jours sans accident) | 2 | `src/lib/hse/` | 16/10/2026 |
| T-LOG-08 | Alertes stock bas (APP-04) | 2 | `src/lib/stock/` | 16/10/2026 |
| T-LOG-09 | Rappels éprouvettes béton (QUA-04 : 7/14/28 jours) | 2 | `src/lib/qualite/epreuves.ts` | 16/10/2026 |
| T-LOG-10 | Améliorations (S) : rotations engins, courbe en S, projection coût final, stock théorique | 2 | `src/lib/calculs/metre.ts` | 16/10/2026 |
| T-LOG-11 | Valeur acquise complète (COU-04 : EV, AC, PV, écarts, indices CPI/SPI) | 2 | `src/lib/calculs/metre.ts` | 16/10/2026 |
| T-LOG-12 | Avenants avec historique (MET-06) | 2 | `src/lib/calculs/metre.ts` | 16/10/2026 |
| T-SEED | Données de départ prix (seed CSV + script idempotent) | 2 | `supabase/seed/prix_ci.csv`, `supabase/seed/load_prix_ci.mjs` | 16/10/2026 |
| T-UI-01 | Corriger l'icône « Aucune alerte en cours » (vert → neutre) | 1 | `src/app/page.tsx` | 16/10/2026 |
| T-UI-02 | Corriger le drapeau « English » (🇫🇧 → 🇬🇧) dans la Sidebar | 1 | `src/components/layout/Sidebar.tsx` | 16/10/2026 |
| T-UI-03 | Corriger le libellé « Total items » identique FR/EN sur la page BPU | 1 | `src/app/bpu/page.tsx` | 16/10/2026 |
| T-UI-04 | Ajouter les gestionnaires d'événement aux 4 boutons « Supprimer » du journal | 1 | `src/app/chantiers/[id]/journaux/[journalId]/page.tsx` | 16/10/2026 |

---

---

## Notes de séquençage (conflits de fichiers)

- `src/app/page.tsx` : touché par T-UI-01 (Session 1) et potentiellement par T-LOG-01 (Session 2) → **séquencer** : T-UI-01 d'abord, puis T-LOG-01.
- `src/app/chantiers/[id]/planning/page.tsx` : touché par T-UI-04 ? Non (c'est le journal). Touché par T-LOG-04 (Session 2, fichier `src/app`) → si Session 1 intervient sur ce même fichier, **séquencer**.
- `supabase/migrations/0007_phase3_multitenant_isolation.sql` : touché par T-MIG-01 (Session 3). Si Session 2 travaille aussi dans `supabase/`, **séquencer**.

---

## Prochaine tâche à assigner

- **Session 1 (apparence)** : aucune tâche en attente (T-UI-01 à T-UI-04 terminées).
- **Session 2 (logique)** : T-LOG-04 (calcul `date_prevue_fin` planning) — à démarrer.
- **Session 3 (migrations/déploiement)** : T-MIG-01 (vérification RLS multitenant) — à démarrer.
- **Session 4 (tests)** : T-TEST-01 (maintenir BUGS.md) — en continu.
