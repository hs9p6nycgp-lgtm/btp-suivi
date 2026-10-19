"""Scénarios des trois vidéos de démonstration de BTP Suivi Pro (30 s chacune).

Chaque scénario est une fonction du temps (en secondes) qui renvoie un
canevas : c'est l'image affichée à cet instant de la vidéo.
"""

from __future__ import annotations

from rendu import (
    ACTION,
    ACTION_FORT,
    BORDER,
    DANGER,
    ENCRE,
    FOND,
    MUTED,
    PRIMARY,
    PRIMARY_CLAIR,
    PRIMARY_DEEP,
    SUCCESS,
    SURFACE,
    SURFACE_2,
    WARNING,
    Canevas,
    texte_cible,
)

NAVIGATION = ["Accueil", "Chantiers", "Alertes", "Journal", "BPU", "Référentiel", "Rapports"]


def progression(depart: float, arrivee: float, t: float, debut: float, duree: float) -> float:
    """Progression linéaire (0 à 1) entre deux instants."""
    if t < debut:
        return 0.0
    if t > debut + duree:
        return 1.0
    return (t - debut) / duree


def melange(c0: float, c1: float, avance: float) -> float:
    return c0 + (c1 - c0) * avance


# --- Vignettes ----------------------------------------------------------------


def photo_chantier(c: Canevas, x0: float, y0: float, x1: float, y1: float) -> None:
    """Petite photo de chantier (route et engin) dessinée à la main."""
    hauteur = y1 - y0
    largeur = x1 - x0
    c.rect(x0, y0, x1, y1, 0, "#cfe4f5")
    # Route
    c.dessin.polygon(
        [
            (x0 + largeur * 0.30, y0 + hauteur * 0.42),
            (x0 + largeur * 0.52, y0 + hauteur * 0.42),
            (x1, y1),
            (x0, y1),
        ],
        fill="#8d9aa8",
    )
    # Accotement
    c.dessin.polygon(
        [
            (x0 + largeur * 0.22, y0 + hauteur * 0.42),
            (x0 + largeur * 0.30, y0 + hauteur * 0.42),
            (x0 + largeur * 0.16, y1),
            (x0, y1),
        ],
        fill="#b58b5a",
    )
    # Engin
    c.rect(x0 + largeur * 0.34, y0 + hauteur * 0.30, x0 + largeur * 0.52, y0 + hauteur * 0.46, 3, "#f97316")
    c.rect(x0 + largeur * 0.37, y0 + hauteur * 0.18, x0 + largeur * 0.50, y0 + hauteur * 0.32, 3, "#fbbf24")
    c.ellipse(
        x0 + largeur * 0.35, y0 + hauteur * 0.42, x0 + largeur * 0.42, y0 + hauteur * 0.50, "#1f2937", "#1f2937"
    )
    c.ellipse(
        x0 + largeur * 0.45, y0 + hauteur * 0.42, x0 + largeur * 0.52, y0 + hauteur * 0.50, "#1f2937", "#1f2937"
    )
    # Ciel
    c.ellipse(x0 + largeur * 0.72, y0 + hauteur * 0.10, x0 + largeur * 0.82, y0 + hauteur * 0.22, "#fde68a")
    c.rect(x0, y0, x1, y1, 8, None, BORDER)


def telephone(c: Canevas, x0: float, y0: float, largeur: float = 250) -> float:
    """Cadre de téléphone ; renvoie la hauteur."""
    hauteur = largeur * 2.05
    c.rect(x0 - 10, y0 - 10, x0 + largeur + 10, y0 + hauteur + 10, 26, "#1f2937")
    c.rect(x0, y0, x0 + largeur, y0 + hauteur, 18, SURFACE)
    c.rect(x0 + largeur / 2 - 26, y0 + 6, x0 + largeur / 2 + 26, y0 + 16, 5, "#334155")
    return hauteur


# --- Écrans -------------------------------------------------------------------


