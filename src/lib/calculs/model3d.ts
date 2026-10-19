// --- Types de base ---
export type Point3D = [number, number, number]; // [x, y, z]
export type Couleur3D = `rgb(${number},${number},${number})`;

// --- Formes de base (toutes basées sur des formules exactes) ---

/** Cube centré d'arête `a`, faces parallèle aux axes.
 *  Renvoie les 8 sommets dans l'ordre :
 *  0: BGAvant (-x,-y,-z), 1: BDAvant (+x,-y,-z),
 *  2: HDAvant (+x,+y,-z), 3: HGAvant (-x,+y,-z),
 *  4: BGArrière (-x,-y,+z), 5: BDArrière (+x,-y,+z),
 *  6: HDArrière (+x,+y,+z), 7: HGArrière (-x,+y,+z). */
export function sommetsCube(a: number): Point3D[] {
  const h = a / 2;
  return [
    [-h, -h, -h], // 0
    [+h, -h, -h], // 1
    [+h, +h, -h], // 2
    [-h, +h, -h], // 3
    [-h, -h, +h], // 4
    [+h, -h, +h], // 5
    [+h, +h, +h], // 6
    [-h, +h, +h], // 7
  ];
}

/** Pyramide à base carrée d'arête base `a` et hauteur `h` (du sommet au centre de la base).
 *  Le sommet est en z=h, la base est en z=0, centrée sur l'origine.
 */
export function sommetsPyramide(a: number, h: number): Point3D[] {
  const half = a / 2;
  return [
    [-half, -half, 0], // 0 : base avant gauche
    [+half, -half, 0], // 1 : base avant droite
    [+half, +half, 0], // 2 : base arrière droite
    [-half, +half, 0], // 3 : base arrière gauche
    [0, 0, h],         // 4 : sommet
  ];
};

/** Cylindre de rayon `r`, hauteur `h`, subdivisions `n` (défaut 32).
 *  Rend un objet { sommets, faces } où :
 *   - sommets : tableau de Point3D (2 centres + n périmètres supérieurs + n périmètres inférieurs)
 *   - faces   : tableau d'index de sommets décrivant les triangles (format Recharts / Three.js compatible).
 */
export function sommetsCylindre(r: number, h: number, n = 32): {
  sommets: Point3D[];
  faces: number[][];
} {
  const pointsTour = n;
  const sommets: Point3D[] = [];

  // Centre haut (index 0)
  sommets.push([0, 0, h / 2]);
  // Centre bas (index 1)
  sommets.push([0, 0, -h / 2]);

  // Périmètre supérieur (z = +h/2)
  for (let i = 0; i < pointsTour; i++) {
    const angle = (i / pointsTour) * Math.PI * 2 - Math.PI / 2;
    sommets.push([Math.cos(angle) * r, Math.sin(angle) * r, h / 2]);
  }

  // Périmètre inférieur (z = -h/2)
  for (let i = 0; i < pointsTour; i++) {
    const angle = (i / pointsTour) * Math.PI * 2 - Math.PI / 2;
    sommets.push([Math.cos(angle) * r, Math.sin(angle) * r, -h / 2]);
  }

  // Faces : latérales (connectent chaque sommet du haut au sommet suivant du bas)
  const faces: number[][] = [];
  for (let i = 0; i < pointsTour; i++) {
    const next = (i + 1) % pointsTour;
    // Haut -> Haut suivant -> Bas suivant -> Bas courant
    faces.push([0, i + 2, next + 2]); // +2 car centres sont indices 0,1
    // Haut -> Bas suivant -> Bas courant
    faces.push([0, next + 2, i + 2]);
  }

  // Base inférieure : ventilateur autour du centre bas
  const baseStart = 2; // premier sommet de périmètre inférieur est index 2
  for (let i = 0; i < pointsTour; i++) {
    const next = (i + 1) % pointsTour;
    faces.push([1, next + baseStart, i + baseStart]); // centre bas + deux périmètres
  }

  return { sommets, faces };
};

