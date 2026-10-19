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

> **Répartition en tâches (19/10/2026)** : chaque correction est découpée en **logique** (Session 2) et **écran** (Session 1), règle « un seul propriétaire par tâche » — voir `TACHES.md` (**T-LOG-36 à T-LOG-40**, **T-UI-20 à T-UI-25**) et les dépôts détaillés dans `TODO_LOGIQUE.md` (TODO-LOGIC-006 à 010) et `TODO_UI.md` (TODO-UI-018 à 027).

---

# Partie 2 — Modules annexes (suite du test du même jour)

**Écrans testés :** Fournisseurs · Livraisons & stocks · Référentiel de prix · Base de prix (BPU) · Métré & DQE · Calculateur de murs · Fiche imprimable (A4) · Modélisation 3D · Bloc « Avancement dans le temps » · page Aide.

**Résultat global :** **aucun écran ne plante** (0 exception console sur 10 écrans, 0 page d'erreur). Les modules **Livraisons & stocks**, **Métré**, **Fiche imprimable** et **3D** sont fonctionnels et exacts. Trois points à corriger : un **prix faux** dans le calculateur de murs, la **base de prix sans date de source**, et les **conditions tarifaires fournisseurs sans écran**.

## 9. Métré & DQE — ✅ calculs exacts

Longueur 1 200 m, largeur 7 m, épaisseur 0,25 m → volume en place **2 100 m³**, volume foisonné (×1,2) **2 520 m³**, **168 bennes** (capacité 15 m³), surface **8 400 m²**. Tout est conforme à la section 5 du cahier des charges, arrondi au supérieur compris. Les calculateurs « Béton : ratio d'acier » et « Béton simple » sont présents.

## 10. Calculateur de murs — 🟠 volumes exacts, **prix faux**

**Volumes : corrects.** Mur 20 m × 3 m, épaisseur 0,20 m → surface brute 60 m², nette 57 m², **volume 11,4 m³**, 1 497 blocs, mortier 0,382 m³, ciment 107 kg, sable 0,306 m³. Mur 10 m × 2,5 m → 25 m² / 23,75 m² / **4,75 m³**. Rien à corriger sur les quantités.

**Deux défauts sur les prix :**
1. **Le prix du sac de ciment est appliqué à des kilos** → total ciment **50 fois trop élevé**. Exemple mesuré : 107 kg × 4 800 FCFA (le prix du *sac* de 50 kg) = **513 516 FCFA** affichés, au lieu de 2,14 sacs × 4 800 = **10 272 FCFA**. Sur le mur de 400 m², c'est **3 472 896 FCFA** au lieu de 69 458 FCFA. L'écran le signale à moitié (« Ajustez si le prix est par sac/m3 ») mais **laisse afficher un total faux**.
2. **Le total est affiché avec des décimales** : « 9 662 799,**56** FCFA » — la règle RG-06 impose des montants en FCFA **sans décimale**. Les volumes, eux, utilisent le point décimal anglais (« 4.750 m³ ») alors que le reste de l'application utilise la virgule.

## 11. Livraisons & stocks — ✅ en place et exact

Bon de livraison saisi (matériau, quantité 120, commandée 150, mise en œuvre 60, n° de bon, date, photo) → « Livraison enregistrée ». Comparaison **commandé 150 / livré 120 / mis en œuvre 60 / écart −30**, stock théorique **120 − 60 = 60**, état « OK », liste des livraisons avec date en JJ/MM/AAAA. Le seuil d'alerte est paramétrable par chantier et par matériau (RG-07).

**Réserve :** le **matériau est saisi en texte libre** (« Laterite ») — pas de choix dans le BPU ni dans les postes du DQE. Une faute de frappe (« Latérite », « LAT-01 ») crée une deuxième ligne de stock et un seuil d'alerte qui ne s'applique plus. C'est le seul point à améliorer sur ce module.

## 12. Base de prix (BPU) — 🟠 doublons toujours visibles, **pas de date de source**

289 postes, dont **158 « valides » et 131 « à vérifier »** (source « Marché ivoirien 2026 (estimation) – à vérifier »).

**Les doublons sont bien visibles à l'écran** (confirmation du constat de la partie 1) :
- Enrobé : `BIT-02` 95 000 FCFA/t **et** `ENR-01` 95 000 FCFA/t (quasi doublon) **et** `MAT-008` **35 000 FCFA/t** (prix aberrant, marqué « Valide ») ;
- Latérite : `LTR-01` 40 000 FCFA/m³ **et** `MB-06` 40 000 FCFA/m³, plus `BIT-05` 28 000 FCFA/m³ pour la latérite améliorée.

**Point nouveau :** la table n'a **aucune date de source** (ni colonne, ni champ dans le formulaire d'ajout) alors que l'exigence REF-04 impose « source **et date** » pour chaque prix. Un prix peut donc être enregistré sans date — la règle n'est pas appliquée là où les devis vont le chercher.

