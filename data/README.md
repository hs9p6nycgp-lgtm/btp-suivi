# Données BPU et devis détaillés (Côte d'Ivoire)

Ce dossier contient uniquement des données (pas de code) :

- `Base_prix_CI_v2.xlsx` : base de prix initiale (155 postes renseignés).
- `Base_prix_CI_complet.xlsx` : base complète (259 postes) — postes manquants
  recherchés sur le marché ivoirien et marqués « à vérifier ».
- `BPU_posts_detailles.csv` : BPU détaillé avec décomposition en matériaux,
  main-d'œuvre et matériel, quantité de référence, prix HT, source et date.
- `devis/` : devis détaillés par modèle d'ouvrage, avec calculs et contrôle.
- `supabase/seed/prix_ci_complet.csv` : version CSV compatible avec l'import
  REF-05 (séparateur `;`, encodage UTF-8).

Règles respectées :
- tout prix porte une source et une date (REF-04) ;
- les prix sans source fiable sont au statut « à vérifier » ;
- montants en FCFA sans décimale ; quantités à 2 décimales ;
- nombre de bennes arrondi à l'entier supérieur.