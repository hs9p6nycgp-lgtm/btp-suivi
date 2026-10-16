# Devis detaille - Dalle / radier en beton

Type de chantier : batiment

## Donnees d'entree (valeurs par defaut)

- longueur = 10
- largeur = 5
- epaisseur = 0.12
- ratio_acier = 80

## Lignes de devis

| Code | Designation | Calcul | Quantite | Unite | Poste BPU retenu | PU (FCFA) | Montant (FCFA) |
|---|---|---|---:|---|---|---:|---:|
| DALLE-BETON | Beton | L x l x e (m3) | 6 | m3 | BET-300CPA - Béton fabriqué chantier dosé 300 kg/m3, CPA 42,5 (semelle ou propreté) | 86 782 FCFA | 520 692 FCFA |
| DALLE-ACIER | Acier HA | volume x ratio (kg) | 480 | kg | MB-11 - Barre acier HA (kg) | 3 500 FCFA | 1 680 000 FCFA |
| | **TOTAL HT** | | | | | | **2 200 692 FCFA** |

## Controle a la main

- DALLE-BETON : L x l x e (m3) = 6 m3
  x 86 782 FCFA = 520 692 FCFA FCFA
- DALLE-ACIER : volume x ratio (kg) = 480 kg
  x 3 500 FCFA = 1 680 000 FCFA FCFA
- Somme des montants = 2 200 692 FCFA FCFA (controle : addition manuelle des lignes ci-dessus).

## Planning suggere (estimation)

| Tache | Duree indicative (j) |
|---|---:|
| Coffrage et ferrailage | 3 |
| Betonage | 2 |
| Cure | 3 |

## Donnees manquantes / a verifier

- Tous les postes retenus disposent d'un prix unitaire (a confirmer avant usage).
- Les prix sont issus de la base de prix CI (guide BTP-PRIX et marche ivoirien 2026) ; tout prix sans source reste « a verifier ».
- Les quantites sont calculees selon les formules de la section 5 du cahier des charges ; arrondi au superieur pour les bennes (RG-03).
