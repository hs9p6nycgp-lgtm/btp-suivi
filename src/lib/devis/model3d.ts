// Modélisation 3D des devis : convertit les entrées d'un modèle de devis en une
// description géométrique (boîtes et cylindres), prête à être affichée par un
// composant basé sur three.js (Modele3DGenerique.tsx).
//
// Conventions à respecter côté affichage :
// - Unités : mètres. Axes : X = longueur, Y = hauteur (vers le haut), Z = largeur.
// - Le sol est au niveau Y = 0 (les pieux sont représentés en dessous).
// - `position` est le CENTRE de l'élément.
// - `taille` = [X, Y, Z]. Pour un cylindre : X = Z = diamètre, Y = hauteur ;
//   l'axe du cylindre est vertical (Y) tant que `rotation` ne le couche pas.
// - `rotation` est en degrés, autour d'un seul axe à la fois (ordre XYZ).
//   Exemple : une conduite couchée le long de X a la rotation [0, 0, 90].
// - `dimensions` et `centre` servent à cadrer la caméra (boîte englobante).
//
// Rendu réaliste (détails de chantier) :
// - murs : poteaux de renfort apparents + chaînage haut + chaînage bas ;
// - dalles / radiers : coffrage de rive périphérique ;
// - fondations : béton de propreté, amorces de poteaux, longrines de liaison ;
// - pieux : têtes de pieux émergeant du sol ;
// - charpente : faîtière, sablières et pannes sous les versants ;
// - planchers : poutrelles + dalle de compression + poutres de rive ;
// - chaussées : couche de base, enrobé, accotements et marquage axial ;
// - assainissement : conduite sur lit de pose + regards de visite ;
// - voirie : bordures, caniveaux, trottoirs et chaussée au droit du caniveau.
//
// Couleurs standardisées (COULEURS_ELEMENTS) : chaque type d'élément garde la
// même couleur dans TOUS les projets (route ou bâtiment, présents et futurs).

import type { DevisTemplate } from "./templates";

export type Forme3D = "boite" | "cylindre";

/** Couleur fixe par type d'élément, identique pour tous les projets. */
export const COULEURS_ELEMENTS = {
  // Maçonnerie et béton
  murAgglo: "#d9cdb8",
  enduit: "#e6e1d5",
  betonArme: "#9aa0a6",
  betonProprete: "#8c9196",
  dalleBeton: "#a8adb4",
  poteauBeton: "#8f98a5",
  chainage: "#6f7887",
  poutreBeton: "#7b8494",
  fondation: "#8d95a0",
  longrine: "#78818f",
  pieu: "#98a1a9",
  tetePieu: "#6d7683",
  treillis: "#5f6b7a",
  hourdis: "#b5bac1",
  coffrage: "#b98352",
  // Terrains et chaussées
  terre: "#b07a45",
  sable: "#d8c49a",
  grave: "#9e9e9e",
  enrobe: "#3f3f46",
  marquage: "#f4f4f5",
  accotement: "#c2b49a",
  // Réseaux et voirie
  conduite: "#38bdf8",
  regard: "#8b8684",
  caniveau: "#b9bcc0",
  bordure: "#d4d4d8",
  trottoir: "#cbcdd1",
  // Enveloppe
  tuile: "#b45309",
  charpenteBois: "#a1662f",
  faitiere: "#8a4b1f",
  // Finitions
  carrelage: "#e7e5e4",
  plinthe: "#c9c7c3",
  peinture: "#7fb3d5",
  fenetre: "#7dd3fc",
  porte: "#92400e",
} as const;

/** Clé de matériau standardisée (une couleur fixe par clé, tous projets confondus). */
export type CleMateriau = keyof typeof COULEURS_ELEMENTS;

/** @deprecated Conservé pour compatibilité : utiliser COULEURS_ELEMENTS (clé par élément). */
export const PALETTE_MATERIAUX = {
  agglo: COULEURS_ELEMENTS.murAgglo,
  beton: COULEURS_ELEMENTS.dalleBeton,
  betonArme: COULEURS_ELEMENTS.betonArme,
  betonProprete: COULEURS_ELEMENTS.betonProprete,
  terre: COULEURS_ELEMENTS.terre,
  grave: COULEURS_ELEMENTS.grave,
  enrobe: COULEURS_ELEMENTS.enrobe,
  tuile: COULEURS_ELEMENTS.tuile,
  carrelage: COULEURS_ELEMENTS.carrelage,
  peinture: COULEURS_ELEMENTS.peinture,
  pvc: COULEURS_ELEMENTS.conduite,
  regard: COULEURS_ELEMENTS.regard,
  bordure: COULEURS_ELEMENTS.bordure,
} as const;