## 13. Référentiel de prix — ❌ vide

La page affiche **0 prix** (« Exporter CSV (0) », liste vide) alors que la base de prix en compte 289. Les deux écrans sont deux bases distinctes : le **Référentiel** (avec source, date de source, date de validité, historique REF-03, import/export REF-05) est vide, et la **base de prix** utilisée par les devis ne suit pas les règles REF. Concrètement : l'historique des prix et l'import/export ne peuvent pas fonctionner ; et le « Export CSV » ne produit rien.

## 14. Fournisseurs — 🟠 module présent, **conditions tarifaires absentes**

Le module existe et fonctionne : liste, filtres par type (Matériaux, Loueur d'engins, Transporteur, Sous-traitant, Laboratoire), formulaire complet (raison sociale, type, adresse, ville, contact, téléphone, e-mail, NIF, RCCM). **Mais aucune section « conditions tarifaires »** : la table `devis_fournisseurs` (FOU-03, FOU-04) n'est utilisée par aucun écran — impossible de saisir une offre fournisseur, de comparer deux offres sur un même poste ou de tracer le choix motivé.

## 15. Fiche imprimable, 3D, bloc avancement, aide — ✅ en place

- **Fiche imprimable** : structure complète (marché, exécution, description de l'ouvrage, découpage et avancement par partie, intervenants, documents, zone de signatures) et **aucun débordement en A4** (largeur 794 px exactement, 0 élément hors page) — l'impression est exploitable.
- **Modélisation 3D** : la scène se charge (canvas 660 × 598), boutons « Ajouter l'élément » et « Recentrer ».
- **Bloc « Avancement dans le temps »** : présent sur la fiche chantier (courbe de progression, cadence, fin estimée) avec le formulaire « Nouveau point d'avancement » — aucun point enregistré sur le chantier de test.
- **Page Aide** : s'affiche correctement (démarrage rapide, modules, mode hors connexion).
- *Remarque* : la fiche imprimable affiche « Avancement : — » et « Aucune partie découpée » car le chantier de test a été créé **avant** la fonctionnalité automatique du découpage par PK (livrée le 19/10). À revérifier sur un chantier créé depuis.

## 16. HSE — à prévoir plus tard

Les indicateurs HSE existent en logique (taux de fréquence, jours sans accident) mais **aucun écran HSE** n'est accessible. Les exigences concernées sont de priorité **S / C** (HSE-01 « déclaration d'incident ou d'accident avec photos » en S, HSE-02/03 en C) : à planifier, mais pas bloquant.

---

## Corrections proposées (partie 2), par session

| Priorité | Session | Tâche proposée | Fichiers probables |
|---|---|---|---|
| **1 — prix faux** | 2 (logique) + 1 (écran) | **T-LOG-41 / T-UI-26** — Calculateur de murs : convertir la quantité de ciment en **sacs de 50 kg** avant d'appliquer le prix du BPU ; arrondir les montants en FCFA **sans décimale** (RG-06) ; virgule décimale française ; tests | `src/app/calculateurs/mur/page.tsx`, `src/lib/calculs/` |
| **2 — traçabilité des prix** | 2 (logique) + 1 (écran) | **T-LOG-42 / T-UI-27** — Base de prix : **date de source obligatoire** (REF-04) à la saisie et à l'affichage ; brancher la base de prix sur le **Référentiel** (actuellement 0 prix) ; tri des 131 postes « à vérifier » | `src/app/bpu/page.tsx`, `src/lib/referentiel/`, `supabase/` |
| **3 — conditions fournisseurs** | 2 (logique) + 1 (écran) | **T-LOG-43 / T-UI-28** — Fournisseurs : enregistrer / relire les **conditions tarifaires** (`devis_fournisseurs`), comparer deux offres sur un même poste, tracer le choix motivé (FOU-03, FOU-04) | `src/app/fournisseurs/page.tsx`, `src/lib/fournisseurs/` |
| **4 — stock fiable** | 2 (logique) + 1 (écran) | **T-LOG-44 / T-UI-29** — Livraisons : choisir le **matériau dans une liste** (BPU ou postes du DQE) au lieu du texte libre ; seuil d'alerte rattaché au même matériau | `src/app/chantiers/[id]/livraisons/page.tsx`, `src/lib/stock/` |

> Ces quatre corrections s'ajoutent aux sept de la partie 1 : **19 tâches au total** (11 pour la partie 1, 8 pour la partie 2), réparties dans `TACHES.md`, `TODO_LOGIQUE.md` et `TODO_UI.md`.

---

# Partie 3 — Nouveautés livrées le 19/10 et derniers écrans

**Écrans testés :** création d'un chantier avec le **découpage automatique par PK** (nouveauté du 19/10), recherche globale (Ctrl+K), page « Hors connexion », alertes et seuils de la fiche chantier, page « Modifier le chantier ».

## 17. Découpage automatique par PK — ✅ en place et juste

Sur le formulaire de création d'une route : longueur du tracé **1 200 m**, longueur des tronçons **250 m** → le bouton « Générer les sections » produit **250 m / 250 m / 250 m / 250 m / 200 m**, soit 5 sections totalisant exactement 1 200 m (la dernière est tronquée pour tomber juste). L'aperçu 3D est disponible derrière le bouton « Voir l'aperçu 3D » (il ne se charge pas d'emblée, pour ne pas ralentir la page). La création redirige ensuite vers la fiche du chantier. **Fonctionnalité conforme à CHA-02.**

**Point d'attention (à confirmer manuellement)** : pendant deux essais automatisés, le chantier **a bien été créé** mais **l'écran est resté sur le formulaire** (aucune redirection, aucun message visible) — risque pour l'ingénieur de recliquer et de créer un doublon. Deux autres créations faites dans les mêmes conditions ont redirigé normalement, et le code de l'application redirige bien. À reproduire à la main une fois.

## 18. Recherche globale, page hors connexion, seuils, page Modifier — ✅ en place

- **Recherche globale (Ctrl+K)** : trouve le chantier par son nom (« TEST INGENIEUR — Voirie 1,2 km + assainissement ») et propose d'y aller.
- **Hors connexion** : la page s'affiche (« Hors connexion »). Réserve mineure : elle conserve la barre latérale et la recherche, alors qu'un écran plein écran serait plus lisible pour un chef de chantier privé de réseau.
- **Alertes et seuils** : le chantier affiche « Seuil d'alerte : 10 % » (paramétrable, RG-07) et la liste des alertes ouvertes.
- **Page « Modifier le chantier »** : tous les champs présents (identité, marché, description de l'ouvrage pour une route : longueur, largeur, voies, accotements, revêtement, GPS, seuil d'alerte écart de quantité).

---

## Données de test créées (à conserver ou nettoyer sur accord)


- Chantier « TEST INGENIEUR — Voirie 1,2 km + assainissement » (`a1e814ea-8072-4882-9506-dafbd743a6aa`), 6 tâches de planning.
- Journal `dac73e20-010a-4f74-ba0b-558926b5fa6c` (validé) + 2 000 m² de décapage.
- Import DQE 3 postes, 1 dépense 170 000 FCFA, exports Excel de test.
- **Livraison** (partie 2) : Laterite 120, commandée 150, mise en œuvre 60, bon `TEST-BL-2026-01`, du 19/10/2026.
- **Chantiers de test** (partie 3) : « TEST INGENIEUR 2 — Route 1,2 km troncons 250 m », « TEST INGENIEUR 2 — Route 1,2 km », « TEST INGENIEUR 3 — controle message » (avec 5 sections), « TEST INGENIEUR 4 — sans sections ». À supprimer en même temps que le chantier principal.
- Compte de test : `test-pc-20261018@example.com`.
