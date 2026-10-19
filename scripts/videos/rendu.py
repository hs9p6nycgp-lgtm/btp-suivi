"""Boîte à outils de rendu des vidéos de démonstration de BTP Suivi Pro.

Aucune dépendance externe à installer : le rendu est fait avec Pillow, image
par image, puis assemblé en GIF animé (lisible partout, insérable dans un
diaporama comme dans l'application).

La palette reprend exactement celle de l'application (voir src/app/globals.css)
pour que les écrans reconstitués soient fidèles.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

# --- Dimensions ---------------------------------------------------------------

LARGEUR = 960
HAUTEUR = 540
FPS = 10
DUREE_SECONDES = 30

# --- Palette de l'application -------------------------------------------------

FOND = "#f5f7fb"
SURFACE = "#ffffff"
SURFACE_2 = "#f8fafc"
ENCRE = "#0f172a"
PRIMARY = "#0f2a4a"
PRIMARY_CLAIR = "#3b6ea5"
PRIMARY_DEEP = "#081a30"
ACTION = "#f97316"
ACTION_FORT = "#ea580c"
SUCCESS = "#16a34a"
WARNING = "#d97706"
DANGER = "#dc2626"
MUTED = "#64748b"
BORDER = "#e2e8f0"

# --- Polices ------------------------------------------------------------------

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_GRAS = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

_cache_polices: dict[tuple[int, bool], ImageFont.FreeTypeFont] = {}


def police(taille: int, gras: bool = False) -> ImageFont.FreeTypeFont:
    """Police Arial (normale ou grasse), mise en cache."""
    cle = (taille, gras)
    if cle not in _cache_polices:
        _cache_polices[cle] = ImageFont.truetype(ARIAL_GRAS if gras else ARIAL, taille)
    return _cache_polices[cle]


def texte_cible(texte: str, taille: int, gras: bool = False) -> int:
    """Largeur approximative d'un texte, en pixels."""
    return int(ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(texte, font=police(taille, gras)))


# --- Canevas ------------------------------------------------------------------


