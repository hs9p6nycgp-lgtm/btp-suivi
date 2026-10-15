**CAHIER DES CHARGES**

**FONCTIONNEL ET TECHNIQUE**

**BTP Suivi Pro \[nom provisoire\]**

Application de gestion, de suivi et de reporting des chantiers routiers
et de bâtiment

| **Élément**               | **Valeur**                                                                                                      |
|---------------------------|-----------------------------------------------------------------------------------------------------------------|
| Projet                    | Conception et développement d’un outil de gestion, de suivi et de reporting des chantiers (routiers, bâtiments) |
| Rédacteur (expert métier) | \[NOM Prénom\], étudiant en Génie civil, option Construction et Bâtiment – IUA                                  |
| Destinataires             | Équipe de développement, encadreur pédagogique, entreprise d’accueil                                            |
| Version                   | 1.0 – Octobre 2026                                                                                              |
| Statut                    | Document de travail à valider                                                                                   |

# Suivi du document

| **Version** | **Date**   | **Auteur**     | **Modifications**                                                                               |
|-------------|------------|----------------|-------------------------------------------------------------------------------------------------|
| 1.0         | 14/10/2026 | \[NOM Prénom\] | Création du document                                                                            |
| 1.3         | 14/10/2026 | \[NOM Prénom\] | Ajout du module Fournisseurs (4.13) et de l’entité Fournisseur                                  |
| 1.4         | 14/10/2026 | \[NOM Prénom\] | Ajout de la section 17 : hypothèses, dépendances, reprise, formation, maintenance, critère PERT |
| 1.1         | \[date\]   | \[nom\]        | Intégration des retours de l’équipe de développement                                            |
| 2.0         | \[date\]   | \[nom\]        | Version validée pour le développement                                                           |

# Sommaire

1\. Présentation du projet

2\. Périmètre

3\. Acteurs, rôles et droits

4\. Exigences fonctionnelles par module

5\. Indicateurs et règles de calcul

6\. Rapports, tableaux de bord et alertes

7\. Exigences non fonctionnelles

8\. Architecture et choix techniques

9\. Modèle de données

10\. Interface et expérience utilisateur

11\. Planning de réalisation

12\. Recette et critères d’acceptation

13\. Livrables

14\. Risques et parades

15\. Glossaire

# 1. Présentation du projet

## 1.1. Contexte

Sur de nombreux chantiers routiers et de bâtiment en Côte d’Ivoire, le
suivi des travaux repose encore sur des cahiers, des fichiers Excel
dispersés, des messages WhatsApp et des comptes rendus oraux. Les
quantités mises en œuvre, les dépenses, l’avancement et les résultats
des contrôles qualité remontent tard à la direction. Les écarts
(surconsommation de matériaux, surcoûts, retards, non-conformités) sont
détectés trop tard pour être corrigés à moindre coût.

## 1.2. Problème à résoudre

-   Information éclatée entre plusieurs supports et plusieurs personnes.

-   Absence de comparaison automatique entre le prévu (DQE, planning) et
    le réalisé.

-   Rapports produits manuellement, avec retard et erreurs de calcul.

-   Aucune traçabilité fiable des livraisons, des contrôles et des
    décisions.

-   Pas de vision consolidée quand l’entreprise gère plusieurs chantiers
    en même temps.

## 1.3. Objectifs de l’application

| **N°** | **Objectif**                                                          | **Indicateur de réussite**                                  |
|--------|-----------------------------------------------------------------------|-------------------------------------------------------------|
| O1     | Centraliser toutes les données d’un chantier dans un seul outil       | 100 % des saisies journalières faites dans l’application    |
| O2     | Comparer en continu le prévu et le réalisé (quantités, coûts, délais) | Écarts calculés automatiquement, sans calcul manuel         |
| O3     | Détecter les écarts tôt grâce à des alertes                           | Alerte envoyée le jour même du dépassement de seuil         |
| O4     | Produire des rapports professionnels en un clic                       | Rapport hebdomadaire généré en moins de 1 minute            |
| O5     | Assurer la traçabilité (photos, PV, contrôles, historique)            | Chaque saisie horodatée, signée et géolocalisée             |
| O6     | Être utilisable sur le terrain, même avec une connexion faible        | Saisie possible hors connexion, synchronisation automatique |

## 1.4. Public cible

Entreprises de BTP, bureaux d’études, cabinets de maîtrise d’œuvre et
maîtres d’ouvrage publics ou privés gérant un ou plusieurs chantiers de
routes (terrassement, chaussée, assainissement) ou de bâtiments (gros
œuvre, second œuvre).

# 2. Périmètre

## 2.1. Inclus dans la version 1 (V1)

-   Gestion multi-chantiers et multi-entreprises.

-   Deux modèles de chantier préconfigurés : route et bâtiment.

-   Import du DQE et du BPU depuis Excel.

-   Saisie journalière terrain (quantités, main-d’œuvre, engins, météo,
    incidents, photos).

-   Suivi des approvisionnements et des livraisons.

