"""Génération des vidéos de démonstration de BTP Suivi Pro.

Usage :
    python3 scripts/videos/generer.py            # les trois vidéos
    python3 scripts/videos/generer.py 2          # seulement la vidéo 2

Les fichiers sont écrits dans `public/videos/` (donc visibles dans
l'application, via la page « Démo ») et une voix off est écrite dans
`docs/videos/voix-off.txt` pour la présentation orale.
"""

from __future__ import annotations

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image  # noqa: E402

import scenes  # noqa: E402
from rendu import DUREE_SECONDES, FPS, ecrire_gif  # noqa: E402

RACINE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DOSSIER_SORTIE = os.path.join(RACINE, "public", "videos")
DOSSIER_DOC = os.path.join(RACINE, "docs", "videos")

VIDEOS = [
    (1, "tableau-de-bord", scenes.scene_1, "Le tableau de bord"),
    (2, "saisie-sur-le-chantier", scenes.scene_2, "La saisie sur le terrain, sans réseau"),
    (3, "alertes-et-proces-verbal", scenes.scene_3, "Les alertes et le procès-verbal"),
]

# Voix off : repères de temps et texte à dire (une phrase par repère).
VOIX_OFF = """VOIX OFF — BTP Suivi Pro (3 vidéos de 30 secondes)

VIDÉO 1 — Le tableau de bord (30 s)
  0-4 s   « BTP Suivi Pro : le suivi de chantier, du chantier au bureau. »
  4-13 s  « Tous vos chantiers, leur avancement et les alertes en cours, sur un seul écran. »
  13-21 s « La liste complète : routes et bâtiments, montants, avancement et alertes. »
  21-27 s « La fiche du chantier : avancement, alertes, journaux et travaux à faire. »
  27-30 s « Un chantier, une seule application. »

VIDÉO 2 — La saisie sur le terrain, sans réseau (30 s)
  0-4 s   « Sur le chantier, sans réseau : la saisie continue, même sans couverture. »
  4-12 s  « Le mode terrain : des textes lisibles en plein soleil. »
  12-18 s « La photo est prise et jointe au journal, en deux gestes. »
  18-24 s « Sans réseau, la photo est conservée sur le téléphone. »
  24-30 s « De retour sur le réseau, tout part automatiquement. »

VIDÉO 3 — Les alertes et le procès-verbal (30 s)
  0-4 s   « Rien ne passe inaperçu : alertes, non-conformités, retards et stocks. »
  4-12 s  « La cloche regroupe tout ce qui demande votre attention. »
  12-20 s « Un seul écran pour les alertes de tous vos chantiers, exportables en CSV. »
  20-26 s « Un procès-verbal A4 prêt à signer, sorti en un clic depuis le journal. »
  26-30 s « Le suivi se justifie : chaque alerte traitée, chaque procès-verbal signé. »

CONSEILS DE PRÉSENTATION
  - Les vidéos se lisent dans n'importe quel navigateur (format GIF animé).
  - Pour une soutenance : enchaîner les trois, puis montrer l'application en direct.
  - Une version plein écran est disponible dans l'application : page « Démo ».
"""


def construire_video(scene) -> list[Image.Image]:
    """Construit les images d'une vidéo (30 s à 10 images/s)."""
    images = []
    for index in range(DUREE_SECONDES * FPS):
        images.append(scene(index / FPS).capture())
    return images


def main() -> None:
    selection = sys.argv[1:] if len(sys.argv) > 1 else None
    os.makedirs(DOSSIER_SORTIE, exist_ok=True)
    os.makedirs(DOSSIER_DOC, exist_ok=True)

    for numero, nom, scene, titre in VIDEOS:
        if selection and str(numero) not in selection:
            continue
        debut = time.time()
        images = construire_video(scene)
        chemin = os.path.join(DOSSIER_SORTIE, f"{numero}-{nom}.gif")
        ecrire_gif(chemin, images, duree_ms=int(1000 / FPS))
        taille = os.path.getsize(chemin) / (1024 * 1024)
        print(
            f"✅ {titre} : {chemin} "
            f"({len(images)} images, {taille:.1f} Mo, {time.time() - debut:.0f} s)"
        )

    with open(os.path.join(DOSSIER_DOC, "voix-off.txt"), "w", encoding="utf-8") as fichier:
        fichier.write(VOIX_OFF)
    print(f"✅ Voix off : {os.path.join(DOSSIER_DOC, 'voix-off.txt')}")


if __name__ == "__main__":
    main()
