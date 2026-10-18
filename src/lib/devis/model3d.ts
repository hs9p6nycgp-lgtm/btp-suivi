// Modélisation 3D des devis : convertit les entrées d'un modèle de devis en une
// description géométrique simple (boîtes et cylindres), prête à être affichée
// par un composant basé sur three.js (voir TODO-UI-007).
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

import type { DevisTemplate } from "./templates";

export type Forme3D = "boite" | "cylindre";

export type Element3D = {
  /** Identifiant technique stable (ex. "poutrelle-3"). */
  id: string;
  forme: Forme3D;
  /** Libellé lisible en français (pour info-bulle / légende). */
  libelle: string;
  /** Couleur hexadécimale "#rrggbb". */
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

/** Couleurs des matériaux (hexadécimal, à titre indicatif pour l'affichage). */
export const PALETTE_MATERIAUX = {
  agglo: "#d9cdb8",
  beton: "#a8adb4",
  betonArme: "#9aa0a6",
  betonProprete: "#8c9196",
  terre: "#b07a45",
  grave: "#9e9e9e",
  enrobe: "#3f3f46",
  tuile: "#b45309",
  carrelage: "#e7e5e4",
  peinture: "#7fb3d5",
  pvc: "#38bdf8",
  regard: "#8b8684",
  bordure: "#d4d4d8",
} as const;

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

/** Crée une boîte (parallélépipède) centrée sur `position`. */
function boite(
  id: string,
  libelle: string,
  couleur: string,
  taille: V3,
  position: V3,
  rotation?: V3,
): Element3D {
  return {
    id,
    forme: "boite",
    libelle,
    couleur,
    taille: taille.map(minTaille) as V3,
    position: position.map((v) => arrondi(v)) as V3,
    rotation,
  };
}

/** Crée un cylindre vertical (ou couché via `rotation`), centré sur `position`. */
function cylindre(
  id: string,
  libelle: string,
  couleur: string,
  taille: V3,
  position: V3,
  rotation?: V3,
): Element3D {
  return {
    id,
    forme: "cylindre",
    libelle,
    couleur,
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
    return {
      resume: `Mur de ${fmt.format(L)} m x ${fmt.format(H)} m, épaisseur ${fmt.format(e * 100)} cm`,
      elements: [
        boite("mur", `Mur ${fmt.format(L)} x ${fmt.format(H)} m`, PALETTE_MATERIAUX.agglo, [L, H, e], [0, H / 2, 0]),
      ],
    };
  },

  "dalle-beton": (i) => {
    const L = n(i, "longueur", 10);
    const l = n(i, "largeur", 5);
    const e = n(i, "epaisseur", 0.12);
    return {
      resume: `Dalle de ${fmt.format(L)} m x ${fmt.format(l)} m, épaisseur ${fmt.format(e * 100)} cm`,
      elements: [
        boite("dalle", `Dalle ${fmt.format(e * 100)} cm`, PALETTE_MATERIAUX.beton, [L, e, l], [0, e / 2, 0]),
      ],
    };
  },

  "peinture": (i) => {
    const S = n(i, "surface", 100);
    const H = 2.8; // hauteur d'étage retenue pour représenter la surface à peindre
    const L = S / H;
    return {
      resume: `Surface à peindre de ${fmt.format(S)} m² (équivalent d'un mur de ${fmt.format(L)} m x 2,8 m)`,
      elements: [
        boite("panneau", `Surface peinte ${fmt.format(S)} m²`, PALETTE_MATERIAUX.peinture, [L, H, 0.05], [0, H / 2, 0]),
      ],
    };
  },

  "fondations-semelles": (i) => {
    const nb = nbBorne(n(i, "nb", 4), 4);
    const L = n(i, "longueur", 1.2);
    const l = n(i, "largeur", 1.2);
    const H = n(i, "hauteur", 0.6);
    const ep = n(i, "ep_proprete", 0.05);
    const elements: Element3D[] = [];
    grille(nb, Math.max(L, l) + 1.5).forEach(([x, z], k) => {
      const rang = k + 1;
      elements.push(
        boite(`proprete-${rang}`, `Béton de propreté ${rang}`, PALETTE_MATERIAUX.betonProprete, [L + 0.2, ep, l + 0.2], [x, ep / 2, z]),
      );
      elements.push(
        boite(`semelle-${rang}`, `Semelle ${rang} (${fmt.format(L)} x ${fmt.format(l)} m)`, PALETTE_MATERIAUX.betonArme, [L, H, l], [x, ep + H / 2, z]),
      );
    });
    return {
      resume: `${nb} semelles isolées de ${fmt.format(L)} x ${fmt.format(l)} m (h ${fmt.format(H)} m) sur béton de propreté (implantation indicative)`,
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
      resume: `Toiture de ${fmt.format(S)} m², pente ${fmt.format(pente)}° (emprise ${fmt.format(cote)} m x ${fmt.format(cote)} m)`,
      elements: [
        boite("versant-sud", `Versant (pente ${fmt.format(pente)}°)`, PALETTE_MATERIAUX.tuile, [cote, 0.06, rampant], [0, montee / 2, cote / 4], [pente, 0, 0]),
        boite("versant-nord", `Versant (pente ${fmt.format(pente)}°)`, PALETTE_MATERIAUX.tuile, [cote, 0.06, rampant], [0, montee / 2, -cote / 4], [-pente, 0, 0]),
      ],
    };
  },

  "fondations-profondes": (i) => {
    const nb = nbBorne(n(i, "nb", 6), 6);
    const d = n(i, "diametre", 0.6);
    const P = n(i, "profondeur", 8);
    const elements = grille(nb, Math.max(d + 1.5, 2)).map(([x, z], k) =>
      cylindre(`pieu-${k + 1}`, `Pieu ${k + 1} (Ø${fmt.format(d * 100)} cm, ${fmt.format(P)} m)`, PALETTE_MATERIAUX.betonArme, [d, P, d], [x, -P / 2, z]),
    );
    return {
      resume: `${nb} pieux forés de Ø${fmt.format(d * 100)} cm et ${fmt.format(P)} m de profondeur (représentés sous le niveau du sol)`,
      elements,
    };
  },

  "finition-revetement-sol": (i) => {
    const S = n(i, "surface", 50);
    const cote = Math.sqrt(Math.max(S, 0));
    return {
      resume: `Revêtement de sol sur ${fmt.format(S)} m² (pièce carrée de ${fmt.format(cote)} m de côté)`,
      elements: [
        boite("sol", `Revêtement ${fmt.format(S)} m²`, PALETTE_MATERIAUX.carrelage, [cote, 0.02, cote], [0, 0.01, 0]),
      ],
    };
  },

  "poteaux-beton-arme": (i) => {
    const nb = nbBorne(n(i, "nb", 8), 8);
    const a = n(i, "section_a", 0.2);
    const b = n(i, "section_b", 0.2);
    const H = n(i, "hauteur", 3);
    const elements = grille(nb, 3).map(([x, z], k) =>
      boite(`poteau-${k + 1}`, `Poteau ${k + 1} (${fmt.format(a * 100)} x ${fmt.format(b * 100)} cm)`, PALETTE_MATERIAUX.betonArme, [a, H, b], [x, H / 2, z]),
    );
    return {
      resume: `${nb} poteaux de ${fmt.format(a * 100)} x ${fmt.format(b * 100)} cm, hauteur ${fmt.format(H)} m (implantation indicative)`,
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
      return {
        resume: `Chaînage de ${fmt.format(L)} ml en cadre de ${fmt.format(cote)} m x ${fmt.format(cote)} m (${section})`,
        elements: [
          boite("chaine-1", `Chaînage avant (${fmt.format(cote)} m)`, PALETTE_MATERIAUX.betonArme, [cote, sh, sl], [0, sh / 2, cote / 2]),
          boite("chaine-2", `Chaînage arrière (${fmt.format(cote)} m)`, PALETTE_MATERIAUX.betonArme, [cote, sh, sl], [0, sh / 2, -cote / 2]),
          boite("chaine-3", `Chaînage gauche (${fmt.format(cote)} m)`, PALETTE_MATERIAUX.betonArme, [sl, sh, cote], [-cote / 2, sh / 2, 0]),
          boite("chaine-4", `Chaînage droit (${fmt.format(cote)} m)`, PALETTE_MATERIAUX.betonArme, [sl, sh, cote], [cote / 2, sh / 2, 0]),
        ],
      };
    }
    return {
      resume: `Poutre / chaînage de ${fmt.format(L)} ml (${section})`,
      elements: [
        boite("chaine", `Poutre ${fmt.format(L)} m`, PALETTE_MATERIAUX.betonArme, [Math.max(L, 0.5), sh, sl], [0, sh / 2, 0]),
      ],
    };
  },

  "plancher-poutrelles": (i) => {
    const L = n(i, "longueur", 10);
    const l = n(i, "largeur", 5);
    const e = n(i, "entraxe", 0.6) > 0 ? n(i, "entraxe", 0.6) : 0.6;
    const nbP = Math.min(120, Math.max(2, Math.ceil(l / e) + 1));
    const elements: Element3D[] = repartition(nbP, l).map((z, k) =>
      boite(`poutrelle-${k + 1}`, `Poutrelle ${k + 1} (entraxe ${fmt.format(e * 100)} cm)`, PALETTE_MATERIAUX.beton, [L, 0.16, 0.12], [0, 0.08, z]),
    );
    elements.push(boite("table", "Dalle de compression (5 cm)", PALETTE_MATERIAUX.beton, [L, 0.05, l], [0, 0.185, 0]));
    return {
      resume: `Plancher de ${fmt.format(L)} m x ${fmt.format(l)} m : ${nbP} poutrelles (entraxe ${fmt.format(e * 100)} cm) + dalle de compression`,
      elements,
    };
  },

  // --- Route ---

  "terrassement-route": (i) => {
    const L = n(i, "longueur", 100);
    const l = n(i, "largeur", 7);
    const e = n(i, "epaisseur", 0.25);
    return {
      resume: `Couche granulaire de ${fmt.format(L)} m x ${fmt.format(l)} m, épaisseur ${fmt.format(e * 100)} cm (${fmt.format(L * l * e)} m³ en place)`,
      elements: [
        boite("couche", `Couche ${fmt.format(e * 100)} cm`, PALETTE_MATERIAUX.grave, [L, e, l], [0, e / 2, 0]),
      ],
    };
  },

  "chaussee-bitume": (i) => {
    const L = n(i, "longueur", 100);
    const l = n(i, "largeur", 7);
    const eb = n(i, "ep_base", 0.25);
    const er = n(i, "ep_roul", 0.05);
    return {
      resume: `Chaussée de ${fmt.format(L)} m x ${fmt.format(l)} m : base ${fmt.format(eb * 100)} cm + enrobé de roulement ${fmt.format(er * 100)} cm`,
      elements: [
        boite("base", `Couche de base ${fmt.format(eb * 100)} cm`, PALETTE_MATERIAUX.grave, [L, eb, l], [0, eb / 2, 0]),
        boite("roulement", `Enrobé ${fmt.format(er * 100)} cm`, PALETTE_MATERIAUX.enrobe, [L, er, l], [0, eb + er / 2, 0]),
      ],
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
    const elements: Element3D[] = [
      cylindre("conduite", `Conduite Ø${fmt.format(d * 100)} cm`, PALETTE_MATERIAUX.pvc, [d, L, d], [0, -P + d / 2 + 0.05, 0], [0, 0, 90]),
    ];
    repartition(nbR, L).forEach((x, k) => {
      elements.push(boite(`regard-${k + 1}`, `Regard ${k + 1}`, PALETTE_MATERIAUX.regard, [0.6, P, 0.6], [x, -P / 2, 0]));
    });
    return {
      resume: `Fouille de ${fmt.format(L)} m x ${fmt.format(l)} m (profondeur ${fmt.format(P)} m) avec conduite Ø${fmt.format(d * 100)} cm et ${nbR} regard(s)`,
      elements,
    };
  },

  "remblai-apport": (i) => {
    const L = n(i, "longueur", 50);
    const l = n(i, "largeur", 6);
    const e = n(i, "epaisseur", 0.3);
    return {
      resume: `Remblai d'apport de ${fmt.format(L)} m x ${fmt.format(l)} m, épaisseur ${fmt.format(e * 100)} cm (${fmt.format(L * l * e)} m³ en place)`,
      elements: [
        boite("remblai", `Remblai ${fmt.format(e * 100)} cm`, PALETTE_MATERIAUX.terre, [L, e, l], [0, e / 2, 0]),
      ],
    };
  },

  "voirie-bordures-caniveaux": (i) => {
    const Lb = n(i, "longueur_bordures", 100);
    const Lc = n(i, "longueur_caniveaux", 100);
    const nbR = Math.min(50, Math.max(0, Math.round(n(i, "nb_regards", 4))));
    const elements: Element3D[] = [
      boite("bordures", `Bordures ${fmt.format(Lb)} ml`, PALETTE_MATERIAUX.betonProprete, [Lb, 0.25, 0.15], [0, 0.125, -0.225]),
      boite("caniveaux", `Caniveaux ${fmt.format(Lc)} ml`, PALETTE_MATERIAUX.bordure, [Lc, 0.4, 0.3], [0, 0.2, 0]),
    ];
    repartition(nbR, Lc).forEach((x, k) => {
      elements.push(boite(`regard-${k + 1}`, `Regard ${k + 1}`, PALETTE_MATERIAUX.regard, [0.5, 0.45, 0.5], [x, 0.225, 0]));
    });
    return {
      resume: `${fmt.format(Lb)} ml de bordures + ${fmt.format(Lc)} ml de caniveaux + ${nbR} regard(s)`,
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
