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
| T-DEP-02 | Facultatif — nettoyer les projets Vercel en double : `btp-suivi-6wxl` (erreur 500 au chargement) et projet `btpsuivi` (protection SSO active ; ce n'est pas le site utilisé) ; conserver `btp-suivi-7w2i` (site vérifié en ligne) et au besoin `btp-suivi-cd4w` en secours | Utilisateur (compte Vercel) | `vercel.json` | — | Basse |
| T-UI-09 | Journal : brancher la création robuste au réseau faible (`creerJournalHorsLigne` : délai maximal, file d'attente, message clair, observations) — blocage n°1 du test terrain | 1 | `src/app/chantiers/[id]/journaux/page.tsx` | PWA / JOU | Haute |
| T-UI-10 | Photos : compresser avant téléversement (`compresserImage`, max 1600 px) ; facultatif : bascule des `createSignedUrls` inline vers `urlsSignees` | 1 | `src/app/chantiers/[id]/journaux/[journalId]/page.tsx` | PWA / PHO | Haute |
| T-UI-11 | Accueil : carte « À faire aujourd'hui » branchée sur `actionsDuJour` (+ bouton « Saisie du jour » sur `lireDernierChantier`) | 1 | `src/app/page.tsx` | — | Moyenne |
| T-UI-12 | Accueil : détail d'alerte lisible via `detailAlerte` (remplacer « Valeur : x / Seuil : y ») | 1 | `src/app/page.tsx` | — | Moyenne |
| T-UI-13 | Création de chantier : formulaire par étapes (essentiel d'abord), bouton « Utiliser ma position », montant avec séparateurs, page « Modifier le chantier » | 1 | `src/app/chantiers/nouveau/page.tsx`, nouveau `src/app/chantiers/[id]/modifier/page.tsx` | CHA-01 / CHA-05 | Moyenne |

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
| T-LOG-20 | Nettoyage des doublons du BPU exécuté sur la base distante (443 → 289 postes ; sauvegarde JSON avant suppression ; devis revérifiés : 132 lignes OK) | 2 | `supabase/seed/nettoyer_doublons_bpu.sql`, `scripts/nettoyer-doublons-bpu.mjs` | 18/10/2026 |
| T-SEED | Données de départ prix (seed CSV + script idempotent) | 2 | `supabase/seed/prix_ci.csv`, `supabase/seed/load_prix_ci.mjs` | 16/10/2026 |
| T-MIG-01 | Vérifier et activer les politiques RLS d'isolation multitenant côté base | 3 | `supabase/migrations/0007_phase3_multitenant_isolation.sql`, `supabase/RLS_MANUAL_CHECK.md` | 16/10/2026 |
| T-MIG-02 | Appliquer la migration `0015` (réparation des colonnes chantiers) : appliquée par l'utilisateur, vérifiée (« Base à jour ») — création de chantier débloquée | Utilisateur | `supabase/migrations/0015_reparation_colonnes_chantiers.sql` | 18/10/2026 |
| T-DATA-01 | Nettoyage des doublons BPU : 443 → 289 lignes (154 copies supprimées, aucune anomalie ; sauvegarde JSON avant suppression ; devis revérifiés) | 2 | `scripts/nettoyer-doublons-bpu.mjs`, `supabase/seed/nettoyer_doublons_bpu.sql` | 18/10/2026 |
| T-DEP-01 | Levée par vérification (Session 3, 18/10 à 19h25-19h30) : les sites `btp-suivi-7w2i.vercel.app` et `btp-suivi-cd4w.vercel.app` répondent de nouveau (redirection `/login`, page « Connexion » « BTP Suivi Pro ») — rien à recréer ; les déploiements GitHub → Vercel fonctionnent (dernier statut : succès) | 3 | `vercel.json` | 18/10/2026 |
| T-TEST-01 | Maintenir `BUGS.md` à jour (ajouter les nouveaux bugs, fermer les corrigés) | 4 | `BUGS.md` | 16/10/2026 |
| T-UI-05 | Refonte esthétique générale : design system (ombres, dégradés, animations), composants UI, navigation (sidebar/topbar/mobile), tableau de bord, chantiers, connexion, détail chantier, BPU, import DQE, en-têtes unifiés | 1 | `src/app/globals.css`, `src/components/ui/*`, `src/components/layout/*`, `src/components/DqeImport.tsx`, `src/components/SignOutButton.tsx`, `src/app/page.tsx`, `src/app/chantiers/page.tsx`, `src/app/chantiers/[id]/page.tsx`, `src/app/login/page.tsx`, `src/app/bpu/page.tsx`, `src/app/fournisseurs/page.tsx`, `src/app/rapports/page.tsx`, `src/app/export/page.tsx`, `src/app/referentiel/page.tsx` | 18/10/2026 |
| T-UI-06 | Formulaire « Nouveau chantier » : champ « Sous-type (phase de travaux) » alimenté par `typesDetaillesPour` (s'adapte au type Route/Bâtiment), enregistré dans `type_detail` ; sous-type affiché dans la fiche chantier et la liste | 1 | `src/app/chantiers/nouveau/page.tsx`, `src/app/chantiers/[id]/page.tsx`, `src/app/chantiers/page.tsx` | 18/10/2026 |
| T-UI-07 | Section « Outils rapides » sur la page d'accueil : cartes « Calcul de devis » et « Calcul de murs » | 1 | `src/app/page.tsx` | 18/10/2026 |
| T-UI-08 | Vue 3D du projet dans le calculateur de devis : composant générique `Modele3DGenerique` (three.js, rotation/zoom/recentrage, info-bulles, grille au sol) + total estimatif affiché | 1 | `src/components/visualisation/Modele3DGenerique.tsx` (nouveau), `src/app/calculateurs/devis/page.tsx` | 18/10/2026 |
| T-LOG-21 | Journal : création robuste au réseau faible — délai maximal 15 s, vérification de réponse perdue, file IndexedDB rejouée à la reconnexion, observations enregistrées — + détection des erreurs réseau + 10 tests | 2 | `src/lib/journal/creation.ts`, `src/lib/offline/erreurs.ts`, `src/lib/offline/mutations.ts`, `src/lib/offline/storage.ts` | 18/10/2026 |
| T-LOG-22 | Photos : URLs signées groupées (`urlsSignees`) + compression locale avant envoi (`compresserImage`, 1600 px / JPEG 72 %) + 6 tests | 2 | `src/lib/photos/urls.ts`, `src/lib/photos/compression.ts` | 18/10/2026 |
| T-LOG-23 | Accueil : actions du jour (`actionsDuJour` — saisie manquante, non-conformités, alertes) + mémoire du dernier chantier partagée avec la navigation mobile (clé `btp.dernier.chantier`) + 7 tests | 2 | `src/lib/journal/actionsDuJour.ts`, `src/lib/chantiers/dernier.ts` | 18/10/2026 |
| T-LOG-24 | Alertes : libellés FR/EN lisibles (9 types, 3 statuts) + détail formaté (`detailAlerte`, pourcentages) + textes « hors ligne » du journal dans le dictionnaire | 2 | `src/lib/alertes.ts`, `src/lib/i18n.ts` | 18/10/2026 |

---

## Notes de la Session 1 (refonte esthétique du 18/10/2026)

- La barre latérale affiche désormais **tous** les écrans de navigation (avant : seul l'onglet actif) et un **bouton réduire/étendre** rend le mode compact accessible (mémorisé par navigateur).
- Tableau de bord : la carte « Chantiers » affiche le nombre total (elle dupliquait le nombre « en cours »).
- Mode sombre : les variantes `dark:` suivent maintenant la classe du thème (bouton clair/sombre), et non le réglage système.
- Aucune modification de `src/lib`, ni des migrations, ni des calculs.
- (Suite) « Nouveau chantier » : champ **Sous-type (phase de travaux)** branché sur la liste officielle `src/lib/chantiers/types.ts` (filtrée par type), enregistré dans `type_detail` ; le sous-type apparaît dans le bandeau de la fiche chantier et dans la liste.
- (Suite) Accueil : nouvelle section **« Outils rapides »** (Calcul de devis, Calcul de murs) juste sous les chiffres clés.
- Rappel : `type_detail` nécessite la migration `0015` (déjà requise pour les colonnes de dimensions).
- (Suite 2) Calculateur de devis : nouvelle section **« Vue 3D du projet »** (composant générique `Modele3DGenerique`, rotation/zoom/info-bulles) + **total estimatif** enfin affiché + en-tête unifié (T-UI-08).

---

## Notes de séquençage (conflits de fichiers)

- Aucune tâche en cours : tous les fichiers sont libérés.
- `src/app/chantiers/[id]/planning/page.tsx` : libéré (T-LOG-04 terminée).
- `supabase/migrations/0007_phase3_multitenant_isolation.sql` : libéré (T-MIG-01 terminée).
- `src/lib/devis/model3d.ts` + son test (nouveaux, Session 2) : terminés ; la Session 1 peut les utiliser tels quels (créer un composant d'affichage d'après TODO-UI-007, ne pas modifier le module).

---

## Prochaine tâche à assigner

- **Utilisateur** : ✅ T-DEP-01 levée — vérifié en ligne par la Session 3 (le site `btp-suivi-7w2i.vercel.app` répond de nouveau ; migration `0015` appliquée ; création de chantier OK, chantier « B » bien en base). Sur le téléphone : rouvrir `https://btp-suivi-7w2i.vercel.app` ; si l'écran reste bloqué sur l'ancienne version, fermer complètement l'appli (ou effacer les données du site) pour vider le cache PWA. Si le site rebuguait un jour : `npx vercel login` sur le Mac, puis un agent pourra redéployer. Facultatif : T-DEP-02 (nettoyage des projets Vercel en double).
- **Session 1 (apparence)** : ✅ T-UI-08 terminée (vue 3D du projet dans le calculateur de devis). En continu : harmonisation des sous-pages de chantier (planning, qualité, coûts, livraisons, journaux, métré, modélisation 3D) — même design system que le reste de l'application.
- **Session 2 (logique)** : ✅ Traitement des retours terrain (`RETOURS_UTILISATEUR.md`) : création de journal robuste au réseau faible (blocage n°1), outils photos (URLs signées + compression), actions du jour pour l'accueil, libellés d'alertes, mémoire du dernier chantier — tout testé (suite : 181 verts). Prochaines actions attendues côté Session 1 (T-UI-09 à T-UI-13).
- **Session 3 (migrations/déploiement)** : ✅ Vérifications du 18/10 terminées : base Supabase « Base à jour » (audit `scripts/audit-base.mjs`) ; déploiements Vercel vérifiés en ligne (`btp-suivi-7w2i` et `btp-suivi-cd4w` répondent). Reste : T-DEP-02 (facultatif, côté utilisateur).
- **Session 4 (tests)** : aucun test rouge ; suite `npm test` = 181 tests verts.

> Mise à jour du 18/10/2026 (Session 2) : la cause de « je n'arrive pas à créer un chantier » est identifiée et réparée côté code (migration `0015`). **Il reste à appliquer cette migration dans Supabase** pour débloquer l'utilisateur. Le compte de test utilisé pour le diagnostic a été supprimé.
>
> Mise à jour du 18/10/2026 (Session 2, suite) : nouvelle fonctionnalité « modèle 3D d'un devis » — la logique de géométrie est prête (`src/lib/devis/model3d.ts`, 18 nouveaux tests, total 141 verts) ; l'affichage dans la page devis est assigné à la Session 1 (TODO-UI-007).
>
> Mise à jour du 18/10/2026 (Session 2, suite 2) : vérification demandée par l'utilisateur → migration `0015` **appliquée** par l'utilisateur (audit « Base à jour », création de chantier débloquée) ; doublons BPU **nettoyés** avec son accord (443 → 289 lignes, 154 copies supprimées, aucune anomalie, sauvegarde JSON avant suppression). Plus rien en attente côté utilisateur.
>
> Mise à jour du 18/10/2026 (Session 2, suite 3) : diagnostic « la page ne charge pas après la création d'un chantier » → le chantier est bien créé en base ; c'est le **déploiement Vercel qui n'existe plus** (`7w2i.vercel.app` → `DEPLOYMENT_NOT_FOUND`). Le téléphone affichait l'appli depuis le cache (PWA). À faire : recréer le projet Vercel (tâche T-DEP-01). Build local vérifié OK.
>
> Mise à jour du 18/10/2026 (Session 3) : vérification directe des sites → **le site `btp-suivi-7w2i.vercel.app` répond de nouveau** (redirection `/login`, page « Connexion » « BTP Suivi Pro », testé 3 fois entre 19h23 et 19h30) ; `btp-suivi-cd4w.vercel.app` répond aussi. Les déploiements automatiques GitHub → Vercel fonctionnent (dernier : succès). Constats : `btp-suivi-6wxl` renvoie une erreur 500 (middleware — projet en double, variables probablement absentes) ; `btpsuivi.vercel.app` n'appartient pas à ce projet (site tiers). Base Supabase revérifiée « Base à jour » (audit `scripts/audit-base.mjs`) — **rien à recréer côté Vercel**.
>
> Mise à jour du 18/10/2026 (Session 2, suite 5) : traitement des retours terrain (`RETOURS_UTILISATEUR.md`). Côté logique : création de journal qui résiste au réseau faible (blocage n°1 — délai maximal, file d'attente, observations enregistrées), outils photos (URLs signées + compression), actions du jour pour l'accueil, libellés d'alertes lisibles, mémoire du dernier chantier — le tout testé (**181 tests verts**). Reste à brancher côté interface : **T-UI-09 à T-UI-13** (détails dans `TODO_UI.md`, TODO-UI-008 à TODO-UI-012). NB : une partie du rapport est déjà en cours dans la copie de travail de la Session 1 (titres des écrans, statut « Brouillon », vignettes photos, « Saisie du jour » directe, journal en une page) — non commitée à l'heure de cette note.