export type Element3D = {
  /** Identifiant technique stable (ex. "poutrelle-3"). */
  id: string;
  forme: Forme3D;
  /** Libellé lisible en français (pour info-bulle / légende). */
  libelle: string;
  /** Clé de matériau standardisée (couleur fixe, identique pour tous les projets). */
  materiau: CleMateriau;
  /** Couleur hexadécimale "#rrggbb" (toujours COULEURS_ELEMENTS[materiau]). */
  couleur: string;
  /** Dimensions en mètres [X, Y, Z] (voir conventions). */
  taille: [number, number, number];
  /** Centre de l'élément en mètres (voir conventions). */
  position: [number, number, number];
  /** Rotation en degrés [X, Y, Z] (optionnel ; un seul axe à la fois). */
  rotation?: [number, number, number];
};

export type Modele3D = {
  /** Identifiant du modèle de devis d'origine. */
  templateId: string;
  /** Nom du modèle de devis. */
  nom: string;
  /** Phrase de résumé en français (ex. « Mur de 10 m x 2,8 m, épaisseur 15 cm »). */
  resume: string;
  /** Encombrement total [X, Y, Z] en mètres (pour cadrer la caméra). */
  dimensions: [number, number, number];
  /** Centre de la boîte englobante (cible de la caméra). */
  centre: [number, number, number];
  elements: Element3D[];
};

// ---------------------------------------------------------------
// Outils internes
// ---------------------------------------------------------------

/** Lecture numérique d'une entrée (0 si vide ou invalide), comme dans templates.ts. */
function n(i: Record<string, string>, cle: string, defaut = 0): number {
  const v = Number(i[cle]);
  return Number.isFinite(v) ? v : defaut;
}

/** Arrondi à 3 décimales (millimètre) pour garder des données propres. */
function arrondi(v: number, dec = 3): number {
  const f = 10 ** dec;
  return Math.round(v * f) / f;
}

/** Taille minimale : évite une géométrie dégénérée quand une entrée vaut 0. */
function minTaille(v: number): number {
  return Math.max(arrondi(Math.abs(v)), 0.01);
}

/** Nombre à la française pour les résumés (ex. « 2,8 »). */
const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

type V3 = [number, number, number];

/** Crée une boîte (parallélépipède) centrée sur `position`, colorée par clé de matériau. */
function boite(
  id: string,
  libelle: string,
  materiau: CleMateriau,
  taille: V3,
  position: V3,
  rotation?: V3,
): Element3D {
  return {
    id,
    forme: "boite",
    libelle,
    materiau,
    couleur: COULEURS_ELEMENTS[materiau],
    taille: taille.map(minTaille) as V3,
    position: position.map((v) => arrondi(v)) as V3,
    rotation,
  };
}

/** Crée un cylindre vertical (ou couché via `rotation`), centré sur `position`. */
function cylindre(
  id: string,
  libelle: string,
  materiau: CleMateriau,
  taille: V3,
  position: V3,
  rotation?: V3,
): Element3D {
  return {
    id,
    forme: "cylindre",
    libelle,
    materiau,
    couleur: COULEURS_ELEMENTS[materiau],
    taille: taille.map(minTaille) as V3,
    position: position.map((v) => arrondi(v)) as V3,
    rotation,
  };
}

/** Positions en grille centrée sur l'origine (colonnes ~ racine carrée du nombre). */
function grille(nb: number, ecartX: number, ecartZ = ecartX): [number, number][] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nb)));
  const lignes = Math.max(1, Math.ceil(nb / cols));
  const pos: [number, number][] = [];
  for (let k = 0; k < nb; k++) {
    const col = k % cols;
    const lig = Math.floor(k / cols);
    const parLigne = Math.min(cols, nb - lig * cols);
    pos.push([
      arrondi((col - (parLigne - 1) / 2) * ecartX),
      arrondi((lig - (lignes - 1) / 2) * ecartZ),
    ]);
  }
  return pos;
}

/** Répartit `nb` positions de -longueur/2 à +longueur/2 (bornes comprises). */
function repartition(nb: number, longueur: number): number[] {
  if (nb <= 1) return [0];
  const pos: number[] = [];
  for (let k = 0; k < nb; k++) pos.push(arrondi(-longueur / 2 + (k * longueur) / (nb - 1)));
  return pos;
}