-   Planning : diagramme de Gantt, diagramme PERT (réseau de tâches),
    chemin critique et marges, avancement physique et financier.

-   Base de données de prix (matériaux et matériels, Côte d’Ivoire) mise
    à jour directement dans l’application, avec historique.

-   Contrôles qualité et non-conformités.

-   Tableaux de bord, alertes et rapports PDF/Excel automatiques.

-   Application web (bureau) et application mobile (terrain) avec mode
    hors connexion.

## 2.2. Hors périmètre V1 (évolutions futures)

-   Comptabilité générale et paie.

-   Maquette numérique BIM 3D.

-   Signature électronique à valeur légale.

-   Facturation client et situations de travaux légales (prévues en V2).

-   Intégration avec des logiciels tiers (MS Project, ERP).

# 3. Acteurs, rôles et droits

| **Rôle**                         | **Description**                          | **Droits principaux**                                                                   |
|----------------------------------|------------------------------------------|-----------------------------------------------------------------------------------------|
| Super administrateur             | Gestionnaire de la plateforme            | Gère les entreprises clientes, les abonnements et les paramètres globaux                |
| Administrateur entreprise        | Direction ou responsable de l’entreprise | Crée les chantiers, les utilisateurs, les BPU ; voit tous les chantiers de l’entreprise |
| Conducteur de travaux            | Pilote un ou plusieurs chantiers         | Valide les saisies, gère le planning, les approvisionnements, génère les rapports       |
| Chef de chantier                 | Responsable terrain                      | Saisit le journal, les quantités, les livraisons, les contrôles et les photos           |
| Contrôleur qualité / laboratoire | Technicien ou bureau de contrôle         | Saisit les essais et contrôles, ouvre et clôt les non-conformités                       |
| Maître d’ouvrage / client        | Commanditaire du projet                  | Consultation seule du tableau de bord et des rapports de ses chantiers                  |
| Magasinier / logisticien         | Gestion des stocks et livraisons         | Saisit les entrées et sorties de matériaux                                              |

Matrice simplifiée des droits (C = créer, L = lire, M = modifier, V =
valider) :

| **Fonction**         | **Admin** | **Conducteur** | **Chef chantier** | **Qualité** | **Client** |
|----------------------|-----------|----------------|-------------------|-------------|------------|
| Chantiers et lots    | C L M     | L M            | L                 | L           | L          |
| DQE / BPU            | C L M     | L M            | L                 | –           | L          |
| Journal de chantier  | L         | L M V          | C L M             | L           | L          |
| Livraisons et stocks | L         | L M V          | C L               | –           | –          |
| Contrôles qualité    | L         | L V            | C L               | C L M V     | L          |
| Planning             | L M       | C L M          | L                 | L           | L          |
| Rapports             | C L       | C L            | L                 | L           | L          |
| Utilisateurs         | C L M     | L              | –                 | –           | –          |

# 4. Exigences fonctionnelles par module

*Priorités (méthode MoSCoW) : M = indispensable, S = important, C =
souhaitable, W = plus tard.*

## 4.1. Module Authentification et utilisateurs

| **Code** | **Exigence**                                      | **Priorité** |
|----------|---------------------------------------------------|--------------|
| AUT-01   | Connexion par e-mail ou téléphone et mot de passe | M            |
| AUT-02   | Mot de passe oublié par e-mail ou SMS             | M            |
| AUT-03   | Gestion des rôles et des droits par chantier      | M            |
| AUT-04   | Double authentification pour les administrateurs  | S            |
| AUT-05   | Journal des connexions et des actions (audit)     | S            |

## 4.2. Module Chantiers

| **Code** | **Exigence**                                                                                                                 | **Priorité** |
|----------|------------------------------------------------------------------------------------------------------------------------------|--------------|
| CHA-01   | Créer un chantier : nom, type (route / bâtiment), localisation GPS, maître d’ouvrage, montant du marché, dates, intervenants | M            |
| CHA-02   | Découper le chantier : sections et PK (route) ou bâtiments, niveaux et lots (bâtiment)                                       | M            |
| CHA-03   | Joindre les documents : plans, marché, ordres de service, PV                                                                 | M            |
| CHA-04   | Statuts : en préparation, en cours, suspendu, réceptionné provisoirement, clôturé                                            | M            |
| CHA-05   | Dupliquer un chantier comme modèle                                                                                           | C            |

## 4.3. Module Métré, DQE et BPU

| **Code** | **Exigence**                                                                                                     | **Priorité** |
|----------|------------------------------------------------------------------------------------------------------------------|--------------|
| MET-01   | Importer un DQE depuis Excel (désignation, unité, quantité, prix unitaire)                                       | M            |
| MET-02   | Gérer une bibliothèque de prix unitaires (BPU) par entreprise                                                    | M            |
| MET-03   | Calculateurs de métré intégrés : volume de couche (L × l × e), terrassements, béton, acier, maçonnerie, surfaces | M            |
| MET-04   | Paramètres de calcul : coefficient de foisonnement, de compactage, de pertes, capacité des bennes                | M            |
| MET-05   | Calcul automatique du nombre de rotations ou de bennes                                                           | S            |
| MET-06   | Gestion des avenants (quantités et prix modifiés) avec historique                                                | S            |

