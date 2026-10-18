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
| TODO-UI-007 | Pas de vue 3D du projet dans le calculateur de devis | ✅ CORRIGÉ |
| TODO-UI-008 | Journal : « Créer le journal » qui résiste au réseau faible (blocage n°1 du terrain) | ✅ FAIT (18/10/2026) |
| TODO-UI-009 | Photos : compression avant téléversement (+ bascule optionnelle sur `urlsSignees`) | ✅ FAIT (18/10/2026) |
| TODO-UI-010 | Accueil : carte « À faire aujourd'hui » | ✅ FAIT (18/10/2026) |
| TODO-UI-011 | Accueil : détail d'alerte lisible (« Valeur / Seuil » bruts) | ✅ FAIT (18/10/2026) |
| TODO-UI-012 | Création de chantier : formulaire par étapes, position GPS automatique, page « Modifier le chantier » | ✅ FAIT (18/10/2026) |
| TODO-UI-013 | Fiche chantier : écran planté à l'ouverture (« This page couldn't load ») — couleur de statut inconnue du composant StatCard | 🔴 À CORRIGER — **bloquant** |
| TODO-UI-014 | Liste des chantiers : badge « En préparation » qui dépasse de sa carte (86 px) | 🔴 À CORRIGER |
| TODO-UI-015 | Accueil : « 1 chantiers » (pluriel) + dates des mini-courbes coupées | 🔴 À CORRIGER |
| TODO-UI-016 | Connexion : la coquille (barres latérale/haut/bas) s'affiche avant connexion | 🔴 À CORRIGER |

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
- **Rappel (mis à jour le 18/10/2026)** : ✅ la migration `0015` a été appliquée dans le SQL Editor de Supabase et vérifiée (`node scripts/audit-base.mjs` → « Base à jour »). La création de chantier est débloquée ; le champ `type_detail` fonctionne.
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
- **À faire (Session 1 — interface)** : ✅ FAIT (18/10/2026).
  1. Nouveau composant **`src/components/visualisation/Modele3DGenerique.tsx`** : affichage three.js d'un objet `Modele3D` de `src/lib/devis/model3d.ts` — boîtes (`BoxGeometry`) et cylindres (`CylinderGeometry`), positions/rotations respectées, grille au sol à Y = 0, caméra cadrée sur `centre`/`dimensions` (distance ≈ 1,8 × la plus grande dimension).
  2. Interactions : **glisser** = rotation autour du modèle, **molette** = zoom, **double-clic** = recentrer ; **survol** d'un élément = info-bulle avec son libellé.
  3. Animations gsap : arrivée de caméra + apparition en cascade au premier affichage (ou changement de projet) ; simple fondu lors d'une modification de saisie.
  4. Intégration dans `src/app/calculateurs/devis/page.tsx` : section **« Vue 3D du projet »** (recalcul automatique via `useMemo` + `useDeferredValue`), `modele.resume` affiché sous le rendu.
  5. Bonus au passage : le **total estimatif** du devis (calculé mais jamais affiché) est maintenant visible dans un bandeau sous les recommandations ; la page utilise l'en-tête unifié (`PageHeader`).