def ecran_accueil(t: float) -> Canevas:
    c = Canevas()
    c.barre_laterale(NAVIGATION, "Accueil")
    c.barre_haut("Tableau de bord", ["Rechercher", "Alertes", "Thème"])

    c.texte(232, 82, "Chantiers", 12, True, MUTED)
    c.texte(232, 100, "Bonsoir, Kouassi", 24, True, ENCRE)

    cartes = [
        ("Chantiers", "7", "4 en cours", PRIMARY_CLAIR),
        ("Montant total", "1,25 Md", "FCFA · 4 chantiers", ACTION),
        ("Avancement moyen", "46 %", "+4 % ce mois-ci", SUCCESS),
        ("Alertes ouvertes", "3", "1 critique", DANGER),
    ]
    x = 232
    for titre, valeur, detail, accent in cartes:
        c.carte_stat(x, 140, x + 160, 236, titre, valeur, detail, accent)
        x += 172

    c.ombre_carte(232, 254, 690, 470)
    c.texte(252, 274, "Chantiers en cours", 14, True, ENCRE)
    lignes = [
        ("Route de Yopougon", "Route", "62 %", "1 alerte"),
        ("Carrefour Tokpta", "Route", "31 %", "—"),
        ("Villa Cocody", "Bâtiment", "45 %", "2 alertes"),
    ]
    y = 306
    for nom, typ, avancement, alertes in lignes:
        c.texte(252, y, nom, 13, True, ENCRE)
        c.texte(252, y + 18, typ, 11, False, MUTED)
        c.texte(560, y + 8, avancement, 13, True, ENCRE, anchor="rm")
        if alertes != "—":
            c.pastille(578, y + 1, alertes, DANGER, "#fee2e2")
        c.ligne(252, y + 36, 670, y + 36, BORDER)
        y += 46

    c.ombre_carte(706, 254, 936, 470)
    c.texte(726, 274, "À faire aujourd'hui", 14, True, ENCRE)
    actions = ["Saisir le journal du jour", "Traiter 1 non-conformité", "Réapprovisionner la latérite"]
    y = 306
    for index, action in enumerate(actions):
        c.rect(726, y, 742, y + 16, 4, ACTION if index == 0 else BORDER)
        c.texte(752, y + 1, action, 12, index == 0, ENCRE if index == 0 else MUTED)
        y += 38

    # Curseur : de la carte « Chantiers » vers la première ligne de la liste.
    avance = progression(0, 1, t, 1.0, 3.0)
    x = melange(310, 400, avance)
    y = melange(112, 312, avance)
    c.vignette(232, 140, 392, 236, ACTION, 12)
    c.curseur(x, y, presse=avance > 0.95)

    c.legende("Tous vos chantiers, leur avancement et les alertes en cours, sur un seul écran.")
    return c