## 4.4. Module Journal de chantier (terrain)

| **Code** | **Exigence**                                                                                   | **Priorité** |
|----------|------------------------------------------------------------------------------------------------|--------------|
| JOU-01   | Saisie journalière : météo, effectifs par corps de métier, engins présents et heures de marche | M            |
| JOU-02   | Quantités réalisées par poste du DQE et par section / niveau                                   | M            |
| JOU-03   | Incidents : pannes, intempéries, accidents, arrêts, avec durée                                 | M            |
| JOU-04   | Photos horodatées et géolocalisées, avec annotation                                            | M            |
| JOU-05   | Validation du journal par le conducteur de travaux                                             | M            |
| JOU-06   | Saisie vocale des observations                                                                 | C            |

## 4.5. Module Approvisionnements et stocks

| **Code** | **Exigence**                                                                                 | **Priorité** |
|----------|----------------------------------------------------------------------------------------------|--------------|
| APP-01   | Enregistrer une livraison : matériau, fournisseur, quantité, n° de bon, camion, photo du bon | M            |
| APP-02   | Comparer quantités commandées, livrées et mises en œuvre                                     | M            |
| APP-03   | Stock théorique par matériau (latérite, ciment, sable, gravier, acier, agglos…)              | S            |
| APP-04   | Alerte de stock bas et de surconsommation                                                    | S            |

## 4.6. Module Planning et avancement

| **Code** | **Exigence**                                                                                                                                           | **Priorité** |
|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| PLA-01   | Créer le planning : tâches, durées, dépendances, jalons                                                                                                | M            |
| PLA-02   | Diagramme de Gantt et diagramme PERT (réseau de tâches) avec calcul automatique du chemin critique, des dates au plus tôt / au plus tard et des marges | M            |
| PLA-03   | Avancement physique par tâche, mis à jour à partir des quantités saisies                                                                               | M            |
| PLA-04   | Comparaison planning prévu / réel et calcul des retards                                                                                                | M            |
| PLA-05   | Courbe en S (avancement cumulé prévu / réel)                                                                                                           | S            |

## 4.7. Module Coûts

| **Code** | **Exigence**                                                                             | **Priorité** |
|----------|------------------------------------------------------------------------------------------|--------------|
| COU-01   | Coût réalisé = quantités réalisées × prix du BPU                                         | M            |
| COU-02   | Dépenses réelles : matériaux, main-d’œuvre, location d’engins, sous-traitance, carburant | M            |
| COU-03   | Écart budgétaire par poste et global                                                     | M            |
| COU-04   | Méthode de la valeur acquise (coût prévu, coût réel, valeur acquise)                     | S            |
| COU-05   | Projection du coût final à terminaison                                                   | C            |

## 4.8. Module Qualité

| **Code** | **Exigence**                                                                                                  | **Priorité** |
|----------|---------------------------------------------------------------------------------------------------------------|--------------|
| QUA-01   | Plans de contrôle par type d’ouvrage (épaisseur, dévers, compacité, slump, résistance du béton, implantation) | M            |
| QUA-02   | Saisie des essais avec valeur mesurée, valeur exigée et tolérance : conformité calculée automatiquement       | M            |
| QUA-03   | Fiches de non-conformité : description, photos, responsable, action corrective, échéance, clôture             | M            |
| QUA-04   | Suivi des éprouvettes de béton (7, 14, 28 jours) avec rappels                                                 | S            |

## 4.9. Module Sécurité (HSE)

| **Code** | **Exigence**                                                   | **Priorité** |
|----------|----------------------------------------------------------------|--------------|
| HSE-01   | Déclaration d’incident ou d’accident avec photos               | S            |
| HSE-02   | Check-list EPI et sécurité quotidienne                         | C            |
| HSE-03   | Indicateurs : nombre de jours sans accident, taux de fréquence | C            |

## 4.10. Module Reporting et tableaux de bord

| **Code** | **Exigence**                                                               | **Priorité** |
|----------|----------------------------------------------------------------------------|--------------|
| REP-01   | Tableau de bord par chantier et tableau de bord multi-chantiers            | M            |
| REP-02   | Rapport journalier, hebdomadaire et mensuel générés automatiquement en PDF | M            |
| REP-03   | Export Excel de toutes les données                                         | M            |
| REP-04   | Envoi automatique des rapports par e-mail aux destinataires choisis        | S            |
| REP-05   | Rapport personnalisé avec logo de l’entreprise                             | S            |

## 4.11. Module Notifications et collaboration

| **Code** | **Exigence**                                                                    | **Priorité** |
|----------|---------------------------------------------------------------------------------|--------------|
| NOT-01   | Alertes en temps réel (application, e-mail) sur dépassement de seuil            | M            |
| NOT-02   | Commentaires et mentions (@nom) sur une tâche, une saisie ou une non-conformité | S            |
| NOT-03   | Notifications WhatsApp ou SMS                                                   | C            |

