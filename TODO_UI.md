# TODO_UI — Bugs d’affichage à corriger

Tous les bugs d’affichage (BUG-001 à BUG-004) sont corrigés.

| Réf  | Description courte | Statut |
|------|-------------------|--------|
| TODO-UI-001 | Icône « Aucune alerte en cours » en vert | ✅ CORRIGÉ |
| TODO-UI-002 | Drapeau « English » incorrect (🇫🇧 → 🇬🇧) | ✅ CORRIGÉ |
| TODO-UI-003 | Libellé « Total items » identique FR/EN | ✅ CORRIGÉ |
| TODO-UI-004 | Boutons « Supprimer » sans effet sur le journal | ✅ CORRIGÉ |
| TODO-UI-005 | Impossible de créer un chantier ; types de chantier détaillés manquants | 🟡 INTERFACE FAITE · base : migration 0015 à appliquer (bloquant) |
| TODO-UI-006 | Pas d'icône/raccourci « Calcul de devis » sur la page d'accueil | ✅ CORRIGÉ |

---

## TODO-UI-001 — Icône « Aucune alerte en cours » en vert (BUG-001)

- **Écran** : Accueil — section « Alertes en cours » (`src/app/page.tsx`).
- **Corrigé** : `text-success` remplacé par `text-muted` (ligne 450).
- **Priorité** : faible (cosmétique).

---

## TODO-UI-002 — Drapeau « English » incorrect (BUG-002)

- **Écran** : Navigation latérale (`src/components/layout/Sidebar.tsx`).
- **Corrigé** : 🇫🇧 remplacé par 🇬🇧 (ligne 167).
- **Priorité** : faible.

---

## TODO-UI-003 — Libellé « Total items » identique en FR/EN (BUG-003)

- **Écran** : Page BPU (`src/app/bpu/page.tsx`).
- **Corrigé** : branche FR affiche « Total des postes » (ligne 125).
- **Priorité** : faible.

---

## TODO-UI-004 — Boutons « Supprimer » sans effet (BUG-004)

- **Écran** : Journal de chantier
  (`src/app/chantiers/[id]/journaux/[journalId]/page.tsx`).
- **Corrigé** : les 4 boutons appellent `removeItem(table, id)` (lignes ~284, 305, 332, 361).
- **Priorité** : moyenne.

---

## TODO-UI-005 — Impossible de créer un chantier / types détaillés manquants (nouveau)

- **Écran** : Création de chantier (`src/app/chantiers/nouveau/page.tsx`).
- **Problème signalé** : le formulaire ne permet pas de créer un chantier. Le champ « Type de chantier » ne propose que « Route » ou « Bâtiment » ; il n'y a pas de types détaillés (ex. : ossature, charpente pour un bâtiment ; terrassement, chaussée pour une route).
- **Cause racine trouvée (Session 2, 17/10/2026)** : le bouton fonctionne, mais l'INSERT est refusé par la base : les colonnes `longueur`, `largeur`, `hauteur` (envoyées par le formulaire) sont **absentes de la base distante** (migration 0009 appliquée partiellement). Erreur exacte : `Could not find the 'hauteur' column of 'chantiers' in the schema cache` (HTTP 400, PGRST204). Reproduit par un test de bout en bout avec un compte réel.
- **Réparation prête (Session 2)** : migration `supabase/migrations/0015_reparation_colonnes_chantiers.sql` (ajoute `longueur`, `largeur`, `hauteur`, `type_detail`). **À appliquer dans le SQL Editor de Supabase** (bloquant). Ensuite, la création de chantier doit fonctionner sans changement d'interface.
- **Ce qui reste à votre responsabilité (Session 1 — interface)** : ✅ FAIT (18/10/2026).
  1. Le formulaire propose désormais un champ **« Sous-type (phase de travaux) »** (`src/app/chantiers/nouveau/page.tsx`) : la liste vient de `typesDetaillesPour` (`@/lib/chantiers/types`) et s'adapte au type choisi (Route/Bâtiment) ; le choix est enregistré dans `type_detail` (protection `estTypeDetailValide` avant l'envoi).
  2. Fait aussi : le sous-type s'affiche dans le **bandeau de la fiche chantier** (pastille à côté du statut) et dans la **liste des chantiers** (sous le type, et sous le nom en vue cartes).
