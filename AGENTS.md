# Consignes pour l'agent – Projet BTP Suivi Pro

## Contexte
Application de gestion, de suivi et de reporting des chantiers routiers et de bâtiment (Côte d'Ivoire).
Mémoire de fin de cycle en génie civil. Le cahier des charges complet est dans `CAHIER_DES_CHARGES.md` : c'est la référence, lis-le avant toute action.

## Façon de travailler
- Toujours proposer un plan et attendre ma validation avant d'écrire du code.
- Développer un module à la fois, dans l'ordre du planning (section 11), en citant les codes d'exigence (ex : CHA-01).
- Commencer par les exigences de priorité M (indispensable). Ne pas développer les W.
- Après chaque module : expliquer ce qui a été fait, lister les fichiers modifiés, proposer un message de commit Git.
- Ne jamais supprimer de fichiers ni de données sans me demander.
- Expliquer simplement : je suis ingénieur génie civil, pas développeur.

## Stack technique
- Application web : Next.js (TypeScript) + Tailwind CSS.
- Base de données, connexion et stockage des photos : Supabase (PostgreSQL).
- Mode hors connexion : PWA.
- Langue de l'interface : français. Monnaie : FCFA sans décimale. Dates : JJ/MM/AAAA.

## Règles de calcul (section 5 du cahier des charges)
- Toutes les formules de la section 5 doivent être implémentées à l'identique.
- Chaque formule doit avoir un test automatique, avec les cas de la fiche de recette (section 12).
- Nombre de bennes : toujours arrondi à l'entier supérieur.
- Contrôle qualité hors tolérance : création automatique d'une fiche de non-conformité.
- Tous les seuils d'alerte sont paramétrables par chantier.

## Données
- Base de prix initiale : `Base_prix_CI_v2.xlsx` (format d'import du module REF-05).
- Tout prix doit avoir une source et une date.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