## 4.12. Module Référentiel de prix (Côte d’Ivoire)

| **Code** | **Exigence**                                                                                                                                                                                            | **Priorité** |
|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| REF-01   | Base de données centralisée des matériaux (latérite, ciment, acier, sable, gravier, agglos, bitume…) et des matériels (engins, camions-bennes, citerne, compacteur) : unité et prix unitaire en FCFA HT | M            |
| REF-02   | Mise à jour directe des prix dans l’application par un administrateur, sans intervention du développeur                                                                                                 | M            |
| REF-03   | Historique des prix : date de chaque modification, ancien et nouveau prix, auteur et motif                                                                                                              | M            |
| REF-04   | Source et date de validité de chaque prix (devis fournisseur, facture, mercuriale, observatoire des prix)                                                                                               | M            |
| REF-05   | Import et export Excel / CSV pour mettre à jour un grand nombre de prix d’un coup                                                                                                                       | S            |
| REF-06   | Propagation d’une mise à jour aux DQE et BPU qui utilisent le prix, avec validation avant application                                                                                                   | S            |
| REF-07   | Recherche et filtrage par catégorie, fournisseur, ville (Abidjan, Yamoussoukro, San-Pédro…) et date de mise à jour                                                                                      | S            |
| REF-08   | Prix par zone géographique, avec coefficient de transport                                                                                                                                               | C            |
| REF-09   | Alerte lorsqu’un prix n’a pas été mis à jour depuis plus de 6 mois                                                                                                                                      | C            |

## 4.13. Module Fournisseurs

| **Code** | **Exigence**                                                                                                                                           | **Priorité** |
|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FOU-01   | Fiche fournisseur : raison sociale, type (matériaux, loueur d’engins, transporteur, sous-traitant, laboratoire), adresse, ville, contacts, NIF et RCCM | M            |
| FOU-02   | Conditions commerciales : délai de paiement, conditions de livraison, validité des prix, franco de port                                                | M            |
| FOU-03   | Catalogue par fournisseur, relié au référentiel de prix (REF-01) avec date du dernier devis                                                            | M            |
| FOU-04   | Comparaison de plusieurs devis pour un même poste, avec choix motivé et trace de la décision                                                           | M            |
| FOU-05   | Historique des bons de commande et des livraisons par fournisseur (lien avec APP-01)                                                                   | S            |
| FOU-06   | Évaluation des fournisseurs : respect des délais, conformité des livraisons, écarts de prix, note sur 5                                                | S            |
| FOU-07   | Documents administratifs avec date d’échéance (attestation fiscale, assurance, agrément) et alerte 30 jours avant                                      | S            |
| FOU-08   | Demande de devis par e-mail ou WhatsApp, et réponse saisie dans l’application                                                                          | C            |
| FOU-09   | Portail fournisseur pour mettre à jour ses propres prix                                                                                                | W            |

# 5. Indicateurs et règles de calcul

Cette section constitue le cœur métier de l’application. Toutes les
formules doivent être appliquées à l’identique par l’équipe de
développement et vérifiées lors de la recette.

| **Indicateur**                               | **Formule**                                                   | **Unité**    | **Seuil d’alerte (paramétrable)** |
|----------------------------------------------|---------------------------------------------------------------|--------------|-----------------------------------|
| Écart de quantité                            | (Qréelle − Qprévue) / Qprévue × 100                           | %            | \> +10 % ou \< −10 %              |
| Avancement physique d’un poste               | Qréalisée cumulée / Qmarché × 100                             | %            | –                                 |
| Avancement physique global                   | Σ (avancement poste × montant poste) / montant total          | %            | –                                 |
| Avancement financier                         | Montant réalisé / montant du marché × 100                     | %            | –                                 |
| Écart de délai                               | Date de fin prévisionnelle − date de fin contractuelle        | jours        | \> 5 jours                        |
| Écart budgétaire                             | Coût réel − coût prévu à date                                 | FCFA         | \> 5 % du budget du poste         |
| Volume de couche (route)                     | Longueur × largeur × épaisseur                                | m³           | –                                 |
| Volume foisonné                              | Volume en place × coefficient de foisonnement                 | m³           | –                                 |
| Nombre de bennes                             | Volume foisonné / capacité d’une benne (arrondi au supérieur) | u            | –                                 |
| Volume de béton                              | Σ (longueur × largeur × hauteur) des éléments                 | m³           | Écart \> 5 %                      |
| Ratio d’acier                                | Masse d’acier / volume de béton                               | kg/m³        | Hors fourchette du type d’ouvrage |
| Marge totale d’une tâche (PERT)              | Date de fin au plus tard − date de fin au plus tôt            | jours        | 0 = tâche critique                |
| Rendement d’un engin                         | Quantité produite / heures de marche                          | m³/h ou ml/h | \< 80 % du rendement de référence |
| Taux de disponibilité engin                  | Heures de marche / heures prévues × 100                       | %            | \< 85 %                           |
| Taux de conformité qualité                   | Contrôles conformes / contrôles réalisés × 100                | %            | \< 95 %                           |
| Indice de performance coût (valeur acquise)  | Valeur acquise / coût réel                                    | –            | \< 0,95                           |
| Indice de performance délai (valeur acquise) | Valeur acquise / valeur planifiée                             | –            | \< 0,95                           |

