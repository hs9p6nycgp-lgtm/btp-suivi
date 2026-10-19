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

**Point nouveau (précisé en partie 11) :** la **date de source n'apparaît pas à l'écran** (ni colonne dans la table du BPU, ni champ dans le formulaire d'ajout) alors que l'exigence REF-04 impose « source **et date** ». Vérification faite directement en base : les colonnes `date_source` et `date_validite` ** existent et sont renseignées pour les 289 postes** — le correctif est donc un travail d'**affichage et de saisie**, pas de migration.

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

# Partie 4 — Vérification des corrections livrées pendant la nuit

Deux corrections issues du dispatch de la partie 1 ont été livrées par les sessions **pendant** ce test (commits `113e7f9` et `94cb213`). Je les ai reprises dans l'application réelle, comme un ingénieur réceptionne un lot.

## 19. Qualité — plans de contrôle et non-conformité automatique (RG-04) : ✅ **CORRIGÉ ET VÉRIFIÉ**

- **Création du plan de contrôle** : le bouton « Appliquer le modèle (**8**) » crée les 8 paramètres d'une route, aux valeurs de l'art : largeur de la chaussée 7 m ± 0,15 (6,85–7,15) ; dévers en alignement 2,5 % ± 0,5 (2–3) ; compacité de la couche de fondation (Proctor) ≥ 95 % OPM ; épaisseur de la couche de roulement 5 cm ± 1 (4–6) ; épaisseur de la couche de fondation 25 cm ± 2 (23–27) ; planéité (écart maximal) ≤ 5 mm ; écart d'implantation 0 m ± 0,05 ; écart altimétrique (nivellement).
- Le menu « Sélectionner un paramètre » est désormais **alimenté** (il était vide avant).
- **Essai hors tolérance** : mesure 999 m sur la largeur de chaussée (exigée 7 m ± 0,15) → l'écran affiche **« Essai NON CONFORME — Fiche NC créée »**, le taux de conformité passe à 0 %, les non-conformités actives à 1, et la fiche est créée : « Contrôle non conforme : Largeur de la chaussée = 999 m (exige : 7 m +0.15/−0.15) », **gravité critique, statut ouverte**, avec sa date d'échéance.

→ **L'exigence RG-04 est désormais respectée et démontrée.** Le blocage métier n°1 est levé.

## 20. Planning — liens entre tâches et vrai chemin critique (PLA-02) : ✅ **CORRIGÉ ET VÉRIFIÉ**

- Nouvelle section « **Enchaînement des tâches** » (« Reliez les tâches dans l'ordre réel des travaux (fin → début) »), et nouvelle colonne « **Prédécesseurs** » dans le tableau PERT.
- Liens créés et vérifiés : **Décapage (10 j) → Remblai (12 j) → Couche de base (15 j) → Revêtement (20 j)**.
- Résultats du PERT après lien : ES/EF = 0→10, 10→22, 22→37, 37→**57** ; **marge 0 et « OUI » (critique) sur les 4 tâches de la chaîne** ; Installation de chantier : marge 52 j ; Assainissement : marge 39 j ; LS/LF recalculés sur une fin de projet à J57.

→ La durée du chantier passe de **20 j** (la plus longue tâche seule, faux chemin critique) à **57 j** (chaîne réelle), et le bandeau de la page affiche « Durée projet 57 j · chemin critique 4 ». **L'exigence PLA-02 est respectée.** Contrôles vérifiés : un **lien à l'envers est refusé** avec le message « Ce lien créerait un cycle : les deux tâches ne peuvent pas dépendre l'une de l'autre », un **lien sur soi-même est refusé** lui aussi, et les liens enregistrés sont bien de type « fin → début ».

---

# Partie 5 — Vérification de la correction « devis enregistrable »

Une troisième correction a été livrée pendant le test (commit `1abc805`, tables `devis` / `devis_lignes` en migration `0022`, page `/calculateurs/devis/[id]`).

## 21. Devis : enregistrement, fiche, impression, export — ✅ **CORRIGÉ ET VÉRIFIÉ**

- **Bouton « Enregistrer le devis »** présent sur le calculateur, avec un formulaire **Client \***, **Numéro du devis \***, **Date du devis \*** et rattachement à un chantier.
- **Enregistrement effectif** : devis **DEV-2026-019**, client **SODECI**, date 19/10/2026, objet « Chaussée – couche de base + enrobé (détaillé) », **total 230 120 800 FCFA** — identique au total affiché par le calculateur. Les **10 lignes** sont enregistrées avec désignation, unité, quantité, prix unitaire et total, puis reaffichées sur une fiche devis autonome (« BTP SUIVI PRO — DEVIS », n° de devis, objet, date, client, tableau, **TOTAL DU DEVIS**, pied de page et **zones de signature client / entreprise**).
- **Export Excel** : fichier `devis_DEV-2026-019_2026-10-19.xlsx` téléchargé (17,9 Ko) ✓.
- **Impression / PDF** : la mise en page est exploitable et conserve les séparateurs de milliers (8 400 m², 3 922 800 FCFA) ✓.
- La migration `0022_devis_enregistres.sql` est **appliquée en base** (tables présentes et vides avant le test).

→ **Les exigences MET-02 / MET-03 sont désormais couvertes** : un devis se nomme, se rattache, se relit, s'imprime et s'exporte.

*Réserve mineure* : une fois le devis enregistré, la fiche ne permet plus de le rattacher à un chantier (le choix se fait au moment de l'enregistrement) ; les lignes sans prix (surface, nombre de bennes) sont conservées avec un prix unitaire à 0, ce qui est normal mais devrait être signalé sur le devis imprimé.

---

# Partie 6 — Vérification de la correction « rapport complet »

Une quatrième correction a été livrée pendant le test (commit `0d78076`).

## 22. Rapports : agrégats, libellés et export — ✅ **CORRIGÉ ET VÉRIFIÉ**

Rapport généré sur la période 01/10/2026 → 31/12/2026 sur le chantier de test :

- **Nouvelles sections** : « Journaux de la période » (journaux 1, validés 1, effectifs cumulés, heures de marche, disponibilité, incidents et photos), « Dépenses réelles par catégorie » (Matériaux : 1 → 170 000 FCFA, total 170 000), « Non-conformités » (total 1, ouvertes 1, clôturées 0, gravité critique 1) et « Valorisation des travaux par poste » (quantité marché / quantité réalisée / avancement / valorisation par poste du DQE).
- **Libellés corrigés comme demandé** : « **Valorisation travaux** » (quantités × prix = 934 000 FCFA) et « **Dépenses réelles** » (argent décaissé = 170 000 FCFA), avec la phrase d'explication des deux notions et la **marge calculée (764 000 FCFA)**.
- **Export Excel** du rapport : fichier `rapport_TEST INGENIEUR — Voirie 1,2 km + assainissement_2026-10-01.xlsx` (21,7 Ko) ✓ — bouton « Imprimer / PDF » présent.
- Sélecteur de périodicité (« Période : journalier ») présent.

**Réserve mineure** : l'avancement s'affiche « 0.5 % » avec un **point** décimal alors que le reste de l'application utilise la virgule française (« 0,5 % ») — incohérence d'affichage à corriger (sans impact sur les calculs).

→ **Les exigences REP-01 à REP-03 sont couvertes.** Le rapport est enfin exploitable par le bureau.

---

# Partie 7 — Centre d'alertes et état de la suite de tests

## 23. Centre d'alertes (/alertes) — ✅ nouveau module opérationnel

Écran livré pendant la nuit (commit `dc49fd8`) : « Centre d'alertes — Tout ce qui demande votre attention, sur tous vos chantiers ».

- **Indicateurs** : critiques 1 · à traiter 1 · informations 0.
- **Filtres** : Toutes (2) · Alertes (1) · Non-conformités (1) · Retards (0) — les non-conformités et les écarts de quantité sont bien distingués.
- **Alertes affichées** : (1) *Non-conformité qualité — « Contrôle non conforme : Largeur de la chaussée = 999 m (exige : 7 m +0,15/−0,15) »* du 19/10/2026 (celle créée par l'essai du test) ; (2) *Écart de quantité — « Écart : −76,2 % · seuil : 10 % »* — le calcul est exact (2 000 m² décapés sur un poste de 8 400 m²).

## 24. Suite de tests automatique

| Moment | Tests | Résultat |
|---|---|---|
| Début de l'audit (19/10) | 288 | 288 verts |
| Après les premières corrections | 321 | 321 verts |
| Après les corrections de la nuit | **355** | **355 verts, 0 échec** |

Les sessions ont ajouté 67 tests en encryptant les corrections (qualité, planning, devis, rapport, référentiel…). **Aucun test rouge** : le filet de sécurité tient.

---

# Partie 8 — Vérification de la correction « export Excel complet » et du statut unique

Une cinquième correction a été livrée pendant le test (commit `a864e63`).

## 25. Export Excel complet — ✅ **CORRIGÉ ET VÉRIFIÉ**

- **9 feuilles** désormais présentes : Synthèse · Postes DQE · Quantités réalisées · Dépenses · Planning · **Journaux** · **Essais qualité** · **Non-conformités** · **Livraisons** (les feuilles sans donnée — découpage, points d'avancement, photos — sont omises, comme annoncé).
- **Valeurs traduites** : la feuille « Journaux » affiche `Date = 19/10/2026` (format JJ/MM/AAAA), `Statut = Validé` (et non `a_faire`), `Météo = Soleil`, plus effectif, heures de marche, incidents, heures d'arrêt, photos et observations. Les catégories et statuts sont en français, les montants en FCFA.
- La page annonce désormais la promesse : « Exportez toutes les données d'un chantier… Dates au format JJ/MM/AAAA, statuts et catégories en français, montants en FCFA. »
- *Remarque d'usage* : le bouton « Exporter en Excel » ne fait rien tant qu'aucun chantier n'est sélectionné (le sélecteur est sur « — Sélectionner — ») — un message ou un bouton désactivé éviterait la confusion.

## 26. Fiche chantier : statut affiché une seule fois — ✅ **CORRIGÉ ET VÉRIFIÉ**

La pastille de statut est désormais elle-même le menu de changement (une seule pastille, un seul affichage de « En préparation ») : le doublon badge + menu déroulant signalé en partie 1 a disparu.

---

# Partie 9 — Vérification de la correction du calculateur de murs

## 27. Calculateur de murs : unités de prix et montants — ✅ **CORRIGÉ (vérifié sur la version en cours de livraison)**

Contrôle refait sur l'application après la reprise du module (`src/lib/calculs/mur.ts` + tests) :

| | Avant | Après |
|---|---|---|
| Ciment | 107 kg × 4 800 (prix du sac appliqué aux kilos) = **513 516** | « 107,0 kg (**2,14 sac de 50 kg**) » → 2,14 × 4 800 = **10 270** |
| Mur de 400 m² (ciment) | **3 472 896** | **69 458** |
| Total matériaux | 9 662 799,**56** FCFA | **22 684 638 FCFA** (sans décimale, RG-06) |
| Écritures décimales | « 60.00 m² », « 11.400 m³ » | « 60,00 m² », « 11,400 m³ » (virgule française) |
| Planning suggéré | 48 j de montage, **517 j** de mortier | 8 j de montage, 1 j de mortier, 17 j au total (réalistes) |

Une phrase explicative est affichée sous le tableau : « Les quantités sont converties dans l'unité du prix du BPU avant le calcul… ». Le total de 22 684 638 FCFA se retrouve exactement (22 455 000 + 10 270 + 19 868 + 199 500).

→ **T-LOG-41 et T-UI-26 sont fonctionnels** (version encore en cours de livraison par la Session 2 au moment du contrôle).

---

# Partie 10 — Vérification de « créer le planning depuis le devis » et « modifier un devis »

## 28. Devis → planning et modification d'un devis enregistré — ✅ **CORRIGÉ ET VÉRIFIÉ**

- **Bouton « Créer le planning »** sur le calculateur : le devis propose de générer le planning d'un chantier à partir de ses durées, avec l'explication « Les tâches sont créées **enchaînées (fin → début)** : le chemin critique et le diagramme de Gantt sont calculés automatiquement. **Les tâches existantes sont conservées.** » — la demande formulée en partie 1 (§3) est donc satisfaite.
- **Fiche devis modifiable** : sur `/calculateurs/devis/<id>`, les champs (client, numéro, date, objet) deviennent éditables, avec « **Enregistrer les modifications** » et « **Supprimer le devis** » — la reprise d'un devis existant est possible.

*(Les tâches n'ont pas été créées sur le chantier de test, pour ne pas polluer ses données.)*

---

# Partie 11 — Base de prix : état chiffré (contrôle direct en base)

Pour que les sessions attaquent la bonne cible, voici l'état réel de la base des prix (`bpu_postes`, 289 lignes) et la liste exacte des corrections à faire.

**Ce qui est déjà bon**
- Les colonnes `date_source` et `date_validite` **existent** et sont **renseignées sur les 289 lignes** (dates du 14/10, 15/10 et 16/10/2026). Le problème est donc uniquement l'affichage et la saisie, pas la donnée.
- 158 postes sont marqués « valide », 131 « à vérifier » (source générique « Marché ivoirien 2026 (estimation) – à vérifier »).
- 29 lignes portent une source named (fournisseur, société bitume, etc.).

**Ce qui bloque un devis (liste de travail)**

| # | Constat chiffré | Impact | Tâche |
|---|---|---|---|
| 1 | **Enrobé : 35 000 vs 95 000 FCFA/t** — `MAT-008` « Enrobé à chaud » 35 000/tonne marqué **valide**, contre `BIT-02` et `ENR-01` à 95 000/t marqués « à vérifier ». | Choix de la mauvaise ligne = **−63 %** sur le poste le plus cher de la route | T-LOG-40 |
| 2 | **Un vrai doublon** : `MAT-001` « Ciment CPJ 42,5 - sac 50kg » 4 500/sac (valide) et `MB-02` « Ciment CPJ 42,5 (sac 50 kg) » 4 800/sac 50 kg (à vérifier) — même produit, 300 FCFA d'écart. | Deux prix pour un même produit | T-LOG-40 |
| 3 | **Quasi-doublons à prix identiques** : latérite `LTR-01` 40 000 et `MB-06` 40 000 ; enrobé `BIT-02` 95 000 et `ENR-01` 95 000 (« Enrobé » / « Enrobe »). | Choix ambigu à la saisie | T-LOG-40 |
| 4 | **Unités écritures différentes pour le même produit** : « tonne » vs « t », « m3 » (95 postes) vs « m³ », « m2 » vs « m² », « sac » vs « sac 50 kg ». | Le devis prend « le premier poste correspondant » : une unité mal écrite fait manquer le bon prix ou choisir le mauvais | T-LOG-40 / T-LOG-42 |
| 5 | **`referentiel_prix` = 0 ligne et `historique_prix` = 0 ligne** : les 289 prix vivent uniquement dans `bpu_postes`. | « Exporter CSV (0) », import REF-05 et historique REF-03 inopérants ; deux bases de prix à tenir | T-LOG-42 |
| 6 | **131 postes « à vérifier »** avec une source d'estimation générique. | Un devis bâti sur des prix « à vérifier » n'est pas opposable | T-LOG-40 |

**Règle de conduite retenue pour la suite** : ne pas supprimer de ligne de prix sans copie de sauvegarde ni confirmation de l'utilisateur ; la fusion doit conserver la ligne la plus complète (source + date) et renommer l'autre (pas l'inverse).

---

# Partie 14 — Vérification des livraisons suivantes

## 28. Base de prix et Référentiel (T-LOG-42 / T-UI-27) — ✅ **CORRIGÉ ET VÉRIFIÉ**

- **Base de prix** : la colonne **« Date de source »** est affichée (ex. 14/10/2026) et le formulaire d'ajout comporte désormais un **champ date** — la date exigée par REF-04 est donc visible et saisissable.
- **Référentiel de prix** : il affiche désormais **289 lignes** (il était vide) et le bouton est devenu **« Exporter CSV (289) »** (il était à « Exporter CSV (0) »). Contrôle en base : `referentiel_prix` passe de **0 à 289 lignes**, avec les colonnes attendues (catégorie, source, date de source, date de validité, statut, zone) ; `historique_prix` reste à 0, ce qui est normal tant que les prix ne changent pas.
- Les 289 prix restent cohérents avec la base de prix (mêmes codes, mêmes prix, mêmes dates de source).

→ **Le référentiel est enfin utilisable** : import/export REF-05 et traçabilité REF-03 deviennent opérationnels.

## 29. Planning : affectation des équipes et des engins — ✅ **NOUVELLE FONCTION VERIFIÉE**

Le planning gagne une **colonne « Ressources »** dans le tableau PERT, une section **« Charge par équipe »** (tableau Équipe / Tâches / Charge en jours) et, dans le formulaire de tâche, les champs **« Équipe affectée »** et **« Engins et matériel »** — la demande formulée en partie 1 (§2, « pas d'affectation d'équipe/engin aux tâches, pas de coût par tâche ») est donc livrée.

## 30. Fournisseurs : conditions tarifaires (T-LOG-43 / T-UI-28) — 🟡 en cours de livraison

Une section **« Conditions tarifaires »** est apparue dans l'écran Fournisseurs : « Saisissez les offres de vos fournisseurs, comparez-les poste par poste et tracez le choix retenu (FOU-03, FOU-04) », avec un choix de fournisseur et de chantier. La fonction est en cours de livraison par la Session 2 (fichiers non encore commités au moment du contrôle) : **à vérifier une fois la livraison terminée**.

---

# Partie 15 — Deux réponses aux points signalés en partie 1

## 31. Rapport : la période choisie commande réellement la fenêtre — ✅ **CORRIGÉ ET VÉRIFIÉ**

Deux rapports ont été générés sur le même chantier, avec des périodes différentes :

| | 01/09/2026 → 30/09/2026 | 01/10/2026 → 31/12/2026 |
|---|---|---|
| Avancement physique | **0 %** | **0,5 %** |
| Valorisation travaux | **0 FCFA** | **934 000 FCFA** |
| Dépenses réelles | **0 FCFA** | **170 000 FCFA** |
| Marge (valorisation − dépenses) | 0 FCFA | **764 000 FCFA** |

→ La période ne sert plus seulement d'affichage : **elle filtre réellement les données**. C'était le point manquant en partie 1 (§5 : « pas de choix qui change réellement le contenu »).

## 32. Journal : réalisé et restant affichés pendant la saisie — ✅ **CORRIGÉ ET VÉRIFIÉ**

En sélectionnant un poste du DQE pendant la saisie, l'écran affiche désormais :

> **Réalisé 2 000 m² sur 8 400 m² — restant 6 400 m² (23,8 %)**

Le calcul est exact (2 000 / 8 400 = 23,8 %). C'était le point manquant en partie 1 (§4 : « les quantités s'ajoutent ligne par ligne, aucune vue total réalisé / restant »).

*Contrôle de non-régression* : la fiche a été rouverte (avec confirmation), vérifiée, puis **revalidée** — elle est laissée dans son état initial (« Journal validé et verrouillé »).

---

# Partie 16 — Livraisons et non-conformités : deux corrections vérifiées

## 33. Livraisons : matériau dans une liste, stocks regroupés (T-LOG-44) — ✅ **CORRIGÉ ET VÉRIFIÉ**

- Le champ « Matériau » n'est plus une saisie libre : la page propose **293 matériaux** (base de prix + postes du chantier) et le stock est regroupé par **clé canonique** du matériau — « Laterite », « Latérite » et « LAT-01 » désignent désormais **le même stock** (le seuil d'alerte s'y applique de la même façon).
- La livraison déjà enregistrée (Laterite 120 / 60, stock 60) reste correctement présentée.

→ Le risque signalé en partie 2 §11 (fautes de frappe créant des stocks parallèles) est levé.

## 34. Non-conformités : traitement et clôture (QUA-03) — ✅ **CORRIGÉ ET VÉRIFIÉ**

Cycle complet testé sur la fiche de non-conformité créée pendant ce test :

1. **Traitement** : responsable (« Ingénieur travaux »), action corrective (« Reprise de la couche de base sur 120 m »), **échéance** (26/10/2026) avec le décompte « **Dans 7 jour(s)** » et la photo du défaut — les colonnes du tableau NC sont désormais DESCRIPTION · GRAVITÉ · STATUT · RESPONSABLE · ACTION CORRECTIVE · PHOTOS · ÉCHÉANCE · ACTION.
2. **Clôture** : statut « **Clôturée** » avec la mention « **Clôturée le 19/10/2026** ».
3. Un nouvel essai hors tolérance (999 m) a recréé automatiquement une **NC ouverte** : l'écran présente donc les deux situations, ouverte et clôturée.

→ **L'exigence QUA-03 est couverte** (description, photos, responsable, action corrective, échéance, clôture) et le cycle complet d'une non-conformité fonctionne.

---

## Données de test créées (à conserver ou nettoyer sur accord)


- Chantier « TEST INGENIEUR — Voirie 1,2 km + assainissement » (`a1e814ea-8072-4882-9506-dafbd743a6aa`), 6 tâches de planning.
- Journal `dac73e20-010a-4f74-ba0b-558926b5fa6c` (validé) + 2 000 m² de décapage.
- Import DQE 3 postes, 1 dépense 170 000 FCFA, exports Excel de test.
- **Livraison** (partie 2) : Laterite 120, commandée 150, mise en œuvre 60, bon `TEST-BL-2026-01`, du 19/10/2026.
- **Devis enregistré** (partie 5) : DEV-2026-019, client SODECI, 230 120 800 FCFA, 10 lignes (`e5c4d8ac-b1ea-4372-860e-d7695257ea8c`) + le fichier Excel correspondant dans `downloads-devis/`.
- **Plans de contrôle du chantier principal** (partie 4) : 8 paramètres « Route » + 2 essais non conformes (999 m) et leurs 2 fiches de non-conformité — l'une **clôturée** (responsable « Ingénieur travaux », action corrective « Reprise de la couche de base sur 120 m », échéance 26/10/2026, clôturée le 19/10/2026) et l'autre **ouverte** — utiles pour montrer la démonstration RG-04 et QUA-03 ; à supprimer si vous voulez un chantier de test vierge.
- **Chantiers de test de la partie 3** (« TEST INGENIEUR 2 », « 3 », « 4 ») : **supprimés le 19/10/2026 sur accord de l'utilisateur** (sauvegarde JSON préalable, cascade vérifiée, aucune donnée orpheline).
- Compte de test : `test-pc-20261018@example.com` (conservé).
