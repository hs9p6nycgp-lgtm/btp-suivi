# Rechargement du BPU (Bordereau des Prix Unitaires)

Ce fichier explique comment mettre à jour la base de données avec le BPU
complet (278 postes, Côte d'Ivoire) pour que l'application affiche les
postes dans l'assistant devis (notamment « enduit »).

Fichiers concernés (dans ce depot, donnees uniquement) :
- `data/Base_prix_CI_complet.xlsx` — base de prix complete (278 postes)
- `supabase/seed/prix_ci_complet.csv` — meme donnees, format import REF-05
- `supabase/seed/reload_bpu.sql` — script SQL de rechargement complet

## Methode A — Par l'interface application (recommandee, REF-05)

1. Ouvrir l'application, aller sur la page **Referentiel de prix / BPU**
   (ou la page d'import Excel).
2. Cliquer sur **Importer un fichier Excel / CSV**.
3. Selectionner le fichier `data/Base_prix_CI_complet.xlsx`
   (ou `supabase/seed/prix_ci_complet.csv`).
4. Verifier que chaque ligne porte une **source** et une **date** (exigence
   REF-04). Les lignes sans source sont refusees.
5. Lancer l'import. Les postes deja presents sont mis a jour ; les nouveaux
   sont ajoutes.

> Le statut « a verifier » signifie que le prix doit etre confirme par
> l'expert metier avant usage dans un devis ferme.

## Methode B — Par script SQL (editeur Supabase)

Si vous avez acces a l'editeur SQL de Supabase (Table Editor > SQL) :

1. Ouvrir le fichier `supabase/seed/reload_bpu.sql`.
2. Copier tout son contenu dans l'editeur SQL de Supabase.
3. Cliquer sur **Run** (Executer).

**Ce que fait le script :**
- Supprime toutes les lignes actuelles de la table `bpu_postes`.
- Recree les 278 postes avec code, designation, unite, prix HT, source,
  date de source, date de validite et statut.
- Affiche le nombre de postes insertes (`postes_inseres`).

**MISE EN GARDE importante :**
- Ce script **supprime toutes les lignes existantes** de `bpu_postes`.
- N'executez pas ce script si des postes DQE, devis ou quantites realisees
  sont deja lies a ces postes BPU (ils deviendraient orphelines).
- En cas de doute, utilisez la Methode A (import par l'interface) qui est
  sans danger pour les donnees liees.

## Verification apres rechargement

Dans l'application, ouvrir l'assistant devis et choisir un modele
(par exemple « Mur en agglos »). Chaque ligne doit maintenant afficher un
poste BPU avec un prix unitaire (ou la mention « a verifier » si le prix
n'est pas encore confirme). Le message « Aucun poste du BPU ne correspond
aux mots-clés enduit » ne doit plus apparaitre.

## Regles respectees (cahier des charges)

- REF-04 : tout prix porte une source et une date.
- RG-03 : nombre de bennes arrondi a l'entier superieur.
- RG-06 : montants en FCFA sans decimale ; quantites a 2 decimales.
- Les prix ajoutes par ce fichier sont en statut « a verifier » jusqu'à
  confirmation par l'expert metier (marche ivoirien 2026, estimation).