## Règles de gestion principales

-   RG-01 : une quantité réalisée ne peut être saisie que sur un poste
    existant du DQE ou sur un avenant validé.

-   RG-02 : un journal validé par le conducteur de travaux n’est plus
    modifiable ; toute correction crée une nouvelle version tracée.

-   RG-03 : le nombre de bennes est toujours arrondi à l’entier
    supérieur.

-   RG-04 : un contrôle qualité hors tolérance crée automatiquement une
    fiche de non-conformité.

-   RG-05 : un chantier ne peut passer au statut « réceptionné » que si
    toutes les non-conformités sont clôturées.

-   RG-06 : les montants sont exprimés en FCFA, sans décimale ; les
    quantités avec 2 décimales.

-   RG-07 : tous les seuils d’alerte sont paramétrables par chantier.

# 6. Rapports, tableaux de bord et alertes

## 6.1. Tableau de bord chantier

-   Cartes de synthèse : avancement physique, avancement financier,
    écart de délai, écart budgétaire, taux de conformité.

-   Courbe en S prévu / réel.

-   Graphique des écarts de quantités par poste.

-   Carte des sections (route) ou des niveaux (bâtiment) colorée selon
    l’avancement.

-   Liste des alertes ouvertes et des non-conformités en cours.

-   Galerie des dernières photos.

## 6.2. Tableau de bord multi-chantiers (direction)

-   Carte géographique de tous les chantiers avec code couleur (vert,
    orange, rouge).

-   Classement des chantiers par écart de coût et de délai.

-   Chiffre d’affaires réalisé et reste à réaliser.

-   Utilisation des engins entre chantiers.

## 6.3. Rapports automatiques

| **Rapport**          | **Fréquence**   | **Contenu**                                                            | **Destinataires**           |
|----------------------|-----------------|------------------------------------------------------------------------|-----------------------------|
| Rapport journalier   | Chaque soir     | Météo, effectifs, engins, quantités du jour, incidents, photos         | Conducteur de travaux       |
| Rapport hebdomadaire | Chaque lundi    | Avancement, écarts, alertes, non-conformités, prévisions de la semaine | Direction, maître d’ouvrage |
| Rapport mensuel      | Fin de mois     | Synthèse complète, courbe en S, coûts, qualité, HSE                    | Direction, maître d’ouvrage |
| Rapport de réception | Fin de chantier | Bilan quantités et coûts, contrôles, levée des réserves                | Maître d’ouvrage            |

# 7. Exigences non fonctionnelles

| **Domaine**             | **Exigence**                                                                                                                                         |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| Performance             | Ouverture d’un écran en moins de 2 secondes ; génération d’un rapport PDF en moins de 30 secondes                                                    |
| Mode hors connexion     | Saisie terrain possible sans réseau ; synchronisation automatique au retour de la connexion, sans perte de données                                   |
| Compatibilité           | Web : Chrome, Edge, Firefox récents. Mobile : Android 9 et plus (prioritaire), iOS 15 et plus                                                        |
| Ergonomie               | Saisie terrain en moins de 3 minutes par jour ; gros boutons utilisables avec des gants ; lisible en plein soleil                                    |
| Langue et formats       | Interface en français ; dates JJ/MM/AAAA ; monnaie FCFA ; unités du système métrique                                                                 |
| Sécurité                | Connexion chiffrée (HTTPS) ; mots de passe hachés ; droits par rôle ; sauvegarde quotidienne ; journal d’audit                                       |
| Confidentialité         | Données d’une entreprise invisibles pour les autres ; conformité à la loi ivoirienne n° 2013-450 sur la protection des données à caractère personnel |
| Disponibilité           | 99 % du temps ; maintenance programmée hors heures de chantier                                                                                       |
| Évolutivité             | Ajout de nouveaux types d’ouvrages (assainissement, ouvrages d’art) sans refonte                                                                     |
| Consommation de données | Photos compressées automatiquement ; mode « économie de données »                                                                                    |

# 8. Architecture et choix techniques

Le choix final revient à l’équipe de développement. Les options
ci-dessous sont proposées à titre indicatif et doivent être justifiées
dans le mémoire.