- **Rappel** : la migration `0015` doit toujours être appliquée dans le SQL Editor de Supabase pour que la création de chantier fonctionne ; le champ `type_detail` en fait partie.
- **Priorité** : haute (bloquant pour l'utilisateur).

---

## TODO-UI-006 — Icône / raccourci « Calcul de devis » sur la page d'accueil (nouveau)

- **Écran** : Accueil (`src/app/page.tsx`). Le menu latéral (`src/components/layout/Sidebar.tsx`) possède **déjà** l'entrée « Calcul de devis » (`nav.devis`, icône `Calculator` de `lucide-react`, lien `/calculateurs/devis`) — ne pas la retirer.
- **Demande de l'utilisateur** : disposer d'une icône « Devis » bien visible depuis le menu d'accueil.
- **À faire (Session 1)** : ✅ FAIT (18/10/2026). Une section **« Outils rapides »** a été ajoutée sur la page d'accueil (`src/app/page.tsx`), juste sous les chiffres clés : deux cartes très visibles — **« Calcul de devis »** (icône `Calculator`, lien `/calculateurs/devis`) et **« Calcul de murs »** (icône `Ruler`, lien `/calculateurs/mur`).
- **Priorité** : moyenne (confort d'utilisation).

---

## TODO-UI-007 — Vue 3D d'un devis (nouveau)

- **Écran** : Calculateur de devis (`src/app/calculateurs/devis/page.tsx`).
- **Demande de l'utilisateur (18/10/2026)** : « quand on finit de faire un devis, on veut aussi modéliser le projet en 3D ».
- **Côté logique (Session 2) : ✅ FAIT (18/10/2026)** — module `src/lib/devis/model3d.ts` (couvert par 18 tests) :
  - `modele3dDevis(template, inputs)` convertit les entrées du devis en scène 3D (« boites » et « cylindres »). `template` est le modèle de devis déjà sélectionné dans la page (celui de la ligne 17). Retourne `null` uniquement si le modèle n'a pas de 3D — aucun des 15 modèles actuels n'est concerné.
  - Objet retourné : `{ templateId, nom, resume, dimensions, centre, elements }`.
  - Conventions (documentées en tête du fichier) : mètres ; X = longueur, Y = hauteur (vers le haut), Z = largeur ; sol à Y = 0 ; `position` = **centre** de l'élément ; `rotation` en **degrés** (un seul axe à la fois) ; `dimensions` + `centre` = boîte englobante pour cadrer la caméra.
- **À faire (Session 1 — interface)** :
  1. Après la zone de résultats/total du devis, ajouter une section (ou un onglet) **« Vue 3D du projet »**.
  2. Données : `const modele = useMemo(() => modele3dDevis(template, inputs), [template, inputs]);` — recalcul immédiat dès qu'un modèle ou une entrée change (rien n'est stocké en base).
  3. Rendu conseillé : s'inspirer de `src/components/visualisation/Modele3D.tsx` (three.js déjà installé, rotation à la souris) dans un composant générique à créer, par ex. `src/components/visualisation/Modele3DGenerique.tsx` :
     - `boite` → `THREE.BoxGeometry(taille[0], taille[1], taille[2])` ;
     - `cylindre` → `THREE.CylinderGeometry(taille[0] / 2, taille[0] / 2, taille[1])` (axe vertical par défaut) ;
     - appliquer `element.position` (centre) et `element.rotation` convertie en radians (`THREE.MathUtils.degToRad`) ;
     - cadrer la caméra sur `modele.centre`, distance ≈ 1,8 × la plus grande valeur de `modele.dimensions` ; garder la grille au sol à Y = 0 (des éléments sont sous le sol : pieux, conduites, regards) ;
     - afficher `modele.resume` sous le rendu (phrase explicative en français).
  4. Astuce : les 15 modèles ont tous une vue 3D ; il n'y a donc pas d'affichage « vide » à gérer pour l'instant.
- **Priorité** : moyenne (fonctionnalité demandée par l'utilisateur).

---

*Fin de TODO_UI.md.*