def ecran_chantiers(t: float) -> Canevas:
    c = Canevas()
    c.barre_laterale(NAVIGATION, "Chantiers")
    c.barre_haut("Chantiers", ["Rechercher", "Alertes", "Thème"])

    c.texte(232, 86, "7 chantiers", 24, True, ENCRE)
    c.pastille(232, 122, "4 en cours", PRIMARY, "#e8eef6")
    c.pastille(320, 122, "2 en préparation", MUTED, "#eef2f7")
    c.pastille(452, 122, "1 clôturé", SUCCESS, "#dcfce7")

    c.ombre_carte(232, 162, 936, 462)
    entetes = [("Chantier", "l"), ("Type", "l"), ("Montant", "r"), ("Avancement", "r"), ("Alertes", "r")]
    positions = [252, 470, 600, 760, 860]
    for (texte, alignement), x in zip(entetes, positions):
        if alignement == "r":
            c.texte(x + 60, 186, texte, 11, True, MUTED, anchor="rm")
        else:
            c.texte(x, 186, texte, 11, True, MUTED)
    c.ligne(252, 204, 916, 204, BORDER)

    lignes = [
        ("Route de Yopougon", "Route", "480 000 000", "62 %", "1"),
        ("Carrefour Tokpta", "Route", "215 000 000", "31 %", "0"),
        ("Villa Cocody", "Bâtiment", "320 000 000", "45 %", "2"),
        ("Autoroute du Nord", "Route", "980 000 000", "12 %", "0"),
    ]
    y = 218
    for index, (nom, typ, montant, avancement, alertes) in enumerate(lignes):
        c.texte(252, y + 16, nom, 13, True, ENCRE, anchor="lm")
        c.texte(470, y + 16, typ, 12, False, MUTED, anchor="lm")
        c.texte(660, y + 16, montant + " FCFA", 12, False, ENCRE, anchor="rm")
        c.texte(790, y + 16, avancement, 12, True, ENCRE, anchor="rm")
        if alertes != "0":
            c.pastille(866, y + 4, alertes, DANGER, "#fee2e2")
        else:
            c.texte(890, y + 16, "—", 12, False, MUTED, anchor="rm")
        c.ligne(252, y + 36, 916, y + 36, BORDER)
        y += 44

    avance = progression(0, 1, t, 1.0, 2.5)
    c.vignette(244, 218, 460, 254, ACTION, 8)
    c.curseur(melange(300, 420, avance), melange(300, 236, avance), presse=avance > 0.9)

    c.legende("La liste complète : routes et bâtiments, montants, avancement et alertes.")
    return c


def ecran_fiche(t: float) -> Canevas:
    c = Canevas()
    c.barre_laterale(NAVIGATION, "Chantiers")
    c.barre_haut("Route de Yopougon", ["Imprimer", "Alertes", "Thème"])

    c.texte(232, 86, "Route de Yopougon", 24, True, ENCRE)
    c.texte(232, 116, "District d'Abidjan · 1 250 m · lot 2 · 480 000 000 FCFA", 13, False, MUTED)

    c.ombre_carte(232, 148, 566, 300)
    c.texte(252, 168, "Avancement du chantier", 13, True, ENCRE)
    c.rect(252, 200, 546, 214, 7, "#e2e8f0")
    c.rect(252, 200, 252 + 294 * 0.62, 214, 7, SUCCESS)
    c.texte(252, 226, "62 % réalisé", 22, True, ENCRE)
    c.texte(252, 262, "48 jours restants · fin prévue le 30/11/2026", 12, False, MUTED)

    c.ombre_carte(582, 148, 936, 300)
    c.texte(602, 168, "Alertes en cours", 13, True, ENCRE)
    alertes = [("Dépassement de budget", "+7 % · seuil 5 %", DANGER), ("Stock bas · Latérite", "12 m³ · seuil 20 m³", WARNING)]
    y = 196
    for titre, detail, couleur in alertes:
        c.rect(602, y, 608, y + 34, 3, couleur)
        c.texte(618, y, titre, 12, True, ENCRE)
        c.texte(618, y + 16, detail, 11, False, MUTED)
        y += 44

    c.ombre_carte(232, 316, 936, 470)
    c.texte(252, 336, "Journaux du jour", 13, True, ENCRE)
    c.rect(252, 364, 916, 404, 10, SURFACE_2)
    c.texte(268, 384, "Journal du 19/10 · 28 personnes · 6 engins · 145 m³ posés", 12, False, ENCRE, anchor="lm")
    c.rect(252, 412, 916, 452, 10, "#fff7ed", ACTION)
    c.texte(268, 432, "À faire : saisir le journal · 1 non-conformité à traiter", 12, True, ACTION_FORT, anchor="lm")

    avance = progression(0, 1, t, 1.0, 2.5)
    c.vignette(244, 356, 640, 404, ACTION, 8)
    c.curseur(melange(300, 500, avance), melange(260, 384, avance), presse=avance > 0.9)

    c.legende("La fiche du chantier : avancement, alertes, journaux et travaux à faire.")
    return c