@dataclass
class Canevas:
    """Image de travail et primitives de dessin."""

    largeur: int = LARGEUR
    hauteur: int = HAUTEUR

    def __post_init__(self) -> None:
        self.image = Image.new("RGB", (self.largeur, self.hauteur), FOND)
        self.dessin = ImageDraw.Draw(self.image)

    # -- formes ---------------------------------------------------------------

    def rect(
        self,
        x0: float,
        y0: float,
        x1: float,
        y1: float,
        rayon: int = 0,
        remplissage: str | None = None,
        contour: str | None = None,
        largeur_contour: int = 1,
    ) -> None:
        boite = [x0, y0, x1, y1]
        if rayon > 0:
            self.dessin.rounded_rectangle(
                boite, radius=rayon, fill=remplissage, outline=contour, width=largeur_contour
            )
        else:
            self.dessin.rectangle(
                boite, fill=remplissage, outline=contour, width=largeur_contour
            )

    def ligne(self, x0: float, y0: float, x1: float, y1: float, couleur: str, largeur: int = 1) -> None:
        self.dessin.line([x0, y0, x1, y1], fill=couleur, width=largeur)

    def ellipse(
        self,
        x0: float,
        y0: float,
        x1: float,
        y1: float,
        remplissage: str | None = None,
        contour: str | None = None,
        largeur_contour: int = 1,
    ) -> None:
        self.dessin.ellipse([x0, y0, x1, y1], fill=remplissage, outline=contour, width=largeur_contour)

    def texte(
        self,
        x: float,
        y: float,
        contenu: str,
        taille: int = 14,
        gras: bool = False,
        couleur: str = ENCRE,
        anchor: str = "la",
    ) -> None:
        """Texte ancré : « la » (haut-gauche), « mm » (milieu), « ra » (haut-droite)."""
        self.dessin.text((x, y), contenu, font=police(taille, gras), fill=couleur, anchor=anchor)

    def texte_sur_une_ligne(
        self,
        x: float,
        y: float,
        contenu: str,
        largeur_max: float,
        taille: int = 14,
        gras: bool = False,
        couleur: str = ENCRE,
    ) -> None:
        """Texte coupé avec « … » s'il est trop long."""
        if texte_cible(contenu, taille, gras) <= largeur_max:
            self.texte(x, y, contenu, taille, gras, couleur)
            return
        coupe = contenu
        while coupe and texte_cible(coupe + "…", taille, gras) > largeur_max:
            coupe = coupe[:-1]
        self.texte(x, y, coupe + "…", taille, gras, couleur)

    # -- composants de l'interface -------------------------------------------

    def ombre_carte(self, x0: float, y0: float, x1: float, y1: float, rayon: int = 14) -> None:
        """Ombre portée douce sous une carte (deux rectangles flous simulés)."""
        self.rect(x0 + 1, y0 + 3, x1 + 1, y1 + 3, rayon, "#e8edf5")
        self.rect(x0, y0, x1, y1, rayon, SURFACE, BORDER)

    def barre_laterale(self, entrees: list[str], actif: str = "") -> None:
        """Barre de navigation latérale (fond bleu nuit)."""
        self.rect(0, 0, 208, self.hauteur, 0, PRIMARY)
        self.rect(24, 22, 24 + 34, 56, 10, ACTION)
        self.texte(24 + 44, 30, "BTP Suivi", 17, True, "#ffffff")
        self.texte(24 + 44, 48, "Suivi Pro", 11, False, "#9fb4cd")
        y = 84
        for entree in entrees:
            if entree == actif:
                self.rect(14, y - 6, 194, y + 24, 10, "#123459")
                self.rect(14, y - 6, 18, y + 24, 2, ACTION)
            self.texte(32, y, entree, 14, entree == actif, "#ffffff" if entree == actif else "#c6d4e4")
            y += 38

    def barre_haut(self, titre: str, droite: list[str] = ()) -> None:
        """Barre du haut (titre à gauche, actions à droite)."""
        self.rect(0, 0, self.largeur, 58, 0, SURFACE)
        self.ligne(0, 58, self.largeur, 58, BORDER)
        self.texte(228, 18, titre, 19, True, ENCRE)
        x = self.largeur - 24
        for libelle in droite:
            largeur = texte_cible(libelle, 12) + 26
            self.rect(x - largeur, 14, x, 44, 10, SURFACE_2, BORDER)
            self.texte(x - largeur / 2, 29, libelle, 12, False, MUTED, anchor="mm")
            x -= largeur + 10

    def bouton(self, x0: float, y0: float, texte: str, couleur: str = PRIMARY, clair: bool = False) -> float:
        """Bouton ; renvoie sa largeur."""
        largeur = texte_cible(texte, 13, True) + 30
        self.rect(x0, y0, x0 + largeur, y0 + 34, 10, SURFACE_2 if clair else couleur, None if clair else couleur)
        self.texte(x0 + largeur / 2, y0 + 17, texte, 13, True, couleur if clair else "#ffffff", anchor="mm")
        return largeur

    def pastille(self, x0: float, y0: float, texte: str, couleur: str, fond: str | None = None) -> float:
        """Petite pastille colorée ; renvoie sa largeur."""
        largeur = texte_cible(texte, 11, True) + 20
        self.rect(x0, y0, x0 + largeur, y0 + 24, 12, fond or "#ffffff")
        self.texte(x0 + largeur / 2, y0 + 12, texte, 11, True, couleur, anchor="mm")
        return largeur

    def carte_stat(
        self,
        x0: float,
        y0: float,
        x1: float,
        y1: float,
        titre: str,
        valeur: str,
        detail: str,
        accent: str,
    ) -> None:
        """Carte de chiffre clé (comme sur l'accueil)."""
        self.ombre_carte(x0, y0, x1, y1)
        self.rect(x0, y0, x1, y0 + 5, 0, accent)
        self.texte(x0 + 18, y0 + 20, titre, 12, True, MUTED)
        self.texte(x0 + 18, y0 + 40, valeur, 30, True, ENCRE)
        self.texte(x0 + 18, y1 - 26, detail, 11, False, MUTED)

    def ligne_tableau(
        self,
        x0: float,
        y0: float,
        x1: float,
        colonnes: list[tuple[str, str]],
        hauteur: float = 34,
        taille: int = 13,
    ) -> None:
        """Ligne de tableau : colonnes = [(texte, alignement)] avec alignements « l » ou « r »."""
        for texte, alignement in colonnes:
            if alignement == "r":
                self.texte(x1 - 12, y0 + hauteur / 2, texte, taille, False, ENCRE, anchor="rm")
            else:
                self.texte(x0 + 12, y0 + hauteur / 2, texte, taille, False, ENCRE, anchor="lm")
        self.ligne(x0, y0 + hauteur, x1, y0 + hauteur, BORDER)

    def sur_titre(self, texte: str, sous_titre: str = "") -> None:
        """Bandeau de titre en haut de l'image (introduction d'une vidéo)."""
        self.rect(0, 0, self.largeur, self.hauteur, 0, PRIMARY)
        self.rect(0, self.hauteur - 96, self.largeur, self.hauteur, 0, PRIMARY)
        self.rect(48, 168, 96, 216, 12, ACTION)
        self.texte(48, 232, texte, 40, True, "#ffffff")
        if sous_titre:
            self.texte(50, 292, sous_titre, 18, False, "#a9bed6")
        self.ligne(48, 132, 120, 132, ACTION, 3)

    def legende(self, texte: str) -> None:
        """Bandeau de sous-titrage en bas de l'image."""
        self.rect(0, self.hauteur - 58, self.largeur, self.hauteur, 0, "#0b1b2c")
        self.texte(30, self.hauteur - 29, texte, 16, False, "#ffffff", anchor="lm")

    def curseur(self, x: float, y: float, presse: bool = False) -> None:
        """Curseur de souris (pointe blanche à contour sombre)."""
        if not presse:
            self.dessin.polygon(
                [(x, y), (x, y + 22), (x + 6, y + 16), (x + 11, y + 26), (x + 15, y + 24), (x + 10, y + 14), (x + 17, y + 13)],
                fill="#ffffff",
                outline="#1f2937",
            )
        else:
            self.ellipse(x - 12, y - 12, x + 12, y + 12, "#ffffff", "#1f2937", 2)
            self.ellipse(x - 5, y - 5, x + 5, y + 5, ACTION)

    def vignette(self, x0: float, y0: float, x1: float, y1: float, couleur: str, rayon: int = 10) -> None:
        """Rectangle de mise en valeur (halo coloré)."""
        self.rect(x0 - 5, y0 - 5, x1 + 5, y1 + 5, rayon + 3, None, couleur, 3)

    def capture(self) -> Image.Image:
        return self.image


# --- Export GIF ----------------------------------------------------------------


def ecrire_gif(chemin: str, images: list[Image.Image], duree_ms: int = 100) -> None:
    """Assemble les images en GIF animé (palette commune pour éviter le scintillement)."""
    if not images:
        return
    # Palette commune : calculée sur un échantillon d'images.
    echantillon = Image.new("RGB", (LARGEUR, HAUTEUR * min(4, len(images))))
    for index, image in enumerate(images[:4]):
        echantillon.paste(image, (0, index * HAUTEUR))
    palette = echantillon.convert("P", palette=Image.Palette.ADAPTIVE, colors=128)

    converties = [
        image.convert("RGB").quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG)
        for image in images
    ]
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    converties[0].save(
        chemin,
        save_all=True,
        append_images=converties[1:],
        duration=duree_ms,
        loop=0,
        optimize=True,
        disposal=2,
    )


def images_de_la_scene(scene, duree: int = DUREE_SECONDES, fps: int = FPS) -> list[Image.Image]:
    """Génère les images d'une scène (une fonction du temps → canevas)."""
    return [scene(t / fps).capture() for t in range(duree * fps)]
