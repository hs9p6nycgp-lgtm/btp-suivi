# Devis detaille - Finition - revetement sol (carrelage)

Type de chantier : batiment

## Donnees d'entree (valeurs par defaut)

- surface = 50
- pertes = 10
- surface_carreau = 0.04

## Lignes de devis

| Code | Designation | Calcul | Quantite | Unite | Poste BPU retenu | PU (FCFA) | Montant (FCFA) |
|---|---|---|---:|---|---|---:|---:|
| REV-CARREAU | Carreaux | surface / surface_carreau x (1 + pertes) | 1 375 | u | (aucun poste BPU - a chiffrer) | à vérifier | — |
| REV-COLLE | Colle a carrelage | surface x 5 kg/m2 | 250 | kg | MB-15 - Mortier prêt à l'emploi (m³) | 95 000 FCFA | 23 750 000 FCFA |
| REV-JOINT | Joint / enduit de finition | surface x 2 kg/m2 | 100 | kg | MB-16 - Enduit de façade (m²) | 3 500 FCFA | 350 000 FCFA |
| REV-SURFACE | Surface preparee | surface (m2) | 50 | m2 | (aucun poste BPU - a chiffrer) | à vérifier | — |
| | **TOTAL HT** | | | | | | **24 100 000 FCFA** |

## Controle a la main

- REV-CARREAU : surface / surface_carreau x (1 + pertes) = 1 375 u
- REV-COLLE : surface x 5 kg/m2 = 250 kg
  x 95 000 FCFA = 23 750 000 FCFA
- REV-JOINT : surface x 2 kg/m2 = 100 kg
  x 3 500 FCFA = 350 000 FCFA
- REV-SURFACE : surface (m2) = 50 m2
- Somme des montants = 24 100 000 FCFA (controle : addition manuelle des lignes ci-dessus).

## Planning suggere (estimation)

| Tache | Duree indicative (j) |
|---|---:|
| Preparation support / chape | 2 |
| Pose du revetement | 3 |
| Joints et nettoyage | 1 |

## Donnees manquantes / a verifier

- Postes sans prix BPU (a confirmer avant usage, REF-04) : REV-CARREAU, REV-SURFACE
- Les prix sont issus de la base de prix CI (guide BTP-PRIX et marche ivoirien 2026) ; tout prix sans source reste « a verifier ».
- Les quantites sont calculees selon les formules de la section 5 du cahier des charges ; arrondi au superieur pour les bennes (RG-03).
