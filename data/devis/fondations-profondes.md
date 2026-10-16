# Devis detaille - Fondations profondes (pieux fores)

Type de chantier : batiment

## Donnees d'entree (valeurs par defaut)

- nb = 6
- diametre = 0.6
- profondeur = 8
- ratio_acier = 120

## Lignes de devis

| Code | Designation | Calcul | Quantite | Unite | Poste BPU retenu | PU (FCFA) | Montant (FCFA) |
|---|---|---|---:|---|---|---:|---:|
| PIEUX-BETON | Beton de pieu | nb x pi x (d/2)^2 x h (m3) | 13,57 | m3 | BET-350CPA - Béton fabriqué chantier dosé 350 kg/m3, CPA 42,5 (semelle ou propreté) | 94 369 FCFA | 1 280 746 FCFA |
| PIEUX-ACIER | Acier HA pieu | volume x ratio (kg) | 1 628,60 | kg | MB-11 - Barre acier HA (kg) | 3 500 FCFA | 5 700 106 FCFA |
| PIEUX-SPOIL | Deblais evacuation (foisonne) | volume x 1.3 (m3) | 17,64 | m3 | TER-16 - Fouilles mécaniques en tranchée, 1re catégorie | 977 FCFA | 17 237 FCFA |
| PIEUX-COFFRAGE | Coffrage / cuvelage | surface laterale (m2) | 90,48 | m2 | BOI-01 - Bois de coffrage (sapin) | 180 000 FCFA | 16 286 016 FCFA |
| | **TOTAL HT** | | | | | | **23 284 105 FCFA** |

## Controle a la main

- PIEUX-BETON : nb x pi x (d/2)^2 x h (m3) = 13,57 m3
  x 94 369 FCFA = 1 280 746 FCFA
- PIEUX-ACIER : volume x ratio (kg) = 1 628,60 kg
  x 3 500 FCFA = 5 700 106 FCFA
- PIEUX-SPOIL : volume x 1.3 (m3) = 17,64 m3
  x 977 FCFA = 17 237 FCFA
- PIEUX-COFFRAGE : surface laterale (m2) = 90,48 m2
  x 180 000 FCFA = 16 286 016 FCFA
- Somme des montants = 23 284 105 FCFA (controle : addition manuelle des lignes ci-dessus).

## Planning suggere (estimation)

| Tache | Duree indicative (j) |
|---|---:|
| Implantation et forage | 4 |
| Pose armatures et betonage | 3 |
| Cure et controle | 2 |

## Donnees manquantes / a verifier

- Tous les postes retenus disposent d'un prix unitaire (a confirmer avant usage).
- Les prix sont issus de la base de prix CI (guide BTP-PRIX et marche ivoirien 2026) ; tout prix sans source reste « a verifier ».
- Les quantites sont calculees selon les formules de la section 5 du cahier des charges ; arrondi au superieur pour les bennes (RG-03).
