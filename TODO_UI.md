# TODO_UI — Bugs d’affichage à corriger

Ce fichier liste les bugs d’affichage (UI) rencontrés lors des tests.
Chaque entrée référencie le bug correspondant dans `BUGS.md` (BUG-001 à
BUG-004) ; les corrections à prévoir y sont décrites avec le détail.

| Réf  | Description courte                                            |
|------|-------------------------------------------------------------|
| TODO-UI-001 | Icône « Aucune alerte en cours » en vert sur le tableau de bord |
| TODO-UI-002 | Drapeau « English » incorrect (🇫🇧 au lieu de 🇬🇧) dans la Sidebar |
| TODO-UI-003 | Libellé « Total items » identique en français et en anglais sur la page BPU |
| TODO-UI-004 | Boutons « Supprimer » sans effet sur le journal de chantier |

---

## TODO-UI-001 — Icône « Aucune alerte en cours » en vert (BUG-001)

- **Écran** : Accueil — section « Alertes en cours » (`src/app/page.tsx`).
- **À corriger** : remplacer `text-success` par une classe neutre
  (`text-muted` ou `text-warning`), cohérente avec l’absence d’alerte.
- **Priorité** : faible (cosmétique).

---

## TODO-UI-002 — Drapeau « English » incorrect (BUG-002)

- **Écran** : Navigation latérale (`src/components/layout/Sidebar.tsx`).
- **À corriger** : le bouton affichant « English » utilise le drapeau 🇫🇧
  (Bénin) ; il doit utiliser 🇬🇧. Vérifier aussi les libellés bilingues
  des autres menus de langue.
- **Priorité** : faible.

---

## TODO-UI-003 — Libellé « Total items » identique en FR/EN (BUG-003)

- **Écran** : Page BPU (`src/app/bpu/page.tsx`).
- **À corriger** : la propriété `title` de la carte est
  `langue === "fr" ? "Total items" : "Total items"` ; les deux branches
  doivent porter des libellés différents (par exemple « Total des postes »).
- **Priorité** : faible.

---

## TODO-UI-004 — Boutons « Supprimer » sans effet (BUG-004)

- **Écran** : Journal de chantier
  (`src/app/chantiers/[id]/journaux/[journalId]/page.tsx`).
- **À corriger** : les quatre boutons « Supprimer » (effectifs, engins,
  incidents, quantités réalisées) n’ont aucun gestionnaire d’événement.
  Ajouter le handler de suppression correspondant aux autres pages
  (par exemple la page des livraisons, qui appelle `handleRemove`).
- **Priorité** : moyenne (perte de données si la suppression est voulue).

---

*Fin de TODO_UI.md.*