def ecran_pv(t: float) -> Canevas:
    """Feuille A4 du procès-verbal (vue imprimée)."""
    c = Canevas()
    c.rect(0, 0, 960, 540, 0, "#e2e8f0")
    x0, y0, x1, y1 = 250, 24, 710, 466
    c.rect(x0 + 3, y0 + 5, x1 + 3, y1 + 5, 4, "#cbd5e1")
    c.rect(x0, y0, x1, y1, 4, "#ffffff")

    c.texte(x0 + 26, y0 + 20, "PROCÈS-VERBAL DE CHANTIER", 10, True, MUTED)
    c.texte(x0 + 26, y0 + 40, "Route de Yopougon", 20, True, ENCRE)
    c.texte(x0 + 26, y0 + 66, "Journal du 19/10/2026", 12, False, MUTED)
    c.ligne(x0 + 26, y0 + 90, x1 - 26, y0 + 90, ENCRE, 2)

    infos = [
        ("Maître d'ouvrage", "District d'Abidjan"),
        ("Entreprise", "SOTRA LOG"),
        ("Effectif présent", "28 personnes"),
        ("Matériels", "6 engins · 54 h de marche"),
    ]
    y = y0 + 104
    for libelle, valeur in infos:
        c.texte(x0 + 26, y, libelle + " :", 11, True, ENCRE)
        c.texte(x0 + 190, y, valeur, 11, False, ENCRE)
        y += 20

    y += 10
    c.texte(x0 + 26, y, "CONDITIONS DU JOUR", 10, True, MUTED)
    c.ligne(x0 + 26, y + 14, x1 - 26, y + 14, BORDER)
    y += 24
    c.texte(x0 + 26, y, "Météo : pluie le matin", 11, False, ENCRE)
    y += 20
    c.texte(x0 + 26, y, "Quantités réalisées : 145 m³ de latérite, 320 m³ de terrassement", 11, False, ENCRE)
    y += 20
    c.texte(x0 + 26, y, "Incident : pluie battante, arrêt de 2 h", 11, False, ENCRE)

    y += 34
    c.texte(x0 + 26, y, "SIGNATURES", 10, True, MUTED)
    c.ligne(x0 + 26, y + 14, x1 - 26, y + 14, BORDER)
    y += 30
    for x, libelle in ((x0 + 26, "Chef de chantier"), (x0 + 240, "Maître d'œuvre")):
        c.ligne(x, y + 46, x + 180, y + 46, MUTED)
        c.texte(x, y + 54, libelle, 10, False, MUTED)

    avance = progression(0, 1, t, 0.5, 2.0)
    c.vignette(x0 + 20, y0 + 360, x0 + 200, y0 + 410, ACTION, 8)
    c.curseur(melange(700, 300, avance), melange(440, 400, avance), presse=avance > 0.9)

    c.legende("Un procès-verbal A4 prêt à signer, sorti en un clic depuis le journal.")
    return c


# --- Scénario 1 : le tableau de bord -----------------------------------------


def scene_1(t: float) -> Canevas:
    if t < 4:
        c = Canevas()
        c.sur_titre("BTP Suivi Pro", "Le suivi de chantier, du chantier au bureau")
        return c
    if t < 13:
        return ecran_accueil(t - 4)
    if t < 21:
        return ecran_chantiers(t - 13)
    if t < 27:
        return ecran_fiche(t - 21)
    c = Canevas()
    c.sur_titre("Un chantier, une seule application", "Journal · Coûts · Qualité · Stocks · Planning")
    return c


# --- Scénario 2 : la saisie sur le terrain -----------------------------------


