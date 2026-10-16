# Devis detaille - Assainissement - fouille et remblai

Type de chantier : route

## Donnees d'entree (valeurs par defaut)

- longueur = 50
- largeur = 0.8
- profondeur = 1.2
- foisonnement = 1.25
- capacite_benne = 10

## Lignes de devis

| Code | Designation | Calcul | Quantite | Unite | Poste BPU retenu | PU (FCFA) | Montant (FCFA) |
|---|---|---|---:|---|---|---:|---:|
| ASS-TERR | Terrassement fouille | L x l x h (m3) | 48 | m3 | TER-16 - Fouilles mécaniques en tranchée, 1re catégorie | 977 FCFA | 46 896 FCFA |
| ASS-FOISON | Volume evacue (foisonne) | volume x coeff. foisonnement (m3) | 60 | m3 | TER-16 - Fouilles mécaniques en tranchée, 1re catégorie | 977 FCFA | 58 620 FCFA |
| ASS-BENNES | Nombre de bennes (evacuation) | volume foisonne / capacite benne (arrondi sup.) | 6 | u | (aucun poste BPU - a chiffrer) | à vérifier | — |
| ASS-REMBLAI | Remblai (m3) | volume de fouille (m3) | 48 | m3 | REM-04 - Remblai manuel des fouilles | 1 121 FCFA | 53 808 FCFA |
| | **TOTAL HT** | | | | | | **159 324 FCFA** |

## Controle a la main

- ASS-TERR : L x l x h (m3) = 48 m3
  x 977 FCFA = 46 896 FCFA
- ASS-FOISON : volume x coeff. foisonnement (m3) = 60 m3
  x 977 FCFA = 58 620 FCFA
- ASS-BENNES : volume foisonne / capacite benne (arrondi sup.) = 6 u
- ASS-REMBLAI : volume de fouille (m3) = 48 m3
  x 1 121 FCFA = 53 808 FCFA
- Somme des montants = 159 324 FCFA (controle : addition manuelle des lignes ci-dessus).

## Planning suggere (estimation)

| Tache | Duree indicative (j) |
|---|---:|
| Ouverture de fouille | 4 |
| Pose canalisation et regards | 5 |
| Remblai et compactage | 3 |
| Controle final | 1 |

## Donnees manquantes / a verifier

- Postes sans prix BPU (a confirmer avant usage, REF-04) : ASS-BENNES
- Les prix sont issus de la base de prix CI (guide BTP-PRIX et marche ivoirien 2026) ; tout prix sans source reste « a verifier ».
- Les quantites sont calculees selon les formules de la section 5 du cahier des charges ; arrondi au superieur pour les bennes (RG-03).