/** Boîte englobante de tous les éléments (en tenant compte des rotations simples). */
function boiteEnglobante(elements: Element3D[]): { dimensions: V3; centre: V3 } {
  if (elements.length === 0) return { dimensions: [1, 1, 1], centre: [0, 0, 0] };
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const el of elements) {
    const [rx, ry, rz] = (el.rotation ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180);
    const demi: V3 = [el.taille[0] / 2, el.taille[1] / 2, el.taille[2] / 2];
    for (const cx of [-demi[0], demi[0]]) {
      for (const cy of [-demi[1], demi[1]]) {
        for (const cz of [-demi[2], demi[2]]) {
          let x = cx;
          let y = cy;
          let z = cz;
          if (rz !== 0) {
            const c = Math.cos(rz);
            const s = Math.sin(rz);
            const nx = x * c - y * s;
            y = x * s + y * c;
            x = nx;
          }
          if (ry !== 0) {
            const c = Math.cos(ry);
            const s = Math.sin(ry);
            const nx = x * c + z * s;
            z = -x * s + z * c;
            x = nx;
          }
          if (rx !== 0) {
            const c = Math.cos(rx);
            const s = Math.sin(rx);
            const ny = y * c - z * s;
            z = y * s + z * c;
            y = ny;
          }
          const p: V3 = [x + el.position[0], y + el.position[1], z + el.position[2]];
          for (let a = 0; a < 3; a++) {
            min[a] = Math.min(min[a], p[a]);
            max[a] = Math.max(max[a], p[a]);
          }
        }
      }
    }
  }
  return {
    dimensions: [arrondi(max[0] - min[0]), arrondi(max[1] - min[1]), arrondi(max[2] - min[2])],
    centre: [
      arrondi((max[0] + min[0]) / 2),
      arrondi((max[1] + min[1]) / 2),
      arrondi((max[2] + min[2]) / 2),
    ],
  };
}

/** Nombre d'éléments borné (sécurité d'affichage : jamais des milliers de pièces). */
function nbBorne(v: number, defaut: number, max = 120): number {
  return Math.min(max, Math.max(1, Math.round(Number.isFinite(v) && v > 0 ? v : defaut)));
}

type Geometrie = { resume: string; elements: Element3D[] };
type Fabrique = (i: Record<string, string>) => Geometrie;

// ---------------------------------------------------------------
// Un constructeur par modèle de devis
// ---------------------------------------------------------------