def ecran_mobile(c: Canevas, x: float, y: float) -> None:
    """Écran de téléphone : journal du jour (mode terrain)."""
    hauteur = telephone(c, x, y, 210)
    c.rect(x, y, x + 210, y + 44, 14, PRIMARY)
    c.rect(x, y + 30, x + 210, y + 44, 0, PRIMARY)
    c.texte(x + 16, y + 14, "Journal du 19/10", 12, True, "#ffffff")
    # Menu (trois traits)
    for i in range(3):
        c.ligne(x + 172, y + 16 + i * 5, x + 192, y + 16 + i * 5, "#9fb4cd", 2)

    c.texte(x + 16, y + 58, "Météo", 11, True, MUTED)
    c.rect(x + 16, y + 76, x + 194, y + 104, 8, SURFACE_2, BORDER)
    c.texte(x + 28, y + 90, "Pluie le matin", 12, False, ENCRE, anchor="lm")

    c.texte(x + 16, y + 118, "Effectif", 11, True, MUTED)
    c.rect(x + 16, y + 136, x + 194, y + 164, 8, SURFACE_2, BORDER)
    c.texte(x + 28, y + 150, "Manœuvres · 28", 12, False, ENCRE, anchor="lm")

    c.texte(x + 16, y + 178, "Matériels", 11, True, MUTED)
    c.rect(x + 16, y + 196, x + 194, y + 224, 8, SURFACE_2, BORDER)
    c.texte(x + 28, y + 210, "Chargeuse · 7,5 h", 12, False, ENCRE, anchor="lm")

    c.texte(x + 16, y + 238, "Photos", 11, True, MUTED)
    c.rect(x + 16, y + 256, x + 100, y + 322, 8, "#eef2f7", BORDER)
    c.texte(x + 58, y + 289, "+", 22, False, MUTED, anchor="mm")
    c.texte(x + 58, y + 308, "Photo", 10, False, MUTED, anchor="mm")


def scene_2(t: float) -> Canevas:
    if t < 4:
        c = Canevas()
        c.sur_titre("Sur le chantier, sans réseau", "La saisie continue, même sans couverture")
        return c

    c = Canevas()
    # Fond : chantier au soleil
    c.rect(0, 0, 960, 540, 0, "#dbeafe")
    c.dessin.polygon([(0, 330), (300, 250), (620, 320), (960, 260), (960, 540), (0, 540)], fill="#a7b8a1")
    c.dessin.polygon([(0, 400), (260, 330), (560, 400), (960, 340), (960, 540), (0, 540)], fill="#8d9aa8")

    x_tel, y_tel = 120, 40
    if t < 12:
        ecran_mobile(c, x_tel, y_tel)
        c.legende("Le mode terrain : des textes lisibles en plein soleil.")
    elif t < 18:
        ecran_mobile(c, x_tel, y_tel)
        # Photo ajoutée
        photo_chantier(c, x_tel + 108, y_tel + 256, x_tel + 194, y_tel + 322)
        avance = progression(0, 1, t - 12, 0.4, 1.6)
        c.curseur(x_tel + 58, y_tel + 289, presse=avance > 0.8)
        c.legende("La photo est prise et jointe au journal, en deux gestes.")
    elif t < 24:
        ecran_mobile(c, x_tel, y_tel)
        photo_chantier(c, x_tel + 108, y_tel + 256, x_tel + 194, y_tel + 322)
        # Pastille hors connexion
        c.rect(420, 150, 760, 196, 14, "#ffffff", WARNING)
        c.texte(442, 173, "Hors connexion · 1 action en attente", 14, True, WARNING, anchor="lm")
        c.legende("Sans réseau, la photo est conservée sur le téléphone.")
    else:
        ecran_mobile(c, x_tel, y_tel)
        photo_chantier(c, x_tel + 108, y_tel + 256, x_tel + 194, y_tel + 322)
        c.rect(420, 150, 760, 196, 14, "#ffffff", SUCCESS)
        c.texte(442, 173, "Connexion rétablie · tout est synchronisé", 14, True, SUCCESS, anchor="lm")
        c.legende("De retour sur le réseau, tout part automatiquement.")

    # Bloc d'explication à droite
    c.ombre_carte(420, 230, 900, 430)
    c.texte(494, 254, "Ce que ça change", 15, True, ENCRE)
    lignes = [
        "La saisie ne se perd plus",
        "Les photos partent en file",
        "Les écrans déjà vus restent lisibles",
        "Le journal part à la reconnexion",
    ]
    y = 288
    for ligne in lignes:
        c.ellipse(494, y + 2, 504, y + 12, SUCCESS)
        c.texte(516, y, ligne, 13, False, ENCRE)
        y += 32
    return c


