# Devis detailles - donnees uniquement

Chaque fichier est un devis detaille pour un modele d'ouvrage (batiment ou route).
Il contient : les donnees d'entree, les lignes de devis (code, designation, calcul,
quantite, unite), le poste BPU retenu avec son prix unitaire HT, le montant par ligne
et le total HT, un calcul de controle a la main, le planning suggere et les donnees
a verifier.

Prix : FCFA HT, sans decimale. Tout poste sans prix fiable porte la mention
« a verifier » (exigence REF-04). Le nombre de bennes est arrondi a l'entier
superieur (exigence RG-03).

Quand un poste BPU n'existe pas encore, le devis ne peut pas etre chiffre et
reste « a verifier » en attendant la confirmation du prix.