- **Priorité** : moyenne (fonctionnalité demandée par l'utilisateur).

---

---

## TODO-UI-008 — Journal : « Créer le journal » qui résiste au réseau faible (blocage n°1)

- **Écran** : Journal de chantier (`src/app/chantiers/[id]/journaux/page.tsx`).
- **Signalé par l'utilisateur (test terrain du 18/10/2026, `RETOURS_UTILISATEUR.md` §3)** : « quand je clique "Créer le journal" avec un mauvais réseau, rien ne se passe » ; la météo et les observations déjà tapées sont perdues.
- **État** : une partie est **déjà en cours dans la copie de travail de la Session 1** (non commitée au 18/10) — écran simplifié en une page, observations désormais enregistrées, garde-fou contre les doublons de journal du jour. **Ce qui reste : la robustesse réseau** (le point signalé).
- **Cause restante** : `handleCreate` fait un simple `insert().select().single()` : sans réseau, la requête peut ne jamais répondre (aucun délai maximal, aucun message, aucune file d'attente) ; il suffit de quitter l'écran pour tout perdre.
- **Côté logique (Session 2) : ✅ FAIT et testé** — `creerJournalHorsLigne(entree)` dans `src/lib/offline/mutations.ts` (cœur : `src/lib/journal/creation.ts`, 10 tests qui couvrent le réseau faible) :
  1. en ligne : insertion avec délai maximal (15 s) ; si la base ne répond pas, vérifie si la fiche a été créée malgré tout (réponse perdue) ;
  2. sinon : mise en file d'attente locale (IndexedDB), rejouée automatiquement à la reconnexion par `NetworkStatus.tsx` ;
  3. hors ligne connu : mise en file directe.
  - Retourne : `{ statut: "cree", id }` | `{ statut: "en_attente" }` | `{ statut: "erreur", raison: "base" | "stockage_indisponible", erreur? }`.
  - Textes prêts dans le dictionnaire : `t("journal.enregistre_hors_ligne")` et `t("journal.hors_ligne_impossible")` (`src/lib/i18n.ts`).
- **À faire (Session 1)** — remplacer le bloc `insert` de `handleCreate` par :
  ```ts
  import { creerJournalHorsLigne } from "@/lib/offline/mutations";
  // (ajouter `t` à l'import de "@/lib/i18n" s'il n'y est pas)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (journalDuJour || loading) return; // anti double-clic
    setLoading(true);
    setMessage(null);
    const resultat = await creerJournalHorsLigne({ chantierId, date, meteo, observations });
    if (resultat.statut === "cree") {
      router.push(`/chantiers/${chantierId}/journaux/${resultat.id}`);
      return;
    }
    setLoading(false);
    if (resultat.statut === "en_attente") {
      setMessage(t("journal.enregistre_hors_ligne"));   // garder date/météo/observations affichées
    } else if (resultat.raison === "stockage_indisponible") {
      setMessage(t("journal.hors_ligne_impossible"));
    } else {
      setMessage(traduireErreur(resultat.erreur ?? {}));
    }
  }
  ```
  - Après « en_attente », conseillé : afficher aussi un petit état « Enregistré sur l'appareil — en attente de réseau » à la place du bouton, pour que personne ne reclique.
  - Le message doit rester **visible près du bouton** (il est aujourd'hui en haut de page).
- **✅ FAIT (18/10/2026, Session 1)** : `handleCreate` appelle désormais `creerJournalHorsLigne` ; « en attente » et « stockage indisponible » ont chacun leur message clair, le bouton est désactivé pendant l'envoi, et un journal du même jour ne peut plus être créé en double (encart « Ouvrir ce journal » à la place).
- **Priorité** : haute (blocage n°1 du test terrain).

---

## TODO-UI-009 — Photos : compression avant téléversement

- **Écrans** : Journal de chantier, page détail (`src/app/chantiers/[id]/journaux/[journalId]/page.tsx`).
- **Signalé par l'utilisateur** : « Téléverser » peut tourner très longtemps sur réseau faible (photos de téléphone de 3 à 8 Mo).
- **État** : les vignettes, URLs signées et l'aperçu avant envoi sont **déjà en cours dans la copie de travail de la Session 1** (non commités). **Ce qui reste : compresser la photo avant l'envoi.**
- **Côté logique (Session 2) : ✅ FAIT et testé** — `compresserImage(fichier, options?)` dans `src/lib/photos/compression.ts` : redimensionne (plus grand côté ≤ 1600 px), ré-encode en JPEG (qualité 72 %), renvoie l'original si échec ou si le résultat n'est pas plus léger. Une photo de 4 Mo descend typiquement à ~300-600 Ko.
- **À faire (Session 1)** — au moment du téléversement :
  ```ts
  import { compresserImage } from "@/lib/photos/compression";
  // ...
  const fichierEnvoi = await compresserImage(photoFile);
  const path = `journaux/${journalId}/${Date.now()}-${fichierEnvoi.name}`;
  const { error: upErr } = await supabase.storage.from("chantiers-documents").upload(path, fichierEnvoi);
  ```
- **(Facultatif, recommandé)** : remplacer les appels `createSignedUrls` inline des deux pages par `urlsSignees(chemins)` (`src/lib/photos/urls.ts`) : même comportement (durée 1 h), un seul endroit à maintenir.
- **✅ FAIT (18/10/2026, Session 1)** : compression avant envoi (`compresserImage`) + bascule complète sur `urlsSignees`/`urlSignee` (page journal et galerie de l'accueil) ; aperçu local de la photo choisie avant envoi ; vignettes affichées avec repli « Photo indisponible ».
- **Priorité** : haute (fait partie des « 3 changements les plus urgents » du rapport).

---

## TODO-UI-010 — Accueil : carte « À faire aujourd'hui »

- **Écran** : Accueil (`src/app/page.tsx`).
- **Signalé par l'utilisateur** : « Rien ne me dit quoi faire aujourd'hui » (§4 du rapport).
- **État** : le bouton « Saisie du jour » direct vers le dernier chantier est **déjà en cours** (MobileNavigation + dernier chantier mémorisé, non commité). **Ce qui reste : la carte « À faire aujourd'hui » sur l'accueil.**
- **Côté logique (Session 2) : ✅ FAIT et testé**
  - `actionsDuJour(donnees)` (`src/lib/journal/actionsDuJour.ts`) : liste ordonnée — priorité 1 : saisie du jour manquante ; 2 : non-conformités ouvertes ; 3 : alertes ouvertes — avec libellé, détail, nombre et lien direct.
  - `lireDernierChantier()` (`src/lib/chantiers/dernier.ts`) : **même clé de stockage que MobileNavigation** (`btp.dernier.chantier`) — à utiliser pour le bouton de l'accueil, pour rester cohérent.
- **À faire (Session 1)** — sur l'accueil, après le chargement des données secondaires :
  ```ts
  import { actionsDuJour } from "@/lib/journal/actionsDuJour";
  import { lireDernierChantier } from "@/lib/chantiers/dernier";

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const { data: journauxJour } = await supabase.from("journaux").select("chantier_id").eq("date_journal", aujourdhui);
  const { data: ncs } = await supabase.from("non_conformites").select("chantier_id").neq("statut", "cloturee");
  const nonConformitesOuvertes: Record<string, number> = {};
  for (const n of ncs ?? []) nonConformitesOuvertes[n.chantier_id] = (nonConformitesOuvertes[n.chantier_id] ?? 0) + 1;
  const alertesOuvertes: Record<string, number> = {};
  for (const a of alertes) alertesOuvertes[a.chantier_id] = (alertesOuvertes[a.chantier_id] ?? 0) + 1;

  const actions = actionsDuJour({
    chantiers: chantiers.map((c) => ({ id: c.id, nom: c.nom, statut: c.statut })),
    chantiersAvecJournalAujourdhui: (journauxJour ?? []).map((j) => j.chantier_id),
    nonConformitesOuvertes,
    alertesOuvertes,
  });
  ```
  - Afficher les 3–4 premières actions en haut du tableau de bord (au-dessus des graphiques) : icône selon `action.type`, `action.libelle`, `action.chantierNom`, `action.detail`, lien sur `action.lienHref`.
  - Liste vide → « Rien d'urgent aujourd'hui. »
  - Bouton principal « Saisie du jour » : `lireDernierChantier()` → `/chantiers/<id>/journaux`, sinon `/chantiers`.
- **✅ FAIT (18/10/2026, Session 1)** : carte « À faire aujourd'hui » en haut de l'accueil (6 premières actions, numéro de priorité coloré, lien direct sur `lienHref`, message « Rien d'urgent aujourd'hui » si vide) + gros bouton orange « Saisie du jour » dans le bandeau, branché sur `lireDernierChantier` (+ affichage de la date locale du jour pour la requête journaux).
- **Priorité** : moyenne-haute (fait partie des « 3 changements les plus urgents »).

---

## TODO-UI-011 — Accueil : détail d'alerte lisible

- **Écran** : Accueil, section « Alertes en cours » (`src/app/page.tsx`, ~ligne 486).
- **Signalé par l'utilisateur** : « Les alertes s'affichent avec des mots d'ordinateur : "quantite — Valeur : 12 / Seuil : 10" ». Les libellés de type/statut sont **déjà en cours** (non commités) ; il reste la ligne « Valeur / Seuil ».
- **Côté logique (Session 2) : ✅ FAIT et testé** — `detailAlerte(alerte, langue)` dans `src/lib/alertes.ts` : `« Écart : +20 % · seuil : 10 % »` pour les écarts (quantité/budget), format générique « Valeur : X · seuil : Y » sinon. Le module fournit aussi `libelleTypeAlerte` / `libelleStatutAlerte` (9 types dont `hse` et `eprouvette`, 3 statuts, nettoyage des inconnus).
- **À faire (Session 1)** :
  ```ts
  import { detailAlerte } from "@/lib/alertes";
  // remplacer : `Valeur : ${alerte.valeur} / Seuil : ${alerte.seuil}`
  // par :
  {detailAlerte(alerte, langue)}
  ```
- **(Facultatif)** : remplacer le dictionnaire inline `TYPES_ALERTES` par `libelleTypeAlerte(type, langue)` du même module (source unique).
- **✅ FAIT (18/10/2026, Session 1)** : `libelleTypeAlerte` + `detailAlerte` utilisés sur l'accueil (dictionnaire inline supprimé) ; chaque alerte est cliquable et ouvre le chantier concerné ; colonne « Écart » de « Mes chantiers » colorée seulement en dépassement.
- **Priorité** : moyenne.

---

## TODO-UI-012 — Création de chantier : essentiel d'abord, GPS automatique, correction après création

- **Écran** : Création de chantier (`src/app/chantiers/nouveau/page.tsx`) + nouvelle page `src/app/chantiers/[id]/modifier/page.tsx` (à créer).
- **Signalé par l'utilisateur** (§2 du rapport) : 14 champs d'un coup sur une seule page ; latitude/longitude à taper à la main (personne ne connaît ses coordonnées) ; rien ne peut être corrigé après création (pas de bouton « Modifier ») ; montant sans séparateurs.
- **À faire (Session 1)** :
  1. **Bouton « Utiliser ma position »** à côté des champs latitude/longitude :
     ```ts
     navigator.geolocation.getCurrentPosition(
       (pos) => { setLatitude(pos.coords.latitude.toFixed(6)); setLongitude(pos.coords.longitude.toFixed(6)); },
       () => setMessage(langue === "fr" ? "Position indisponible : autorisez la localisation du téléphone." : "Location unavailable: allow phone location."),
       { timeout: 8000 },
     );
     ```
  2. **Formulaire allégé** : montrer d'abord l'essentiel (nom, type, sous-type, montant, dates), puis des sections repliables « Localisation & seuils » et « Dimensions (optionnel) » — pour éviter les 14 champs d'un coup sur téléphone.
  3. **Montant** : afficher les séparateurs de milliers pendant la saisie (l'utilisateur compte les zéros).
  4. **Page « Modifier le chantier »** : nouvelle route `/chantiers/[id]/modifier` qui réutilise le même formulaire (pré-rempli, `update` au lieu d'`insert`), avec le même garde-fou `estTypeDetailValide`. Lien « Modifier » sur la fiche chantier. **Côté base : rien à changer** — la politique RLS autorise déjà la mise à jour par le propriétaire (vérifié dans `0007_phase3_multitenant_isolation.sql`).
- **✅ FAIT (18/10/2026, Session 1)** : les 4 points sont en place — bouton « Utiliser ma position » (message « Position indisponible… » en cas d'échec), essentiel d'abord avec **« Options avancées (facultatif) »** repliées (GPS, dimensions, seuil), montant avec séparateurs automatiques pendant la frappe, contrôles montant/date de début/date de fin, et page `/chantiers/[id]/modifier` pré-remplie accessible par « Modifier le chantier » depuis la fiche.
- **Priorité** : moyenne (demande utilisateur, confort terrain).

---

## TODO-UI-013 — 🔴 BLOQUANT : fiche chantier plantée à l'ouverture (BUG-016)

- **Écran** : fiche chantier (`/chantiers/[id]`) — `src/app/chantiers/[id]/page.tsx` (~ligne 202) et composant `src/components/ui/StatCard.tsx`.
- **Signalé** : test PC du 18/10/2026 — « This page couldn't load », reproduit **3 fois sur 3**, aussi bien après la création d'un chantier qu'en cliquant un chantier de la liste (captures `pc-03-fiche-chantier.png`, `pc-v1-fiche-chantier-final.png`, `pc-99-erreur.png`).
- **Cause (diagnostiquée par la Session 2)** : la carte « Statut » passe à `StatCard` une couleur issue de `STATUT_LABELS` (lignes 46-52 : `"info"`, `"success"`, `"warning"`, `"danger"`), mais `StatCard` ne connaît que 6 couleurs (`blue`, `orange`, `emerald`, `rose`, `amber`, `slate`). Résultat : `colorMap[color]` vaut `undefined` et l'accès `.bar` plante tout l'écran. Le `as "blue" | "orange" | …` de la ligne 202 masque l'erreur à TypeScript — c'est ce qui a laissé passer le bug. À noter : **tous** les statuts plantent (aucune des 4 couleurs n'existe dans `StatCard`).
- **Correctif (2 volets, à faire tous les deux)** :
  1. **Dans la fiche** (lignes 46-52) : remplacer les couleurs par des valeurs existantes → `info`→`"blue"`, `success`→`"emerald"`, `warning`→`"amber"`, `danger`→`"rose"` ; puis **retirer le `as "blue" | …` de la ligne 202** (`color={s.color}`) pour que TypeScript vérifie désormais directement.
  2. **Dans `StatCard`** : sécuriser la lecture → `const c = colorMap[color] ?? colorMap.slate;` — ainsi une couleur inconnue ne pourra plus jamais faire planter une page entière (repli gris).
- **Au passage (même écran)** : corriger la clé `receptionne_provisulement` → `receptionne_provisoirement` (la valeur réelle en base — contrainte de `supabase/migrations/0001_v0_schema.sql`) dans `src/app/chantiers/[id]/page.tsx` (l.50) **et** `src/app/chantiers/page.tsx` (l.26, 28, 34). Sinon : le menu déroulant de statut écrit une valeur que la base refuse (échec silencieux) et l'affichage retombe sur « En préparation ».
- **Priorité** : **haute — bloquante** (tout le parcours chantier est inaccessible).

---

## TODO-UI-014 — 🔴 Liste des chantiers : badge « En préparation » hors de sa carte (BUG-017)

- **Écran** : liste des chantiers (`/chantiers`) — `src/app/chantiers/page.tsx`, badge ligne 252, carte ligne 233.
- **Signalé** : badge mesuré **86 px en dehors de sa carte** (capture `pc-r1-liste-chantiers.png`).
- **Piste** : dans la carte, le conteneur `flex items-start justify-between gap-3` a un bloc de gauche (`div.flex items-center gap-3`) qui ne peut pas se réduire, donc le badge est poussé hors de la carte au lieu que le texte se coupe. Correctif : ajouter `min-w-0` à ce bloc de gauche (les `truncate` du nom/maître d'ouvrage fonctionneront alors).
- **Priorité** : haute (visible partout).

---

## TODO-UI-015 — 🔴 Accueil : « 1 chantiers » et dates des mini-courbes coupées (BUG-019)

- **Écran** : Accueil (`src/app/page.tsx`) — captures `pc-v2-dashboard-bas.png`, `pc-v3-dashboard-fond.png`.
- **Détail** :
  1. Ligne 365 : `{chantiers.length} {langue === "fr" ? "chantiers" : "sites"}` → affiche « 1 chantiers ». Correctif : singulier quand il n'y en a qu'un → `chantiers.length === 1 ? "chantier" : "chantiers"` (idem « site » / « sites » en anglais).
  2. Mini-courbes : les étiquettes portent les dates **au format ISO brut** (`x: chantier.created_at.slice(0, 10)` → « 2026-10-18 » ; `slice(0, 7)` → « 2026-10 »). Deux soucis : coupées en bas des cartes (graphique trop court : `h-16` dans `StatCard`) et format non conforme à la règle du projet (JJ/MM/AAAA). Correctifs suggérés : formater les x à la construction des points (date → « 18/10 », mois → « 10/26 ») ; agrandir la zone du graphique dans `StatCard` (`h-16` → `h-20`) ; ajouter une petite marge à droite (`margin={{ right: 6 }}`) pour que la dernière étiquette (« 2026-10 » sur la carte « Montant total ») ne soit plus rognée.
- **Priorité** : moyenne (finitions).

---

## TODO-UI-016 — 🔴 Connexion : la coquille s'affiche avant connexion (BUG-020)

- **Écran** : `/login` (idem mot-de-passe-oublie, réinitialisation) — capture `pc-01-connexion.png`.
- **Question de l'utilisateur** : « à confirmer si c'est voulu » → **non, ce n'est pas voulu** : un écran de connexion doit être plein écran, sans barres ni menus.
- **Cause** : `src/app/layout.tsx` rend la coquille (`Sidebar`, `TopBar`, `MobileNavigation`) pour **toutes** les routes.
- **Correctif suggéré** : nouveau composant client `src/components/layout/Coquille.tsx` qui lit `usePathname()` et rend simplement `{children}` (sans coquille) pour les routes publiques : `/login`, `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe` (et probablement `/offline`, déjà conçue en plein écran : `min-h-screen`). Le layout ne garde alors que ce composant.
- **Priorité** : moyenne (esthétique, mais visible avant même de se connecter).

---

*Fin de TODO_UI.md.*