# --- Scénario 3 : les alertes et le procès-verbal -----------------------------


def scene_3(t: float) -> Canevas:
    if t < 4:
        c = Canevas()
        c.sur_titre("Rien ne passe inaperçu", "Alertes, non-conformités, retards, stocks : tout est centralisé")
        return c

    if t < 12:
        c = Canevas()
        c.barre_laterale(NAVIGATION, "Chantiers")
        c.barre_haut("Chantier", ["Rechercher", "Alertes", "Thème"])
        c.ombre_carte(232, 80, 936, 500)
        c.texte(252, 104, "Route de Yopougon", 24, True, ENCRE)
        c.texte(252, 136, "Fiche du chantier", 13, False, MUTED)
        # Panneau de la cloche
        avance = progression(0, 1, t - 4, 1.0, 1.2)
        if avance > 0:
            x0 = 660
            c.rect(x0, 58, 940, 300, 14, SURFACE, BORDER)
            c.texte(x0 + 18, 76, "Alertes (3)", 14, True, ENCRE)
            alertes = [
                ("Dépassement de budget", "Route de Yopougon · +7 %", DANGER),
                ("Stock bas · Latérite", "Route de Yopougon · 12 m³", WARNING),
                ("Retard de planning", "Carrefour Tokpta · 12 j", DANGER),
            ]
            y = 106
            for titre, detail, couleur in alertes:
                c.rect(x0 + 18, y, x0 + 24, y + 32, 3, couleur)
                c.texte(x0 + 34, y, titre, 12, True, ENCRE)
                c.texte(x0 + 34, y + 17, detail, 11, False, MUTED)
                y += 46
            c.texte(x0 + 18, 258, "Voir toutes les alertes", 11, True, PRIMARY_CLAIR)
        c.curseur(872, 30, presse=avance > 0.85)
        c.legende("La cloche regroupe tout ce qui demande votre attention.")
        return c

    if t < 20:
        c = Canevas()
        c.barre_laterale(NAVIGATION, "Alertes")
        c.barre_haut("Centre d'alertes", ["Rechercher", "Alertes", "Thème"])
        c.texte(232, 86, "Centre d'alertes", 24, True, ENCRE)
        c.pastille(232, 122, "À traiter (3)", PRIMARY, "#e8eef6")
        c.pastille(340, 122, "Traités (12)", MUTED, "#eef2f7")
        c.bouton(830, 112, "Exporter (CSV)", MUTED, clair=True)

        lignes = [
            ("Dépassement de budget", "Route de Yopougon", "+7 % · seuil 5 %", DANGER),
            ("Stock bas · Latérite", "Route de Yopougon", "12 m³ · seuil 20 m³", WARNING),
            ("Non-conformité · Fondation", "Villa Cocody", "Échéance dépassée le 12/10", DANGER),
            ("Retard de planning", "Carrefour Tokpta", "12 jours de retard", WARNING),
        ]
        y = 162
        for titre, chantier, detail, couleur in lignes:
            c.ombre_carte(232, y, 936, y + 66)
            c.rect(232, y, 238, y + 66, 3, couleur)
            c.texte(254, y + 16, titre, 14, True, ENCRE)
            c.texte(254, y + 38, f"{chantier} · {detail}", 12, False, MUTED)
            y += 78
        c.legende("Un seul écran pour les alertes de tous vos chantiers, exportables en CSV.")
        return c

    if t < 26:
        return ecran_pv(t - 20)

    c = Canevas()
    c.sur_titre("Le suivi se justifie", "Chaque alerte traitée, chaque procès-verbal signé")
    return c
