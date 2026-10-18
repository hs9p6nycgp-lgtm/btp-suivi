# TODO_UI — Bugs d’affichage à corriger

Tous les bugs d’affichage (BUG-001 à BUG-004) sont corrigés.

| Réf  | Description courte | Statut |
|------|-------------------|--------|
| TODO-UI-001 | Icône « Aucune alerte en cours » en vert | ✅ CORRIGÉ |
| TODO-UI-002 | Drapeau « English » incorrect (🇫🇧 → 🇬🇧) | ✅ CORRIGÉ |
| TODO-UI-003 | Libellé « Total items » identique FR/EN | ✅ CORRIGÉ |
| TODO-UI-004 | Boutons « Supprimer » sans effet sur le journal | ✅ CORRIGÉ |
| TODO-UI-005 | Impossible de créer un chantier ; types de chantier détaillés manquants | 🔍 CAUSE TROUVÉE (côté base, réparation à appliquer) + types détaillés à brancher |
| TODO-UI-006 | Pas d'icône/raccourci « Calcul de devis » sur la page d'accueil | ⏳ À FAIRE |

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
- **Ce qui reste à votre responsabilité (Session 1 — interface)** :
  1. Ajouter les types détaillés dans le formulaire (`src/app/chantiers/nouveau/page.tsx`) : importer `typesDetaillesPour` depuis `@/lib/chantiers/types` (liste officielle : terrassement, chaussée, assainissement, ouvrage d'art, voirie urbaine, route rurale / fondations, gros œuvre, charpente-couverture, finitions, second œuvre, bâtiment industriel) et enregistrer le choix dans le champ `type_detail`.
  2. Facultatif : afficher le sous-type dans la fiche chantier.
- **Priorité** : haute (bloquant pour l'utilisateur).

---

## TODO-UI-006 — Icône / raccourci « Calcul de devis » sur la page d'accueil (nouveau)

- **Écran** : Accueil (`src/app/page.tsx`). Le menu latéral (`src/components/layout/Sidebar.tsx`) possède **déjà** l'entrée « Calcul de devis » (`nav.devis`, icône `Calculator` de `lucide-react`, lien `/calculateurs/devis`) — ne pas la retirer.
- **Demande de l'utilisateur** : disposer d'une icône « Devis » bien visible depuis le menu d'accueil.
- **À faire (Session 1)** : ajouter sur la page d'accueil un raccourci visible (carte ou bouton) « Calcul de devis » pointant vers `/calculateurs/devis`, avec l'icône `Calculator` déjà utilisée dans la barre latérale. Suggestion : une petite section « Outils » (2 cartes : « Calcul de devis » et « Calcul de murs » → `/calculateurs/mur`) au-dessus ou au-dessous des alertes, pour ne pas toucher au reste de la mise en page.
- **Priorité** : moyenne (confort d'utilisation).

---

*Fin de TODO_UI.md.*