const construire: Record<string, Fabrique> = {
  // --- Bâtiment ---

  "mur-agglos": (i) => {
    const L = n(i, "longueur", 10);
    const H = n(i, "hauteur", 2.8);
    const e = n(i, "epaisseur", 0.15);
    // Poteaux de renfort (béton armé) : aux extrémités et tous les ~3,5 m.
    const nbPoteaux = Math.max(2, Math.ceil(L / 3.5) + 1);
    const ePoteau = e + 0.06; // poteaux légèrement plus épais que le mur (apparents)
    const eChaine = e + 0.04; // chaînages apparents sur les deux faces
    const elements: Element3D[] = [
      boite("mur", `Mur ${fmt.format(L)} x ${fmt.format(H)} m`, "murAgglo", [L, H, e], [0, H / 2, 0]),
      boite("chainage-bas", "Chaînage bas / longrine", "chainage", [L, 0.2, eChaine], [0, 0.09, 0]),
      boite(
        "chainage-haut",
        "Chaînage haut (ceinture)",
        "chainage",
        [L, 0.2, eChaine],
        [0, Math.max(H - 0.11, 0.11), 0],
      ),
    ];
    repartition(nbPoteaux, L).forEach((x, k) => {
      elements.push(
        boite(`poteau-${k + 1}`, `Poteau ${k + 1} (section 20 cm)`, "poteauBeton", [0.2, H, ePoteau], [x, H / 2 - 0.02, 0]),
      );
    });
    return {
      resume: `Mur de ${fmt.format(L)} m x ${fmt.format(H)} m, épaisseur ${fmt.format(e * 100)} cm, avec ${nbPoteaux} poteaux et chaînages haut / bas`,
      elements,
    };
  },

  "dalle-beton": (i) => {
    const L = n(i, "longueur", 10);
    const l = n(i, "largeur", 5);
    const e = n(i, "epaisseur", 0.12);
    const elements: Element3D[] = [
      boite("dalle", `Dalle ${fmt.format(e * 100)} cm`, "dalleBeton", [L, e, l], [0, e / 2, 0]),
      boite("coffrage-avant", "Coffrage de rive avant", "coffrage", [L + 0.2, e, 0.05], [0, e / 2, l / 2 + 0.03]),
      boite("coffrage-arriere", "Coffrage de rive arrière", "coffrage", [L + 0.2, e, 0.05], [0, e / 2, -(l / 2 + 0.03)]),
      boite("coffrage-gauche", "Coffrage de rive gauche", "coffrage", [0.05, e, l + 0.2], [-(L / 2 + 0.03), e / 2, 0]),
      boite("coffrage-droit", "Coffrage de rive droit", "coffrage", [0.05, e, l + 0.2], [L / 2 + 0.03, e / 2, 0]),
    ];
    return {
      resume: `Dalle de ${fmt.format(L)} m x ${fmt.format(l)} m, épaisseur ${fmt.format(e * 100)} cm (coffrage de rive compris)`,
      elements,
    };
  },

  "peinture": (i) => {
    const S = n(i, "surface", 100);
    const H = 2.8; // hauteur d'étage retenue pour représenter la surface à peindre
    const L = S / H;
    const elements: Element3D[] = [
      boite("panneau", `Surface peinte ${fmt.format(S)} m²`, "peinture", [L, H, 0.05], [0, H / 2, 0]),
      boite("plinthe", "Plinthes", "plinthe", [L, 0.1, 0.04], [0, 0.055, 0.04]),
      boite("porte", "Porte", "porte", [0.9, 2.05, 0.08], [0, 1.035, 0.045]),
    ];
    if (L >= 4) {
      elements.push(
        boite("fenetre-1", "Fenêtre 1", "fenetre", [0.9, 1.1, 0.075], [-L / 4, 1.6, 0.04]),
        boite("fenetre-2", "Fenêtre 2", "fenetre", [0.9, 1.1, 0.075], [L / 4, 1.6, 0.04]),
      );
    }
    return {
      resume: `Surface à peindre de ${fmt.format(S)} m² (équivalent d'un mur de ${fmt.format(L)} m x 2,8 m, porte et fenêtres compris)`,
      elements,
    };
  },

  "fondations-semelles": (i) => {
    const nb = nbBorne(n(i, "nb", 4), 4);
    const L = n(i, "longueur", 1.2);
    const l = n(i, "largeur", 1.2);
    const H = n(i, "hauteur", 0.6);
    const ep = n(i, "ep_proprete", 0.05);
    const positions = grille(nb, Math.max(L, l) + 1.5);
    const cols = Math.max(1, Math.ceil(Math.sqrt(nb)));
    const elements: Element3D[] = [];
    positions.forEach(([x, z], k) => {
      const rang = k + 1;
      elements.push(
        boite(`proprete-${rang}`, `Béton de propreté ${rang}`, "betonProprete", [L + 0.2, ep, l + 0.2], [x, ep / 2, z]),
        boite(`semelle-${rang}`, `Semelle ${rang} (${fmt.format(L)} x ${fmt.format(l)} m)`, "fondation", [L, H, l], [x, ep + H / 2, z]),
        boite(`amorce-poteau-${rang}`, `Amorce de poteau ${rang}`, "poteauBeton", [0.25, 0.5, 0.25], [x, ep + H + 0.25, z]),
      );
    });
    // Longrines de liaison entre semelles voisines (mêmes lignes et colonnes).
    const yLongrine = ep + H + 0.09;
    for (let k = 0; k < positions.length; k++) {
      const [x, z] = positions[k];
      if (k + 1 < positions.length && (k + 1) % cols !== 0) {
        const [x2] = positions[k + 1];
        const longueur = Math.abs(x2 - x);
        if (longueur > 0.4) {
          elements.push(
            boite(`longrine-x-${k + 1}`, `Longrine (${fmt.format(longueur)} m)`, "longrine", [longueur, 0.2, 0.2], [(x + x2) / 2, yLongrine, z]),
          );
        }
      }
      if (k + cols < positions.length) {
        const z2 = positions[k + cols][1];
        const longueur = Math.abs(z2 - z);
        if (longueur > 0.4) {
          elements.push(
            boite(`longrine-z-${k + 1}`, `Longrine transversale (${fmt.format(longueur)} m)`, "longrine", [0.2, 0.2, longueur], [x, yLongrine, (z + z2) / 2]),
          );
        }
      }
    }
    return {
      resume: `${nb} semelles isolées de ${fmt.format(L)} x ${fmt.format(l)} m (h ${fmt.format(H)} m) sur béton de propreté, avec amorces de poteaux et longrines (implantation indicative)`,
      elements,
    };
  },

  "charpente-toiture": (i) => {
    const S = n(i, "surface", 120);
    const pente = Math.min(60, Math.max(5, n(i, "pente", 25)));
    const cote = Math.sqrt(Math.max(S, 0)); // emprise carrée équivalente
    const angle = (pente * Math.PI) / 180;
    const montee = Math.tan(angle) * (cote / 2); // hauteur du faîtage
    const rampant = cote / 2 / Math.cos(angle); // longueur d'un versant
    return {
      resume: `Toiture de ${fmt.format(S)} m², pente ${fmt.format(pente)}° (emprise ${fmt.format(cote)} m x ${fmt.format(cote)} m) : versants, faîtière, sablières et pannes`,
      elements: [
        boite("versant-sud", `Versant (pente ${fmt.format(pente)}°)`, "tuile", [cote, 0.06, rampant], [0, montee / 2, cote / 4], [pente, 0, 0]),
        boite("versant-nord", `Versant (pente ${fmt.format(pente)}°)`, "tuile", [cote, 0.06, rampant], [0, montee / 2, -cote / 4], [-pente, 0, 0]),
        boite("faitiere", `Faîtière (${fmt.format(cote)} m)`, "faitiere", [cote, 0.1, 0.12], [0, montee + 0.05, 0]),
        boite("sabliere-avant", "Sablière avant", "charpenteBois", [cote, 0.08, 0.12], [0, 0.04, cote / 2]),
        boite("sabliere-arriere", "Sablière arrière", "charpenteBois", [cote, 0.08, 0.12], [0, 0.04, -cote / 2]),
        boite("panne-sud", "Panne intermédiaire sud", "faitiere", [cote, 0.12, 0.12], [0, montee / 2 - 0.07, cote / 4]),
        boite("panne-nord", "Panne intermédiaire nord", "faitiere", [cote, 0.12, 0.12], [0, montee / 2 - 0.07, -cote / 4]),
      ],
    };
  },

  "fondations-profondes": (i) => {
    const nb = nbBorne(n(i, "nb", 6), 6);
    const d = n(i, "diametre", 0.6);
    const P = n(i, "profondeur", 8);
    const elements: Element3D[] = [];
    grille(nb, Math.max(d + 1.5, 2)).forEach(([x, z], k) => {
      elements.push(
        cylindre(`pieu-${k + 1}`, `Pieu ${k + 1} (Ø${fmt.format(d * 100)} cm, ${fmt.format(P)} m)`, "pieu", [d, P, d], [x, -P / 2, z]),
        boite(`tete-pieu-${k + 1}`, `Tête de pieu ${k + 1}`, "tetePieu", [d + 0.4, 0.3, d + 0.4], [x, 0.14, z]),
      );
    });
    return {
      resume: `${nb} pieux forés de Ø${fmt.format(d * 100)} cm et ${fmt.format(P)} m de profondeur, avec têtes de pieux émergeantes (corps des pieux sous le niveau du sol)`,
      elements,
    };
  },

  "finition-revetement-sol": (i) => {
    const S = n(i, "surface", 50);
    const cote = Math.sqrt(Math.max(S, 0));
    return {
      resume: `Revêtement de sol sur ${fmt.format(S)} m² (pièce carrée de ${fmt.format(cote)} m de côté), plinthes comprises`,
      elements: [
        boite("sol", `Revêtement ${fmt.format(S)} m²`, "carrelage", [cote, 0.02, cote], [0, 0.01, 0]),
        boite("plinthe-1", "Plinthes avant", "plinthe", [cote, 0.1, 0.03], [0, 0.055, cote / 2 + 0.015]),
        boite("plinthe-2", "Plinthes arrière", "plinthe", [cote, 0.1, 0.03], [0, 0.055, -(cote / 2 + 0.015)]),
        boite("plinthe-3", "Plinthes gauche", "plinthe", [0.03, 0.1, cote], [cote / 2 + 0.015, 0.055, 0]),
        boite("plinthe-4", "Plinthes droite", "plinthe", [0.03, 0.1, cote], [-(cote / 2 + 0.015), 0.055, 0]),
      ],
    };
  },

  "poteaux-beton-arme": (i) => {
    const nb = nbBorne(n(i, "nb", 8), 8);
    const a = n(i, "section_a", 0.2);
    const b = n(i, "section_b", 0.2);
    const H = n(i, "hauteur", 3);
    const elements: Element3D[] = [];
    grille(nb, 3).forEach(([x, z], k) => {
      const rang = k + 1;
      elements.push(
        boite(`poteau-${rang}`, `Poteau ${rang} (${fmt.format(a * 100)} x ${fmt.format(b * 100)} cm)`, "poteauBeton", [a, H, b], [x, H / 2, z]),
        boite(`amorce-${rang}`, `Amorce / socle du poteau ${rang}`, "fondation", [a + 0.3, 0.3, b + 0.3], [x, 0.14, z]),
      );
    });
    return {
      resume: `${nb} poteaux de ${fmt.format(a * 100)} x ${fmt.format(b * 100)} cm, hauteur ${fmt.format(H)} m, avec amorces béton (implantation indicative)`,
      elements,
    };
  },

  "poutres-chaine": (i) => {
    const L = n(i, "longueur", 40);
    const sl = n(i, "section_l", 0.2);
    const sh = n(i, "section_h", 0.3);
    const section = `section ${fmt.format(sl * 100)} x ${fmt.format(sh * 100)} cm`;
    if (L >= 4) {
      const cote = L / 4; // chaînage représenté en cadre fermé
      const hPoteau = 2.5;
      const elements: Element3D[] = [
        boite("chaine-1", `Chaînage bas avant (${fmt.format(cote)} m)`, "chainage", [cote, sh, sl], [0, sh / 2, cote / 2]),
        boite("chaine-2", `Chaînage bas arrière (${fmt.format(cote)} m)`, "chainage", [cote, sh, sl], [0, sh / 2, -cote / 2]),
        boite("chaine-3", `Chaînage bas gauche (${fmt.format(cote)} m)`, "chainage", [sl, sh, cote], [-cote / 2, sh / 2, 0]),
        boite("chaine-4", `Chaînage bas droit (${fmt.format(cote)} m)`, "chainage", [sl, sh, cote], [cote / 2, sh / 2, 0]),
      ];
      // Poteaux d'angle (structure poteaux + chaînages)
      const coins: [number, number][] = [
        [cote / 2, cote / 2],
        [cote / 2, -cote / 2],
        [-cote / 2, cote / 2],
        [-cote / 2, -cote / 2],
      ];
      coins.forEach(([x, z], k) => {
        elements.push(
          boite(`poteau-angle-${k + 1}`, `Poteau d'angle ${k + 1} (h ${fmt.format(hPoteau)} m)`, "poteauBeton", [sl + 0.02, hPoteau, sl + 0.02], [x, hPoteau / 2 - 0.01, z]),
        );
      });
      // Ceinture haute au sommet des poteaux
      const yHaut = hPoteau - sh / 2;
      elements.push(
        boite("chaine-haut-1", "Chaînage haut avant", "chainage", [cote, sh, sl], [0, yHaut, cote / 2]),
        boite("chaine-haut-2", "Chaînage haut arrière", "chainage", [cote, sh, sl], [0, yHaut, -cote / 2]),
        boite("chaine-haut-3", "Chaînage haut gauche", "chainage", [sl, sh, cote], [-cote / 2, yHaut, 0]),
        boite("chaine-haut-4", "Chaînage haut droit", "chainage", [sl, sh, cote], [cote / 2, yHaut, 0]),
      );
      return {
        resume: `Chaînage de ${fmt.format(L)} ml en cadre de ${fmt.format(cote)} m x ${fmt.format(cote)} m (${section}) : ceintures basse et haute + 4 poteaux d'angle`,
        elements,
      };
    }
    // Poutre isolée posée sur deux appuis.
    const longueur = Math.max(L, 0.5);
    return {
      resume: `Poutre / chaînage de ${fmt.format(L)} ml (${section}), posée sur deux appuis`,
      elements: [
        boite("chaine", `Poutre ${fmt.format(L)} m`, "chainage", [longueur, sh, sl], [0, 0.4 + sh / 2, 0]),
        boite("appui-gauche", "Appui gauche", "fondation", [0.25, 0.4, sl + 0.02], [-(longueur / 2 - 0.125), 0.2, 0]),
        boite("appui-droit", "Appui droit", "fondation", [0.25, 0.4, sl + 0.02], [longueur / 2 - 0.125, 0.2, 0]),
      ],
    };
  },

  "plancher-poutrelles": (i) => {
    const L = n(i, "longueur", 10);
    const l = n(i, "largeur", 5);
    const e = n(i, "entraxe", 0.6) > 0 ? n(i, "entraxe", 0.6) : 0.6;
    const nbP = Math.min(120, Math.max(2, Math.ceil(l / e) + 1));
    const elements: Element3D[] = repartition(nbP, l).map((z, k) =>
      boite(`poutrelle-${k + 1}`, `Poutrelle ${k + 1} (entraxe ${fmt.format(e * 100)} cm)`, "poutreBeton", [L, 0.16, 0.12], [0, 0.08, z]),
    );
    elements.push(boite("table", "Dalle de compression (5 cm)", "dalleBeton", [L, 0.05, l], [0, 0.185, 0]));
    // Poutres de rive (ceinture périphérique du plancher)
    const marge = 0.08;
    elements.push(
      boite("rive-avant", "Poutre de rive avant", "chainage", [L, 0.2, 0.15], [0, 0.105, l / 2 + marge]),
      boite("rive-arriere", "Poutre de rive arrière", "chainage", [L, 0.2, 0.15], [0, 0.105, -(l / 2 + marge)]),
      boite("rive-gauche", "Poutre de rive gauche", "chainage", [0.15, 0.2, l], [-(L / 2 + marge), 0.105, 0]),
      boite("rive-droite", "Poutre de rive droite", "chainage", [0.15, 0.2, l], [L / 2 + marge, 0.105, 0]),
    );
    return {
      resume: `Plancher de ${fmt.format(L)} m x ${fmt.format(l)} m : ${nbP} poutrelles (entraxe ${fmt.format(e * 100)} cm) + dalle de compression + poutres de rive`,
      elements,
    };
  },

  // --- Route ---

  "terrassement-route": (i) => {
    const L = n(i, "longueur", 100);
    const l = n(i, "largeur", 7);
    const e = n(i, "epaisseur", 0.25);
    return {
      resume: `Couche granulaire de ${fmt.format(L)} m x ${fmt.format(l)} m, épaisseur ${fmt.format(e * 100)} cm (${fmt.format(L * l * e)} m³ en place) avec accotements`,
      elements: [
        boite("couche", `Couche ${fmt.format(e * 100)} cm`, "grave", [L, e, l], [0, e / 2, 0]),
        boite("accotement-gauche", "Accotement gauche", "accotement", [L, e, 1], [0, e / 2 - 0.02, l / 2 + 0.505]),
        boite("accotement-droit", "Accotement droit", "accotement", [L, e, 1], [0, e / 2 - 0.02, -(l / 2 + 0.505)]),
      ],
    };
  },

  "chaussee-bitume": (i) => {
    const L = n(i, "longueur", 100);
    const l = n(i, "largeur", 7);
    const eb = n(i, "ep_base", 0.25);
    const er = n(i, "ep_roul", 0.05);
    const elements: Element3D[] = [
      boite("base", `Couche de base ${fmt.format(eb * 100)} cm`, "grave", [L, eb, l], [0, eb / 2, 0]),
      boite("roulement", `Enrobé ${fmt.format(er * 100)} cm`, "enrobe", [L, er, l], [0, eb + er / 2, 0]),
      boite("accotement-gauche", "Accotement gauche", "accotement", [L, eb, 1], [0, eb / 2 - 0.02, l / 2 + 0.505]),
      boite("accotement-droit", "Accotement droit", "accotement", [L, eb, 1], [0, eb / 2 - 0.02, -(l / 2 + 0.505)]),
    ];
    // Marquage axial en pointillés (bandes de 3 m tous les 8 m).
    const nbBandes = Math.max(1, Math.floor(L / 8));
    repartition(nbBandes, Math.max(L - 4, 0.5)).forEach((x, k) => {
      elements.push(
        boite(`marquage-${k + 1}`, `Marquage axial ${k + 1}`, "marquage", [3, 0.01, 0.15], [x, eb + er + 0.005, 0]),
      );
    });
    return {
      resume: `Chaussée de ${fmt.format(L)} m x ${fmt.format(l)} m : base ${fmt.format(eb * 100)} cm + enrobé de roulement ${fmt.format(er * 100)} cm, accotements et marquage axial (${nbBandes} bandes)`,
      elements,
    };
  },

  "assainissement-fouille": (i) => {
    const L = n(i, "longueur", 50);
    const l = n(i, "largeur", 0.8);
    const P = n(i, "profondeur", 1.2);
    const nbR = nbBorne(n(i, "nb_regards", 3), 3, 50);
    // Diamètre de conduite estimé d'après la largeur de fouille (l'entrée n'existe pas),
    // arrondi à 10 cm pour rester réaliste (ex. 50 cm).
    const d = arrondi(Math.round(((Math.min(0.4, Math.max(0.1, l / 3)) * 2) / 0.1)) * 0.1, 2);
    const yConduite = -P + d / 2 + 0.05;
    const elements: Element3D[] = [
      boite("lit-pose", "Lit de pose (sable)", "sable", [L, 0.1, d + 0.3], [0, yConduite - d / 2 - 0.05, 0]),
      cylindre("conduite", `Conduite Ø${fmt.format(d * 100)} cm`, "conduite", [d, L, d], [0, yConduite, 0], [0, 0, 90]),
    ];
    repartition(nbR, L).forEach((x, k) => {
      elements.push(boite(`regard-${k + 1}`, `Regard ${k + 1}`, "regard", [0.6, P, 0.6], [x, -P / 2, 0]));
    });
    return {
      resume: `Fouille de ${fmt.format(L)} m x ${fmt.format(l)} m (profondeur ${fmt.format(P)} m) : conduite Ø${fmt.format(d * 100)} cm sur lit de pose et ${nbR} regard(s) de visite`,
      elements,
    };
  },

  "remblai-apport": (i) => {
    const L = n(i, "longueur", 50);
    const l = n(i, "largeur", 6);
    const e = n(i, "epaisseur", 0.3);
    // Talus latéraux à 35° (hauteur e), de part et d'autre du remblai.
    const angleTalus = 35;
    const rad = (angleTalus * Math.PI) / 180;
    const longueurTalus = e / Math.sin(rad); // longueur de la pente
    const empriseTalus = e / Math.tan(rad); // projection horizontale
    const elements: Element3D[] = [
      boite("remblai", `Remblai ${fmt.format(e * 100)} cm`, "terre", [L, e, l], [0, e / 2, 0]),
      boite("talus-droit", `Talus droit (${angleTalus}°)`, "terre", [L, 0.05, longueurTalus], [0, e / 2, l / 2 + empriseTalus / 2], [angleTalus, 0, 0]),
      boite("talus-gauche", `Talus gauche (${angleTalus}°)`, "terre", [L, 0.05, longueurTalus], [0, e / 2, -(l / 2 + empriseTalus / 2)], [-angleTalus, 0, 0]),
    ];
    return {
      resume: `Remblai d'apport de ${fmt.format(L)} m x ${fmt.format(l)} m, épaisseur ${fmt.format(e * 100)} cm (${fmt.format(L * l * e)} m³ en place), talus à ${angleTalus}°`,
      elements,
    };
  },

  "voirie-bordures-caniveaux": (i) => {
    const Lb = n(i, "longueur_bordures", 100);
    const Lc = n(i, "longueur_caniveaux", 100);
    const nbR = Math.min(50, Math.max(0, Math.round(n(i, "nb_regards", 4))));
    const elements: Element3D[] = [
      boite("bordures", `Bordures ${fmt.format(Lb)} ml`, "bordure", [Lb, 0.25, 0.15], [0, 0.125, -0.225]),
      boite("caniveaux", `Caniveaux ${fmt.format(Lc)} ml`, "caniveau", [Lc, 0.4, 0.3], [0, 0.2, 0]),
      boite("trottoir", `Trottoir ${fmt.format(Lb)} ml`, "trottoir", [Lb, 0.1, 1], [0, 0.05, -(0.3 + 0.505)]),
      boite("chaussee", "Chaussée au droit du caniveau", "enrobe", [Lc, 0.06, 2], [0, 0.03, 0.3 / 2 + 1 + 0.005]),
    ];
    repartition(nbR, Lc).forEach((x, k) => {
      elements.push(boite(`regard-${k + 1}`, `Regard ${k + 1}`, "regard", [0.5, 0.45, 0.5], [x, 0.23, 0]));
    });
    return {
      resume: `${fmt.format(Lb)} ml de bordures + ${fmt.format(Lc)} ml de caniveaux + ${nbR} regard(s), trottoir et chaussée au droit du caniveau`,
      elements,
    };
  },
};

// ---------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------

/** Modèles de devis qui disposent d'une représentation 3D. */
export function templatesAvecModele3d(): string[] {
  return Object.keys(construire);
}

/**
 * Construit le modèle 3D d'un devis à partir de son modèle et des entrées saisies.
 * Retourne `null` si le modèle de devis n'a pas de représentation 3D.
 */
export function modele3dDevis(
  template: Pick<DevisTemplate, "id" | "nom">,
  inputs: Record<string, string>,
): Modele3D | null {
  const fabrique = construire[template.id];
  if (!fabrique) return null;
  const { resume, elements } = fabrique(inputs);
  const { dimensions, centre } = boiteEnglobante(elements);
  return {
    templateId: template.id,
    nom: template.nom,
    resume,
    dimensions,
    centre,
    elements,
  };
}
