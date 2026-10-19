# Audit métier — test « ingénieur génie civil »

**Date :** 19/10/2026
**Révision testée :** `6f73689` (le dépôt évolue pendant le test : les calculs et captures datent de `69e3864` → `6f73689`)
**Méthode :** test de l'application réelle dans Chrome (PC, 1440 × 900), avec un compte de test et un chantier créé pour l'occasion :

- Chantier `a1e814ea-8072-4882-9506-dafbd743a6aa` — « TEST INGENIEUR — Voirie 1,2 km + assainissement »
  (route, sous-type *Chaussée / revêtement*, 250 000 000 FCFA, 02/11/2026 → 30/04/2027, AGEROUTE, ETS TEST TP).
- 6 tâches de planning, 1 journal validé, 2 000 m² de décapage réalisés, 1 dépense de 170 000 FCFA.
- Import DQE de 3 postes (Décapage 8 400 m², Couche de base 2 520 m³, Enrobé 966 t).
- `npm test` : **288 tests, 288 verts, 0 échec** (suite complète).

**Parcours testés :** création de chantier → fiche chantier → planning & PERT → calcul de devis → import DQE → journal + quantités → coûts → qualité → rapports → export Excel.

---

## Verdict en une phrase

**Le socle est solide** : la création de chantier, le calcul de devis, le planning (PERT/Gantt/courbe en S), la chaîne journal → quantités → avancement → coûts → rapports et l'export Excel fonctionnent, et **tous les chiffres vérifiés étaient exacts au franc près**. Il manque surtout la **finalisation des devis** (aucun document enregistrable ni imprimable), les **liens entre tâches du planning** (chemin critique), la **création des plans de contrôle qualité** (sans quoi les essais et les fiches de non-conformité sont inaccessibles) et une **version plus complète du rapport**.

---

## 1. Création d'un chantier — ✅ en place

**Constaté :** création en une fois, redirection vers la fiche, aucun plantage. La fiche affiche le montant (250 000 000 FCFA), les dates (02/11/2026 → 30/04/2027), les jours restants (193 j), le sous-type et les menus.
Les champs ville / maître d'ouvrage / maître d'œuvre / entreprise / n° de marché sont bien présents.

**À améliorer :**
- Le **statut apparaît deux fois** côte à côte (pastille « En préparation » + menu déroulant « En préparation »). Fusionner en un seul élément cliquable.
- Le planning n'est pas pré-rempli : après un devis, il faudrait un bouton « **Créer le planning depuis le devis** » (le devis propose déjà des durées indicatives — elles ne servent à rien aujourd'hui).

## 2. Planning & PERT — ✅ partiel

**Constaté :** 6 tâches ajoutées en quelques secondes ; tableau PERT complet (ES, EF, LS, LF, marge, critique), diagramme de Gantt, courbe en S. Aucune erreur.

**Le problème de fond :** aucune tâche n'a de **prédécesseur**. Toutes démarrent à J0 et le « chemin critique » se réduit à la tâche la plus longue (Revêtement, 20 j). Ce n'est pas un planning de chantier réaliste (décapage → remblai → base → revêtement).

**À améliorer :**
- **Créer les liens entre tâches** (finition-début au minimum) — c'est la correction n° 1 du planning (PLA-02).
- **Modifier / supprimer** une tâche (ajouter et cocher « terminé » ne suffit pas en cas d'erreur de saisie).
- **Jours ouvrés** au lieu de jours calendaires pour les dates prévues (les dimanches sont comptés).
- Durée en jours, pas d'heures, pas de ligne de base (prévu figé) pour mesurer le retard.
- Pas d'affectation d'équipe/engin aux tâches (pas de ressources ni de coût par tâche).

## 3. Calcul de devis — ✅ calculs exacts, ❌ pas de devis finalisé

**Constaté** (voirie, 1 200 m × 7 m, base 0,25 m, roulement 0,05 m) :

| Ligne | Calcul affiché | Attendu | Résultat |
|---|---|---|---|
| Surface de chaussée | 1 200 × 7 | 8 400 m² | ✅ |
| Couche de base foisonnée | 1 200 × 7 × 0,25 × 1,2 | 2 520 m³ | ✅ |
| Nombre de bennes (15 m³) | arrondi sup. | 168 | ✅ |
| Enrobé (2,3 t/m³) | 1 200 × 7 × 0,05 × 2,3 | 966 t | ✅ |
| Bitume d'accrochage | 1 kg/m² | 8,4 t | ✅ |
| Compacteur | surface / 600 | 14 j | ✅ |
| Niveleuse | surface / 800 | 11 j | ✅ |
| Marquage | 1 200 × 0,3 | 360 m² | ✅ |
| **Total estimatif** | somme des postes BPU | **230 120 800 FCFA** | ✅ |

Vue 3D affichée, planning suggéré cohérent (décapage 11 j, base 17 j, compactage 14 j, pose 21 j, réception 1 j).

**À améliorer — c'est le manque le plus important pour « faire des devis » :**
- **Aucun bouton Enregistrer / Exporter / Imprimer.** Le devis disparaît dès qu'on quitte la page ; on ne peut ni le nommer, ni le rattacher au chantier, ni l'envoyer au client.
- Pas de **client, date, numéro de devis, TVA, remise, conditions de paiement**.
- Pas de **déboursé sec / marge** ; le total n'est que la somme des postes BPU choisis (les lignes sans poste BPU, ex. surface, bennes, sont des quantités seules, exclues du total — normal, mais il faut le dire à l'écran).
- Aucun lien entre le devis et le **DQE du chantier** (on ressaisit les quantités à la main dans le DQE).
- Le **planning suggéré** du devis ne peut pas être envoyé vers le planning du chantier.

