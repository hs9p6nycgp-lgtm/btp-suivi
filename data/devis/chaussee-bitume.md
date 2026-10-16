# Devis detaille - Chaussee (couche de base + enrobe)

Type de chantier : route

## Donnees d'entree (valeurs par defaut)

- longueur = 100
- largeur = 7
- ep_base = 0.25
- ep_roul = 0.05
- foisonnement = 1.2
- capacite_benne = 15

## Lignes de devis

| Code | Designation | Calcul | Quantite | Unite | Poste BPU retenu | PU (FCFA) | Montant (FCFA) |
|---|---|---|---:|---|---|---:|---:|
| CHAUSS-SURFACE | Surface de chaussee | L x l (m2) | 700 | m2 | (aucun poste BPU - a chiffrer) | à vérifier | — |
| CHAUSS-BASE-VOL | Volume couche de base (foisonne) | L x l x e_base x coeff. foisonnement (m3) | 210 | m3 | BIT-05 - Couche de base (latérite améliorée) | 28 000 FCFA | 5 880 000 FCFA |
| CHAUSS-ENROBE | Volume enrobe (roulement) | L x l x e_roul (m3) | 35 | m3 | BIT-02 - Enrobé bitumineux à chaud (EB) | 95 000 FCFA | 3 325 000 FCFA |
| CHAUSS-BENNES | Nombre de bennes (base) | volume foisonne / capacite benne (arrondi sup.) | 14 | u | (aucun poste BPU - a chiffrer) | à vérifier | — |
| | **TOTAL HT** | | | | | | **9 205 000 FCFA** |

## Controle a la main

- CHAUSS-SURFACE : L x l (m2) = 700 m2
- CHAUSS-BASE-VOL : L x l x e_base x coeff. foisonnement (m3) = 210 m3
  x 28 000 FCFA = 5 880 000 FCFA FCFA
- CHAUSS-ENROBE : L x l x e_roul (m3) = 35 m3
  x 95 000 FCFA = 3 325 000 FCFA FCFA
- CHAUSS-BENNES : volume foisonne / capacite benne (arrondi sup.) = 14 u
- Somme des montants = 9 205 000 FCFA FCFA (controle : addition manuelle des lignes ci-dessus).

## Planning suggere (estimation)

| Tache | Duree indicative (j) |
|---|---:|
| Decapage et preparation de la plateforme | 1 |
| Mise en place couche de base | 2 |
| Compactage | 2 |
| Pose enrobe / roulement | 2 |
| Controle et reception | 1 |

## Donnees manquantes / a verifier

- Postes sans prix BPU (a confirmer avant usage, REF-04) : CHAUSS-SURFACE, CHAUSS-BENNES
- Les prix sont issus de la base de prix CI (guide BTP-PRIX et marche ivoirien 2026) ; tout prix sans source reste « a verifier ».
- Les quantites sont calculees selon les formules de la section 5 du cahier des charges ; arrondi au superieur pour les bennes (RG-03).
