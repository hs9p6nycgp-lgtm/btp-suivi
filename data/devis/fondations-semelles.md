# Devis detaille - Fondations - semelles isolees (beton arme)

Type de chantier : batiment

## Donnees d'entree (valeurs par defaut)

- nb = 4
- longueur = 1.2
- largeur = 1.2
- hauteur = 0.6
- ratio_acier = 90

## Lignes de devis

| Code | Designation | Calcul | Quantite | Unite | Poste BPU retenu | PU (FCFA) | Montant (FCFA) |
|---|---|---|---:|---|---|---:|---:|
| FOND-BETON | Beton de fondation | nb x L x l x h (m3) | 3,46 | m3 | BET-250CPA - Béton fabriqué chantier dosé 250 kg/m3, CPA 42,5 (semelle ou propreté) | 79 194 FCFA | 273 694 FCFA |
| FOND-ACIER | Acier HA | volume x ratio (kg) | 311,04 | kg | MB-11 - Barre acier HA (kg) | 3 500 FCFA | 1 088 640 FCFA |
| FOND-COFFRAGE | Coffrage | surface contact (m2) | 11,52 | m2 | BOI-01 - Bois de coffrage (sapin) | 180 000 FCFA | 2 073 600 FCFA |
| FOND-TERRASSEMENT | Terrassement fouille | volume + foisonnement (m3) | 4,15 | m3 | REM-01 - Remblai de terre, épaisseur 15 cm | 4 947 FCFA | 20 516 FCFA |
| | **TOTAL HT** | | | | | | **3 456 451 FCFA** |

## Controle a la main

- FOND-BETON : nb x L x l x h (m3) = 3,46 m3
  x 79 194 FCFA = 273 694 FCFA
- FOND-ACIER : volume x ratio (kg) = 311,04 kg
  x 3 500 FCFA = 1 088 640 FCFA
- FOND-COFFRAGE : surface contact (m2) = 11,52 m2
  x 180 000 FCFA = 2 073 600 FCFA
- FOND-TERRASSEMENT : volume + foisonnement (m3) = 4,15 m3
  x 4 947 FCFA = 20 516 FCFA
- Somme des montants = 3 456 451 FCFA (controle : addition manuelle des lignes ci-dessus).

## Planning suggere (estimation)

| Tache | Duree indicative (j) |
|---|---:|
| Implantation et terrassement | 1 |
| Coffrage | 1 |
| Ferraillage | 4 |
| Betonage et cure | 1 |

## Donnees manquantes / a verifier

- Tous les postes retenus disposent d'un prix unitaire (a confirmer avant usage).
- Les prix sont issus de la base de prix CI (guide BTP-PRIX et marche ivoirien 2026) ; tout prix sans source reste « a verifier ».
- Les quantites sont calculees selon les formules de la section 5 du cahier des charges ; arrondi au superieur pour les bennes (RG-03).