## 4. Journal → quantités → avancement → coûts — ✅ chaîne complète et exacte

**Constaté :**
- Journal créé en une page, validé (confirmation « Valider ce journal ? » — nouvelle boîte de dialogue utile).
- 2 000 m² de décapage saisis dans « Quantités réalisées ».
- Rapport du chantier : **Avancement 0,5 %**, **Coût réalisé 934 000 FCFA** (= 2 000 × 467 FCFA) ✅ — le calcul pondéré par poste fonctionne.
- Dépense « Gasoil pelle hydraulique » 200 L × 850 = **170 000 FCFA** saisie et retrouvée dans le rapport (Dépenses) ✅.
- En-tête du journal : météo par boutons, observations, effectifs, engins, incidents, photos.

**À améliorer :**
- Les **quantités s'ajoutent ligne par ligne** : pour un poste déjà saisi (2 000 m² hier, 1 500 m² aujourd'hui), aucune vue « total réalisé / restant » à l'écran pendant la saisie.
- Pas d'**alerte d'écart de quantité** au moment de la saisie (le seuil paramétrable existe dans le chantier, mais l'alerte n'apparaît qu'après, côté fiche).
- L'avancement de la fiche est **financier/pondéré par le montant** ; un avancement physique par poste (quantité) n'est pas montré côte à côte.

## 5. Rapports — ✅ fonctionne, 🟠 incomplet

**Constaté :** rapport généré sur période (01/10 → 31/12/2026) avec 8 indicateurs : Postes DQE 3, Avancement 0,5 %, Coût prévu 196 492 800 FCFA, Coût réalisé 934 000 FCFA, Dépenses 170 000 FCFA, Journaux 1, Essais 0, Conformité 100 %. Bouton « Imprimer / PDF » présent.

**À améliorer :**
- Le rapport ne contient **que 8 chiffres** : ni journaux (météo, effectifs, engins, incidents), ni photos, ni détail des postes, ni non-conformités, ni dépenses par catégorie.
- « **Coût réalisé** » = valorisation du DQE (quantités × prix), alors que « **Dépenses** » = argent réellement dépensé. Deux notions différentes aux noms trop proches : renommer (« Valorisation travaux » / « Dépenses réelles ») et les croiser.
- Pas d'export Excel/PDF direct du rapport (impression navigateur uniquement), pas de choix « journalier/hebdo/mensuel » qui change réellement le contenu (la période est libre de toute façon).
- Pas de **rapport d'avancement avec courbe en S** ni de comparaison délai (retard/avance).

## 6. Export Excel — ✅ fonctionne

**Constaté :** fichier `.xlsx` produit avec les feuilles **Postes DQE**, **Dépenses**, **Planning** (les feuilles vides sont omises). Chiffres exacts.

**À améliorer :**
- **Feuilles manquantes** : journaux (effectifs, engins, incidents), livraisons, photos, non-conformités. (« Quantités réalisées » existe dans le code mais n'apparaît que si des quantités ont été saisies — il n'y en avait pas au moment de cet export.)
- Valeurs **brutes** : statut `a_faire`, catégorie `materiaux`, dates `2026-10-19`, cellules `null`. À traduire (français, JJ/MM/AAAA) — c'est le fichier que voit le bureau.
- Pas de ligne de totaux ni de mise en forme (en-têtes, montants).

## 7. Qualité & contrôle — ❌ bloquant métier

**Constaté :** la liste « Sélectionner un paramètre » **ne contient rien** : aucun plan de contrôle n'existe pour le chantier, et **aucun écran ne permet d'en créer** (paramètre, valeur exigée, tolérances +/−, unité). La table `plans_controle` n'est que lue par l'écran Qualité.

**Conséquence :** impossible de saisir un essai (béton, compactage, nivellement…), donc impossible de déclencher la **fiche de non-conformité automatique** (exigence RG-04) — le code existe mais reste inatteignable.

**À faire :** écran de création des plans de contrôle par chantier (modèles par type d'ouvrage : route/bâtiment), avec valeurs et tolérances, avant de pouvoir saisir un essai.

## 8. Autres observations

- **BPU** : plusieurs postes très proches subsistent après le nettoyage des doublons (ex. enrobé à 95 000, 98 000 et **35 000 FCFA/t** ; latérite 40 000 en deux unités). Risque de choisir la mauvaise ligne dans un devis → finir le dédoublonnage (même matériau, même unité) et vérifier les prix aberrants.
- **Devis_fournisseurs** : la table existe (phase 4) mais aucun écran ne l'utilise — les **conditions tarifaires fournisseurs** ne sont pas exploitables.
- **Fiche chantier** : statut affiché en double (badge + menu) ; « Imprimer la fiche » OK.
- **Tests** : suite complète **288/288** le 19/10 — bon filet de sécurité avant ces évolutions.

---

## Corrections proposées, par session

| Priorité | Session | Tâche proposée | Fichiers probables |
|---|---|---|---|
| **1 — bloquant métier** | 2 (logique) + 1 (écran) | **T-LOG-36** — Plans de contrôle : écran de création (paramètre, valeur exigée, tolérances, unité) + modèles par type d'ouvrage, pour rendre les essais et la fiche NC automatique (RG-04) utilisables | `src/app/chantiers/[id]/qualite/page.tsx`, `supabase` (lecture/écriture `plans_controle`), `src/lib/qualite/` |
| **2 — devis inutilisable en l'état** | 2 (logique) + 1 (écran) | **T-LOG-37** — Enregistrer un devis : client, numéro, date, lignes, total ; rattachement au chantier ; export PDF/Excel ; reprise d'un devis existant | `src/app/calculateurs/devis/page.tsx`, nouvelle table `devis*`, `src/lib/devis/` |
| **3 — chemin critique faux** | 2 | **T-LOG-38** — Liens entre tâches du planning : création/suppression de prédécesseurs (finition-début), affichage des liens, recalcul du chemin critique (PLA-02) ; édition/suppression de tâche | `src/app/chantiers/[id]/planning/page.tsx`, `src/lib/calculs/pert.ts` |
| **4 — rapport utile au bureau** | 2 (logique) + 1 (écran) | **T-LOG-39** — Rapport complet : détail des journaux (météo, effectifs, engins, incidents), dépenses par catégorie, non-conformités, photos ; renommer « Coût réalisé » → « Valorisation travaux » ; export PDF/Excel | `src/app/rapports/page.tsx`, `src/lib/exports/` |
| **5 — export exploitable** | 1 | **T-UI-20** — Export Excel : ajouter journaux / livraisons / non-conformités / photos, libellés français, dates JJ/MM/AAAA, en-têtes et totaux | `src/app/export/page.tsx` |
| **6 — cohérence** | 2 | **T-LOG-40** — BPU : finir le dédoublonnage (même désignation + unité) et corriger le prix enrobé à 35 000 FCFA/t ; brancher `devis_fournisseurs` (conditions tarifaires) | `scripts/nettoyer-doublons-bpu.mjs`, BPU, `fournisseurs` |
| **7 — finitions** | 1 | **T-UI-21** — Fiche chantier : un seul affichage du statut (pastille cliquable) | `src/app/chantiers/[id]/page.tsx` |

> **Répartition en tâches (19/10/2026)** : chaque correction est découpée en **logique** (Session 2) et **écran** (Session 1), règle « un seul propriétaire par tâche » — voir `TACHES.md` (**T-LOG-36 à T-LOG-40**, **T-UI-20 à T-UI-25**) et les dépôts détaillés dans `TODO_LOGIQUE.md` (TODO-LOGIC-006 à 010) et `TODO_UI.md` (TODO-UI-017 à 022).

---

## Données de test créées (à conserver ou nettoyer sur accord)

- Chantier « TEST INGENIEUR — Voirie 1,2 km + assainissement » (`a1e814ea-8072-4882-9506-dafbd743a6aa`), 6 tâches de planning.
- Journal `dac73e20-010a-4f74-ba0b-558926b5fa6c` (validé) + 2 000 m² de décapage.
- Import DQE 3 postes, 1 dépense 170 000 FCFA, exports Excel de test.
- Compte de test : `test-pc-20261018@example.com`.
