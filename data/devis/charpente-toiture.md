# Devis detaille - Charpente et toiture

Type de chantier : batiment

## Donnees d'entree (valeurs par defaut)

- surface = 120
- pente = 25
- portee = 6

## Lignes de devis

| Code | Designation | Calcul | Quantite | Unite | Poste BPU retenu | PU (FCFA) | Montant (FCFA) |
|---|---|---|---:|---|---|---:|---:|
| CHARP-SURFACE | Surface de couverture | surface du toit (m2) | 120 | m2 | COUV-01 - Tôle ondulée galvanisée (m²) | 7 500 FCFA | 900 000 FCFA |
| CHARP-ETANCHE | Etancheite sous-toiture | surface x 1.10 (m2) | 132 | m2 | (aucun poste BPU - a chiffrer) | à vérifier | — |
| CHARP-BOIS | Bois de charpente (chevrons/fermes) | surface x 0.05 m3 (estimation) | 6 | m3 | BOI-02 - Bois de charpente (chêne/iroko) | 220 000 FCFA | 1 320 000 FCFA |
| CHARP-BARDAGE | Bardage / planche de rive | perimetre estime x 0.6 (m2) | 26,29 | m2 | (aucun poste BPU - a chiffrer) | à vérifier | — |
| | **TOTAL HT** | | | | | | **2 220 000 FCFA** |

## Controle a la main

- CHARP-SURFACE : surface du toit (m2) = 120 m2
  x 7 500 FCFA = 900 000 FCFA
- CHARP-ETANCHE : surface x 1.10 (m2) = 132 m2
- CHARP-BOIS : surface x 0.05 m3 (estimation) = 6 m3
  x 220 000 FCFA = 1 320 000 FCFA
- CHARP-BARDAGE : perimetre estime x 0.6 (m2) = 26,29 m2
- Somme des montants = 2 220 000 FCFA (controle : addition manuelle des lignes ci-dessus).

## Planning suggere (estimation)

| Tache | Duree indicative (j) |
|---|---:|
| Leve de la charpente | 4 |
| Pose de la couverture | 3 |
| Etancheite et finitions | 3 |

## Donnees manquantes / a verifier

- Postes sans prix BPU (a confirmer avant usage, REF-04) : CHARP-ETANCHE, CHARP-BARDAGE
- Les prix sont issus de la base de prix CI (guide BTP-PRIX et marche ivoirien 2026) ; tout prix sans source reste « a verifier ».
- Les quantites sont calculees selon les formules de la section 5 du cahier des charges ; arrondi au superieur pour les bennes (RG-03).
