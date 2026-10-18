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
| T-MIG-02 | **BLOQUANT** — Appliquer la migration `0015_reparation_colonnes_chantiers.sql` dans le SQL Editor de Supabase (sans quoi la création de chantier échoue toujours). L'utilisateur a choisi de l'appliquer lui-même. Vérification possible avec `node scripts/audit-base.mjs`. | Utilisateur | `supabase/migrations/0015_reparation_colonnes_chantiers.sql` | CHA-01 | Haute |
| T-DATA-01 | Doublons dans `bpu_postes` (154 doublons exacts) : **script prêt** (`supabase/seed/nettoyer_doublons_bpu.sql`) ; **exécution à confirmer** par l'utilisateur (suppression de données) | 2 | `supabase/seed/nettoyer_doublons_bpu.sql` | REF-05 | Moyenne |

---

## En cours (avec le nom de la session)

| Réf | Tâche | Session | Fichiers concernés | Démarré le |
|-----|-------|---------|--------------------|------------|
| — | Aucune tâche en cours | — | — | — |

---

## Terminé

| Réf | Tâche | Session | Fichiers concernés | Coché le |
|-----|-------|---------|--------------------|----------|
| T-UI-01 | Corriger l'icône « Aucune alerte en cours » (vert → neutre) | 1 | `src/app/page.tsx` | 16/10/2026 |
| T-UI-02 | Corriger le drapeau « English » (🇫🇧 → 🇬🇧) dans la Sidebar | 1 | `src/components/layout/Sidebar.tsx` | 16/10/2026 |
| T-UI-03 | Corriger le libellé « Total items » identique FR/EN sur la page BPU | 1 | `src/app/bpu/page.tsx` | 16/10/2026 |
| T-UI-04 | Ajouter les gestionnaires d'événement aux 4 boutons « Supprimer » du journal | 1 | `src/app/chantiers/[id]/journaux/[journalId]/page.tsx` | 16/10/2026 |
| T-LOG-01 | Indicateurs section 5 (écart quantité, avancement physique/financier, écart délai, écart budgétaire, rendement engin, disponibilité, conformité, marge PERT, indices de performance) | 2 | `src/lib/calculs/metre.ts`, `src/lib/calculs/qualite.ts` | 16/10/2026 |
| T-LOG-02 | `validerBasePrix` (REF-04 : source + date obligatoires) | 2 | `src/lib/import/basePrix.ts` | 16/10/2026 |
| T-LOG-03 | `estConforme` (QUA-02 : conformité automatique avec tolérance) | 2 | `src/lib/calculs/qualite.ts` | 16/10/2026 |
| T-LOG-04 | Calculer `date_prevue_fin` = `date_prevue_debut + durée` (planning) | 2 | `src/lib/calculs/pert.ts` (fonction datePrevueFin), intégration écran par Session 1 | 16/10/2026 |
| T-LOG-05 | Référentiel de prix (REF-01 à REF-09) : tables, historique, propagation, recherche, zones, export CSV | 2 | `supabase/migrations/0011_phase3bis_referentiel_prix.sql`, `src/lib/referentiel/` | 16/10/2026 |
| T-LOG-06 | Module Fournisseurs (FOU-01 à FO-06) : tables, validation, comparaison devis, note fournisseur | 2 | `supabase/migrations/0011_phase4_fournisseurs.sql`, `supabase/migrations/0012_phase4_fournisseurs_conditions.sql`, `src/lib/fournisseurs/` | 16/10/2026 |
| T-LOG-07 | Indicateurs HSE (HSE-03 : taux fréquence, jours sans accident) | 2 | `src/lib/hse/` | 16/10/2026 |
| T-LOG-08 | Alertes stock bas (APP-04) | 2 | `src/lib/stock/` | 16/10/2026 |
| T-LOG-09 | Rappels éprouvettes béton (QUA-04 : 7/14/28 jours) | 2 | `src/lib/qualite/epreuves.ts` | 16/10/2026 |
| T-LOG-10 | Améliorations (S) : rotations engins, courbe en S, projection coût final, stock théorique | 2 | `src/lib/calculs/metre.ts` | 16/10/2026 |
| T-LOG-11 | Valeur acquise complète (COU-04 : EV, AC, PV, écarts, indices CPI/SPI) | 2 | `src/lib/calculs/metre.ts` | 16/10/2026 |
| T-LOG-12 | Avenants avec historique (MET-06) | 2 | `src/lib/calculs/metre.ts` | 16/10/2026 |
| T-LOG-13 | Support des types de chantier détaillés en base (`type_detail`) | 2 | `supabase/migrations/0015_reparation_colonnes_chantiers.sql` (renommée), `src/lib/chantiers/types.ts` | 16/10/2026 |
| T-LOG-14 | Diagnostic création de chantier impossible : cause racine = colonnes `longueur/largeur/hauteur` absentes de la base distante ; migration de réparation `0015` + outil d'audit `scripts/audit-base.mjs` | 2 | `supabase/migrations/0015_reparation_colonnes_chantiers.sql`, `scripts/audit-base.mjs` | 18/10/2026 |
| T-LOG-15 | Liste officielle des types détaillés + messages d'erreur base de données explicites | 2 | `src/lib/chantiers/types.ts`, `src/lib/i18n.ts` | 18/10/2026 |
| T-LOG-16 | Devis détaillés : 15 modèles enrichis (matériaux, main d'œuvre, engins), 10 existants détaillés + 5 nouveaux, quantités alignées sur les unités du BPU, validation de couverture BPU | 2 | `src/lib/devis/templates.ts` | 18/10/2026 |
| T-LOG-17 | Tests exécutables : `npm test` opérationnel (imports `.ts` + `tsconfig`), 123 tests verts | 2 | `package.json`, `tsconfig.json`, `src/lib/**/__tests__/` | 18/10/2026 |
| T-LOG-18 | Outils de contrôle : audit de la base distante (colonnes/tables manquantes) + vérification que chaque ligne de devis trouve un poste du BPU (132 lignes vérifiées) | 2 | `scripts/audit-base.mjs`, `scripts/verifier-devis-bpu.mjs` | 18/10/2026 |
| T-LOG-19 | Modélisation 3D des devis : géométrie générée depuis les entrées (15 modèles → boîtes/cylindres prêtes pour three.js, sol à Y=0, mètres) + 18 tests automatiques | 2 | `src/lib/devis/model3d.ts`, `src/lib/devis/__tests__/model3d.test.ts` | 18/10/2026 |
| T-SEED | Données de départ prix (seed CSV + script idempotent) | 2 | `supabase/seed/prix_ci.csv`, `supabase/seed/load_prix_ci.mjs` | 16/10/2026 |
| T-MIG-01 | Vérifier et activer les politiques RLS d'isolation multitenant côté base | 3 | `supabase/migrations/0007_phase3_multitenant_isolation.sql`, `supabase/RLS_MANUAL_CHECK.md` | 16/10/2026 |
| T-TEST-01 | Maintenir `BUGS.md` à jour (ajouter les nouveaux bugs, fermer les corrigés) | 4 | `BUGS.md` | 16/10/2026 |
| T-UI-05 | Refonte esthétique générale : design system (ombres, dégradés, animations), composants UI, navigation (sidebar/topbar/mobile), tableau de bord, chantiers, connexion, détail chantier, BPU, import DQE, en-têtes unifiés | 1 | `src/app/globals.css`, `src/components/ui/*`, `src/components/layout/*`, `src/components/DqeImport.tsx`, `src/components/SignOutButton.tsx`, `src/app/page.tsx`, `src/app/chantiers/page.tsx`, `src/app/chantiers/[id]/page.tsx`, `src/app/login/page.tsx`, `src/app/bpu/page.tsx`, `src/app/fournisseurs/page.tsx`, `src/app/rapports/page.tsx`, `src/app/export/page.tsx`, `src/app/referentiel/page.tsx` | 18/10/2026 |
| T-UI-06 | Formulaire « Nouveau chantier » : champ « Sous-type (phase de travaux) » alimenté par `typesDetaillesPour` (s'adapte au type Route/Bâtiment), enregistré dans `type_detail` ; sous-type affiché dans la fiche chantier et la liste | 1 | `src/app/chantiers/nouveau/page.tsx`, `src/app/chantiers/[id]/page.tsx`, `src/app/chantiers/page.tsx` | 18/10/2026 |
| T-UI-07 | Section « Outils rapides » sur la page d'accueil : cartes « Calcul de devis » et « Calcul de murs » | 1 | `src/app/page.tsx` | 18/10/2026 |

---

## Notes de la Session 1 (refonte esthétique du 18/10/2026)

- La barre latérale affiche désormais **tous** les écrans de navigation (avant : seul l'onglet actif) et un **bouton réduire/étendre** rend le mode compact accessible (mémorisé par navigateur).
- Tableau de bord : la carte « Chantiers » affiche le nombre total (elle dupliquait le nombre « en cours »).
- Mode sombre : les variantes `dark:` suivent maintenant la classe du thème (bouton clair/sombre), et non le réglage système.
- Aucune modification de `src/lib`, ni des migrations, ni des calculs.
- (Suite) « Nouveau chantier » : champ **Sous-type (phase de travaux)** branché sur la liste officielle `src/lib/chantiers/types.ts` (filtrée par type), enregistré dans `type_detail` ; le sous-type apparaît dans le bandeau de la fiche chantier et dans la liste.
- (Suite) Accueil : nouvelle section **« Outils rapides »** (Calcul de devis, Calcul de murs) juste sous les chiffres clés.
- Rappel : `type_detail` nécessite la migration `0015` (déjà requise pour les colonnes de dimensions).

---

## Notes de séquençage (conflits de fichiers)

- Aucune tâche en cours : tous les fichiers sont libérés.
- `src/app/chantiers/[id]/planning/page.tsx` : libéré (T-LOG-04 terminée).
- `supabase/migrations/0007_phase3_multitenant_isolation.sql` : libéré (T-MIG-01 terminée).
- `src/lib/devis/model3d.ts` + son test (nouveaux, Session 2) : terminés ; la Session 1 peut les utiliser tels quels (créer un composant d'affichage d'après TODO-UI-007, ne pas modifier le module).

---

## Prochaine tâche à assigner

- **Utilisateur (bloquant)** : T-MIG-02 — appliquer la migration `0015` dans le SQL Editor de Supabase (l'utilisateur s'en charge lui-même). Vérification : `node scripts/audit-base.mjs`.
- **Session 1 (apparence)** : T-UI-08 — afficher la « Vue 3D du projet » dans le calculateur de devis (consignes complètes dans `TODO_UI.md` → TODO-UI-007). La logique est déjà prête (Session 2).
- **Session 2 (logique)** : T-DATA-01 — script de nettoyage des doublons BPU **prêt** (`supabase/seed/nettoyer_doublons_bpu.sql`), à exécuter après confirmation de l'utilisateur.
- **Session 3 (migrations/déploiement)** : rien à faire pour l'instant (migration `0015` prise en charge par l'utilisateur).
- **Session 4 (tests)** : aucun test rouge ; suite `npm test` = 123 tests verts.

> Mise à jour du 18/10/2026 (Session 2) : la cause de « je n'arrive pas à créer un chantier » est identifiée et réparée côté code (migration `0015`). **Il reste à appliquer cette migration dans Supabase** pour débloquer l'utilisateur. Le compte de test utilisé pour le diagnostic a été supprimé.
>
> Mise à jour du 18/10/2026 (Session 2, suite) : nouvelle fonctionnalité « modèle 3D d'un devis » — la logique de géométrie est prête (`src/lib/devis/model3d.ts`, 18 nouveaux tests, total 141 verts) ; l'affichage dans la page devis est assigné à la Session 1 (TODO-UI-007).