| **Couche**                       | **Option recommandée**                                   | **Alternative**       |
|----------------------------------|----------------------------------------------------------|-----------------------|
| Application mobile               | Flutter (Android et iOS, mode hors connexion natif)      | React Native          |
| Application web                  | React ou Vue.js                                          | Angular               |
| Serveur (API)                    | Node.js (NestJS) ou Python (Django REST)                 | PHP (Laravel)         |
| Base de données                  | PostgreSQL                                               | MySQL                 |
| Stockage des photos et documents | Stockage objet type S3                                   | Serveur de fichiers   |
| Génération des rapports          | Moteur PDF côté serveur                                  | Export Excel          |
| Hébergement                      | Cloud (OVH, AWS, Azure) ou serveur local de l’entreprise | Hébergement mutualisé |
| Solution rapide (prototype)      | Low-code : FlutterFlow + Supabase, ou AppSheet           | –                     |

Architecture cible : application mobile terrain et application web
bureau connectées à une API sécurisée, elle-même reliée à la base de
données et au stockage des fichiers.

# 9. Modèle de données (entités principales)

| **Entité**          | **Attributs principaux**                                                             | **Relations**                                                        |
|---------------------|--------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| Entreprise          | nom, logo, adresse, abonnement                                                       | possède des utilisateurs et des chantiers                            |
| Utilisateur         | nom, téléphone, e-mail, rôle                                                         | affecté à un ou plusieurs chantiers                                  |
| Chantier            | nom, type, localisation, montant, dates, statut                                      | contient des sections ou lots, un DQE, un planning                   |
| Section / Lot       | nom, PK début / fin ou niveau, type d’ouvrage                                        | appartient à un chantier                                             |
| Poste DQE           | code, désignation, unité, quantité marché, prix unitaire                             | appartient à un chantier                                             |
| Journal             | date, météo, effectifs, observations, statut                                         | appartient à un chantier ; contient des quantités, incidents, photos |
| Quantité réalisée   | quantité, date, section                                                              | liée à un poste DQE et à un journal                                  |
| Livraison           | matériau, fournisseur, quantité, n° de bon, photo                                    | liée à un chantier                                                   |
| Engin               | type, immatriculation, rendement de référence                                        | affecté à des journaux                                               |
| Tâche planning      | nom, durée, dates prévues / réelles, dépendances                                     | liée à des postes DQE                                                |
| Contrôle qualité    | type, valeur mesurée, valeur exigée, tolérance, résultat                             | lié à une section / un lot                                           |
| Non-conformité      | description, gravité, responsable, échéance, statut                                  | liée à un contrôle                                                   |
| Alerte              | type, seuil, valeur, date, statut                                                    | liée à un chantier                                                   |
| Rapport             | type, période, fichier PDF                                                           | lié à un chantier                                                    |
| Fournisseur         | raison sociale, type, contacts, conditions commerciales, documents et échéances      | fournit des matériaux, des engins ou des prestations                 |
| Matériau / Matériel | code, désignation, catégorie, unité, prix unitaire FCFA HT, source, date de validité | utilisé dans les BPU et les DQE                                      |
| Historique de prix  | ancien prix, nouveau prix, date, auteur, motif                                       | lié à un matériau ou un matériel                                     |
| Tâche PERT          | identifiant, durée, prédécesseurs, dates au plus tôt / au plus tard, marge           | reliée aux autres tâches du planning                                 |

# 10. Interface et expérience utilisateur

-   Charte graphique sobre et professionnelle : bleu nuit (confiance) et
    orange chantier (action), logo de l’entreprise cliente sur les
    rapports.

-   Codes couleur universels : vert (conforme / à l’heure), orange
    (vigilance), rouge (écart ou retard).

-   Mobile : saisie en 3 écrans maximum, gros boutons, appareil photo
    intégré, fonctionnement hors connexion signalé clairement.

-   Web : menu latéral par module, tableaux filtrables, graphiques
    interactifs.

-   Mode sombre et mode « plein soleil » à fort contraste sur mobile.

-   Écrans à maquetter en priorité : connexion, liste des chantiers,
    tableau de bord, saisie journalière, livraison, contrôle qualité,
    rapport.

# 11. Planning de réalisation

| **Phase**                 | **Contenu**                                                      | **Durée indicative** | **Responsable**             |
|---------------------------|------------------------------------------------------------------|----------------------|-----------------------------|
| 0\. Cadrage               | Validation du cahier des charges, maquettes                      | 2 semaines           | Expert métier + équipe dév. |
| 1\. Socle                 | Authentification, chantiers, utilisateurs, DQE / BPU             | 3 semaines           | Équipe dév.                 |
| 2\. Terrain               | Journal, quantités, livraisons, photos, hors connexion           | 3 semaines           | Équipe dév.                 |
| 3\. Pilotage              | Planning (Gantt, PERT, chemin critique), coûts, qualité, alertes | 4 semaines           | Équipe dév.                 |
| 3bis. Référentiel de prix | Base de prix CI, historique, import / export, propagation        | 2 semaines           | Équipe dév. + expert métier |
| 4\. Reporting             | Tableaux de bord, rapports PDF / Excel                           | 2 semaines           | Équipe dév.                 |
| 5\. Recette               | Tests métier sur chantiers types, corrections                    | 2 semaines           | Expert métier               |
| 6\. Pilote                | Test sur un chantier réel, formation, guide                      | 2 semaines           | Expert métier + entreprise  |

