# Devis detaille - Terrassement route (couche granulaire)

Type de chantier : route

## Donnees d'entree (valeurs par defaut)

- longueur = 100
- largeur = 7
- epaisseur = 0.25
- foisonnement = 1.2
- capacite_benne = 15

## Lignes de devis

| Code | Designation | Calcul | Quantite | Unite | Poste BPU retenu | PU (FCFA) | Montant (FCFA) |
|---|---|---|---:|---|---|---:|---:|
| TERR-VOL | Volume en place | L x l x e (m3) | 175 | m3 | REM-02 - Apport de terre graveleuse | 4 617 FCFA | 807 975 FCFA |
| TERR-FOISON | Volume foisonne | volume x coeff. foisonnement (m3) | 210 | m3 | REM-02 - Apport de terre graveleuse | 4 617 FCFA | 969 570 FCFA |
| TERR-BENNES | Nombre de bennes | volume foisonne / capacite benne (arrondi sup.) | 14 | u | (aucun poste BPU - a chiffrer) | à vérifier | — |
| | **TOTAL HT** | | | | | | **1 777 545 FCFA** |

## Controle a la main

- TERR-VOL : L x l x e (m3) = 175 m3
  x 4 617 FCFA = 807 975 FCFA
- TERR-FOISON : volume x coeff. foisonnement (m3) = 210 m3
  x 4 617 FCFA = 969 570 FCFA
- TERR-BENNES : volume foisonne / capacite benne (arrondi sup.) = 14 u
- Somme des montants = 1 777 545 FCFA (controle : addition manuelle des lignes ci-dessus).

## Planning suggere (estimation)

| Tache | Duree indicative (j) |
|---|---:|
| Decapage et mise en forme | 2 |
| Mise en place couche | 3 |
| Compactage | 2 |

## Donnees manquantes / a verifier

- Postes sans prix BPU (a confirmer avant usage, REF-04) : TERR-BENNES
- Les prix sont issus de la base de prix CI (guide BTP-PRIX et marche ivoirien 2026) ; tout prix sans source reste « a verifier ».
- Les quantites sont calculees selon les formules de la section 5 du cahier des charges ; arrondi au superieur pour les bennes (RG-03).