// --- Palette de couleurs standardisées (RGB fixes, lisibles) ---
export const couleurs3D: Record<string, Couleur3D> = {
  béton: "rgb(101, 67, 33)",
  acier: "rgb(184, 184, 184)",
  terre: "rgb(139, 92, 57)",
  bois: "rgb(160, 82, 45)",
  verre: "rgb(173, 216, 230)",
};
// --- Types partagés par les autres modules `calculs` ---
export type Vector3D = [number, number, number]; // vecteur (x, y, z)
export type TypeMur = "plein" | "portique" | "mixte";

/** Matériau simple : nom lisible + couleur d'affichage. */
export type Material3D = {
  nom: string;
  couleur: Couleur3D;
};

/** Matériaux standard du BTP ivoirien (clé technique → définition). */
export const materiaux3D: Record<string, Material3D> = {
  beton: { nom: "Béton", couleur: couleurs3D.béton },
  acier: { nom: "Acier", couleur: couleurs3D.acier },
  terre: { nom: "Terre", couleur: couleurs3D.terre },
  bois: { nom: "Bois", couleur: couleurs3D.bois },
  verre: { nom: "Verre", couleur: couleurs3D.verre },
};

// --- Boîtes (murs, poteaux, poutres, fondations) ---

/** Faces d'une boîte (12 triangles) : indices compatibles avec sommetsCube. */
export function facesCube(): number[][] {
  return [
    [0, 1, 2], [0, 2, 3], // avant (z-)
    [5, 4, 7], [5, 7, 6], // arrière (z+)
    [4, 0, 3], [4, 3, 7], // gauche (x-)
    [1, 5, 6], [1, 6, 2], // droite (x+)
    [4, 5, 1], [4, 1, 0], // bas (y-)
    [3, 2, 6], [3, 6, 7], // haut (y+)
  ];
}

/** Boîte centrée de dimensions (lx, ly, lz) : sommets + faces. Z reste l'axe vertical. */
export function sommetsBoite(lx: number, ly: number, lz: number): {
  sommets: Point3D[];
  faces: number[][];
} {
  const sommets = sommetsCube(1).map(
    ([x, y, z]) => [x * lx, y * ly, z * lz] as Point3D,
  );
  return { sommets, faces: facesCube() };
}

/** Sphère centrée sur l'origine : `meridiens` × `paralleles` points. */
export function sommetsSphere(rayon: number, meridiens = 16, paralleles = 8): Point3D[] {
  const pts: Point3D[] = [
    [0, 0, rayon], // pôle haut (Z vers le haut)
    [0, 0, -rayon], // pôle bas
  ];
  for (let i = 1; i < paralleles; i++) {
    const phi = (i / paralleles) * Math.PI;
    const z = rayon * Math.cos(phi);
    const r = rayon * Math.sin(phi);
    for (let j = 0; j < meridiens; j++) {
      const theta = (j / meridiens) * Math.PI * 2;
      pts.push([r * Math.cos(theta), r * Math.sin(theta), z]);
    }
  }
  return pts;
}

/** Poteau vertical (Z vers le haut) : section carrée `cote`, hauteur `niveaux × hauteur`. */
export function sommetsPoteau(niveaux: number, opts: { cote: number; hauteur: number }): Point3D[] {
  const hauteurTotale = Math.max(1, niveaux) * opts.hauteur;
  return sommetsCube(1).map(
    ([x, y, z]) => [x * opts.cote, y * opts.cote, z * hauteurTotale] as Point3D,
  );
}

// --- Éléments architecturaux prêts à l'emploi ---

export function createMur(type: TypeMur, longueur: number, hauteur: number, epaisseur: number): {
  type: TypeMur;
  sommets: Point3D[];
  faces: number[][];
} {
  return { type, ...sommetsBoite(longueur, epaisseur, hauteur) };
}

export function createPoteau(cote: number, hauteur: number): {
  sommets: Point3D[];
  faces: number[][];
} {
  return sommetsBoite(cote, cote, hauteur);
}

export function createPoutre(longueur: number, largeur: number, hauteur: number): {
  sommets: Point3D[];
  faces: number[][];
} {
  return sommetsBoite(longueur, largeur, hauteur);
}

export function createFondation(largeur: number, longueur: number, epaisseur: number): {
  sommets: Point3D[];
  faces: number[][];
} {
  return sommetsBoite(largeur, longueur, epaisseur);
}

// Fin du fichier modèle 3D précis