*Durée totale indicative : 20 semaines, ajustable selon la taille de
l’équipe et l’outil retenu (le low-code peut réduire ce délai de
moitié).*

# 12. Recette et critères d’acceptation

-   Chaque exigence « M » est testée et conforme.

-   Tous les calculs de la section 5 donnent le même résultat qu’un
    calcul manuel de référence, à l’arrondi près.

-   Les alertes se déclenchent exactement au seuil paramétré.

-   La saisie hors connexion est synchronisée sans perte après 48 heures
    sans réseau.

-   Un chef de chantier formé réalise sa saisie journalière en moins de
    3 minutes.

-   Les rapports PDF sont lisibles, complets et conformes au modèle
    validé.

Modèle de fiche de recette :

| **N° test** | **Exigence** | **Données d’entrée**                          | **Résultat attendu**          | **Résultat obtenu** | **Conforme** |
|-------------|--------------|-----------------------------------------------|-------------------------------|---------------------|--------------|
| T-01        | MET-03       | L = 570,16 m ; l = 6 m ; e = 0,15 m           | 513,14 m³                     | \[à remplir\]       | Oui / Non    |
| T-02        | MET-05       | 513,14 m³ × 1,2 ; benne 15 m³                 | 42 bennes                     | \[à remplir\]       | Oui / Non    |
| T-03        | QUA-02       | Épaisseur mesurée 12 cm ; exigée 15 cm ± 1 cm | Non conforme + fiche NC créée | \[à remplir\]       | Oui / Non    |

# 13. Livrables

| **Livrable**                                       | **Responsable**                         |
|----------------------------------------------------|-----------------------------------------|
| Cahier des charges validé                          | Expert métier                           |
| Maquettes des écrans                               | Équipe dév. + expert métier             |
| Diagrammes UML (cas d’utilisation, classes) ou MCD | Équipe dév., validé par l’expert métier |
| Application web et mobile fonctionnelles           | Équipe dév.                             |
| Jeux de données de test (route et bâtiment)        | Expert métier                           |
| Cahier de recette complété                         | Expert métier                           |
| Guide d’utilisation                                | Expert métier                           |
| Documentation technique et code source             | Équipe dév.                             |

# 14. Risques et parades

| **Risque**                                   | **Impact** | **Parade**                                                                                         |
|----------------------------------------------|------------|----------------------------------------------------------------------------------------------------|
| Périmètre trop large pour le délai           | Élevé      | Développer d’abord les exigences « M », reporter le reste                                          |
| Connexion internet faible sur les chantiers  | Élevé      | Mode hors connexion dès la V1                                                                      |
| Résistance des équipes terrain à la saisie   | Moyen      | Saisie très rapide, formation courte, implication du chef de chantier dès les maquettes            |
| Erreurs dans les formules                    | Élevé      | Validation de chaque formule par l’expert métier et recette systématique                           |
| Données réelles indisponibles pour les tests | Moyen      | Jeux de données types construits à partir de ratios et prix courants                               |
| Perte ou fuite de données                    | Élevé      | Sauvegardes quotidiennes, droits par rôle, chiffrement                                             |
| Prix de la base peu fiables ou vite périmés  | Élevé      | Source et date obligatoires pour chaque prix, alerte de péremption, validation par l’expert métier |

# 15. Glossaire

| **Terme**       | **Définition**                                                                           |
|-----------------|------------------------------------------------------------------------------------------|
| BPU             | Bordereau des Prix Unitaires : prix d’une unité de chaque ouvrage                        |
| DQE             | Devis Quantitatif et Estimatif : quantités × prix unitaires = coût prévisionnel          |
| PK              | Point kilométrique : repère de position le long d’une route                              |
| Foisonnement    | Augmentation de volume d’un matériau lorsqu’il est extrait ou remanié                    |
| Courbe en S     | Graphique de l’avancement cumulé prévu et réel dans le temps                             |
| Valeur acquise  | Valeur budgétaire du travail réellement effectué à une date donnée                       |
| Non-conformité  | Écart constaté entre un ouvrage réalisé et les exigences du marché                       |
| Recette         | Vérification que l’application répond au cahier des charges                              |
| Hors connexion  | Fonctionnement de l’application sans accès à internet                                    |
| MoSCoW          | Méthode de priorisation : Must, Should, Could, Won’t                                     |
| PERT            | Program Evaluation and Review Technique : réseau de tâches reliées par leurs dépendances |
| Chemin critique | Suite de tâches sans marge dont le retard retarde la fin du chantier                     |
| Marge totale    | Retard maximal qu’une tâche peut prendre sans retarder la fin du chantier                |

# 16. Contenu initial de la base de prix

La base est livrée avec un jeu de départ à partir du guide BTP-PRIX
(prix HT, entreprise moyenne ivoirienne, déboursé sec) et une liste de
postes à chiffrer par devis. Chaque prix doit porter une source et une
date ; les lignes sans prix restent en statut « à vérifier » jusqu’à
validation.

| **Catégorie**                | **Prix renseignés (guide BTP-PRIX)** | **Lignes à chiffrer (devis)** |
|------------------------------|--------------------------------------|-------------------------------|
| Acier                        | 0                                    | 11                            |
| Bitume et routes             | 0                                    | 10                            |
| Bois et coffrage             | 0                                    | 7                             |
| Béton                        | 41                                   | 0                             |
| Climatisation et ventilation | 0                                    | 2                             |
| Coffrage                     | 28                                   | 0                             |
| Couverture                   | 0                                    | 5                             |
| Installation de chantier     | 11                                   | 0                             |
| Main-d'œuvre                 | 0                                    | 10                            |
| Matériaux de base            | 0                                    | 17                            |
| Matériel                     | 17                                   | 0                             |
| Maçonnerie                   | 12                                   | 12                            |
| Menuiserie et fermeture      | 0                                    | 6                             |
| Plomberie et assainissement  | 0                                    | 13                            |
| Remblai                      | 10                                   | 0                             |
| Réseaux                      | 3                                    | 0                             |
| Terrassement                 | 31                                   | 0                             |
| Transport                    | 0                                    | 4                             |
| Voirie                       | 2                                    | 0                             |
| Électricité                  | 0                                    | 12                            |
| Équipement de sécurité       | 0                                    | 7                             |
| Total                        | 155                                  | 116                           |

*Structure des fichiers : onglet « Base de prix CI v2 » (prix
renseignés) et onglet « À chiffrer (devis) » (postes sans prix). Le
format est compatible avec l’import du module REF-05 (séparateur
point-virgule, encodage UTF-8).*

*Règles d’alimentation : tout prix importé sans source ni date est
refusé ; un prix plus ancien que 6 mois déclenche l’alerte REF-09 ; les
prix issus du guide sont à confirmer avant usage dans un mémoire.*

# 17. Hypothèses, dépendances, reprise, formation et maintenance

## 17.1. Hypothèses

-   Les chefs de chantier disposent d’un smartphone Android 9 ou plus,
    fourni par l’entreprise.

-   Une connexion internet est disponible au bureau ; sur chantier, la
    saisie se fait hors connexion (voir section 7).

-   Le personnel saisissant les données a été formé au minimum une
    demi-journée.

## 17.2. Dépendances externes et coûts récurrents

| **Service**                            | **Usage**                 | **Coût indicatif**                     |
|----------------------------------------|---------------------------|----------------------------------------|
| Hébergement serveur et base de données | Données, API, sauvegardes | À chiffrer selon le fournisseur retenu |
| Stockage des photos                    | Photos de chantier        | Inclus ou à l’abonnement               |
| SMS ou WhatsApp Business               | Alertes et rapports       | Au message, à estimer                  |
| Nom de domaine et certificat HTTPS     | Accès web sécurisé        | Annuel, faible                         |

## 17.3. Reprise des données existantes

-   Import des DQE et BPU depuis Excel, avec contrôle des colonnes et
    rapport d’erreurs avant import.

-   Import des plannings existants (format Excel ou MS Project, export
    CSV).

-   Saisie de l’historique du chantier en cours, à partir d’une date de
    bascule définie par l’entreprise.

-   Recette de la reprise : les totaux importés doivent être identiques
    à ceux du fichier source.

## 17.4. Formation des utilisateurs

| **Public**                  | **Durée**                                   | **Contenu**                                        | **Support**                           |
|-----------------------------|---------------------------------------------|----------------------------------------------------|---------------------------------------|
| Chefs de chantier           | 3 h en présentiel + 1 h de pratique terrain | Saisie journalière, photos, mode hors connexion    | Fiche pas à pas plastifiée            |
| Conducteurs de travaux      | 4 h                                         | Planning, coûts, validation des journaux, rapports | Guide d’utilisation et vidéos courtes |
| Administrateur d’entreprise | 3 h                                         | Utilisateurs, droits, BPU, référentiel de prix     | Guide administrateur                  |

## 17.5. Maintenance et support

-   Correction des anomalies bloquantes sous 24 heures ouvrées, des
    autres sous 5 jours ouvrés.

-   Sauvegarde quotidienne, avec test de restauration mensuel.

-   Mise à jour de sécurité au moins une fois par trimestre.

-   Support par téléphone ou WhatsApp aux heures de bureau, du lundi au
    samedi.

## 17.6. Critère d’acceptation du planning

Sur le jeu de test routier, le chemin critique calculé par l’application
doit être identique à celui obtenu à la main sur le même réseau de
tâches, et les marges totales doivent correspondre à l’écart calculé
manuellement, au jour près.

| **Validation**                           | **Nom**        | **Date** | **Signature** |
|------------------------------------------|----------------|----------|---------------|
| Expert métier (rédacteur)                | \[NOM Prénom\] |          |               |
| Responsable de l’équipe de développement | \[NOM Prénom\] |          |               |
| Encadreur / entreprise                   | \[NOM Prénom\] |          |               |
