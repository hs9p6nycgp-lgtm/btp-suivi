// Construction du modele 3D d'un chantier (route ou batiment) pour le suivi et la
// page de modelisation 3D. Donnees pures, sans dependance a three.js : testables,
// avec des volumes en metres reels (echelle 1:1) et un placement exact :
// - route : chaussee en couches, sections placees selon leurs PK, avancement colore ;
// - batiment : niveaux empiles (RDC, R+1...), dalles, poteaux et voiles.
// Les ouvrages saisis sans PK / sans niveau (modelisation 3D) sont presentes en annexe.

import { avancementMoyenSections, formaterPK } from "./complet.ts";

export type FormeScene = "boite" | "cylindre";

/** Element geometrique simple du modele (volumes en metres). */
export type ElementScene = {
  forme: FormeScene;
  /** Centre du volume : X = axe du chantier, Y = hauteur, Z = largeur. */
  position: [number, number, number];
  /** Dimensions [longueur, hauteur, largeur] ; cylindre : [diametre, hauteur, diametre]. */
  taille: [number, number, number];
  couleur: string;
  /** Opacite 0..1 (1 = opaque). */
  opacite?: number;
};

/** Texte flottant au-dessus du modele (section, PK, niveau...). */
export type EtiquetteScene = {
  texte: string;
  position: [number, number, number];
};

/** Section de chantier telle qu'utilisee par le modele 3D. */
export type SectionScene = {
  id: string;
  nom: string;
  pk_debut: number | null;
  pk_fin: number | null;
  niveau: string | null;
  lot: string | null;
  type_ouvrage: string | null;
  longueur?: number | null;
  largeur?: number | null;
  hauteur?: number | null;
  couleur?: string | null;
  avancement_pct?: number | null;
};

export type ChantierScene = {
  id: string;
  nom: string;
  type: string;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
};

export type ResumeScene = {
  longueur: number;
  largeur: number;
  hauteur: number | null;
  pkDebut: number | null;
  pkFin: number | null;
  nbNiveaux: number | null;
  nbOuvragesAnnexes: number;
};

export type SceneChantier = {
  type: "route" | "batiment";
  elements: ElementScene[];
  etiquettes: EtiquetteScene[];
  /** Rayon de la sphere englobante (metres) : sert a cadrer la camera. */
  rayon: number;
  resume: ResumeScene & { nbSections: number; avancement: number | null };
};

// --- Couleurs et libelles ---

export const COULEURS_AVANCEMENT = {
  attente: "#94a3b8",
  enCours: "#f59e0b",
  termine: "#10b981",
} as const;

/** Couleur selon l'avancement : gris (0 %), orange (en cours), vert (100 %). */
export function couleurAvancement(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || !Number.isFinite(Number(pct))) {
    return COULEURS_AVANCEMENT.attente;
  }
  const v = Number(pct);
  if (v <= 0) return COULEURS_AVANCEMENT.attente;
  if (v >= 100) return COULEURS_AVANCEMENT.termine;
  return COULEURS_AVANCEMENT.enCours;
}

/** Lit un niveau saisi ("RDC", "R+2", "Sous-sol", "Etage 3", "2") et renvoie son indice. */
export function niveauDepuisTexte(texte: string | null | undefined): number | null {
  if (!texte) return null;
  const t = String(texte).trim().toLowerCase();
  if (!t) return null;
  if (t.includes("sous") && t.includes("sol")) return -1;
  if (t.includes("rdc") || t.includes("rez")) return 0;
  const rplus = t.match(/r\s*\+\s*(\d+)/);
  if (rplus) return Number(rplus[1]);
  const etage = t.match(/[eé]tage\s*(\d+)/);
  if (etage) return Number(etage[1]);
  const seul = t.match(/^(\d+)$/);
  if (seul) return Number(seul[1]);
  return null;
}

/** Libelle d'un niveau a partir de son indice : -1 = Sous-sol, 0 = RDC, n = R+n. */
export function libelleNiveau(indice: number): string {
  if (indice < 0) return "Sous-sol";
  if (indice === 0) return "RDC";
  return `R+${indice}`;
}

/** Couleur d'un ouvrage annexe (mur, dalle, pilier...) sans avancement renseigne. */
export function couleurOuvrage(typeOuvrage: string | null | undefined): string {
  switch ((typeOuvrage ?? "").toLowerCase()) {
    case "mur":
      return "#b08d57";
    case "dalle":
      return "#8d8577";
    case "pilier":
      return "#5c5f66";
    case "section":
      return "#7c9a92";
    default:
      return "#94a3b8";
  }
}

/** Pas de grille adapte a la taille affichee (1 carreau lisible, en metres). */
export function pasGrille(etendue: number): number {
  const pas = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  const cible = Math.max(0.5, etendue / 12);
  let choisi = pas[0];
  for (const p of pas) {
    if (p <= cible) choisi = p;
  }
  return choisi;
}

// --- Aides internes ---

function nombrePositif(valeur: number | null | undefined): number | null {
  const n = Number(valeur);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function lirePk(valeur: number | null | undefined): number | null {
  if (valeur === null || valeur === undefined) return null;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
}

/** Rayon de la sphere englobant tous les elements (minimum 4 m). */
function rayonElements(elements: ElementScene[]): number {
  if (elements.length === 0) return 4;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const e of elements) {
    minX = Math.min(minX, e.position[0] - e.taille[0] / 2);
    maxX = Math.max(maxX, e.position[0] + e.taille[0] / 2);
    minY = Math.min(minY, e.position[1] - e.taille[1] / 2);
    maxY = Math.max(maxY, e.position[1] + e.taille[1] / 2);
    minZ = Math.min(minZ, e.position[2] - e.taille[2] / 2);
    maxZ = Math.max(maxZ, e.position[2] + e.taille[2] / 2);
  }
  const ex = (maxX - minX) / 2;
  const ey = (maxY - minY) / 2;
  const ez = (maxZ - minZ) / 2;
  return Math.max(4, Math.hypot(ex, ey, ez));
}

/** Place les ouvrages annexes en ligne. Renvoie la liste des positions X utilisees. */
function placerAnnexes(
  annexes: SectionScene[],
  elements: ElementScene[],
  etiquettes: EtiquetteScene[],
  options: {
    xDebut: number;
    xFin: number;
    z: number;
    espacement: number;
    etiquetteGenerale: boolean;
  },
): void {
  if (annexes.length === 0) return;
  const { xDebut, xFin, z, espacement, etiquetteGenerale } = options;
  let hauteurMax = 0;
  const xs: number[] = [];
  annexes.forEach((s, i) => {
    const long = nombrePositif(s.longueur) ?? 3;
    const haut = nombrePositif(s.hauteur) ?? 2;
    const larg = nombrePositif(s.largeur) ?? 2;
    const forme: FormeScene = s.type_ouvrage === "pilier" ? "cylindre" : "boite";
    const x = xDebut + i * espacement;
    const y = haut / 2;
    elements.push({
      forme,
      position: [x, y, z],
      taille: forme === "cylindre" ? [Math.min(long, larg), haut, Math.min(long, larg)] : [long, haut, larg],
      couleur: s.couleur || couleurOuvrage(s.type_ouvrage),
    });
    const pct = s.avancement_pct;
    const suffixe = pct === null || pct === undefined ? "" : ` · ${Math.round(Number(pct))} %`;
    etiquettes.push({ texte: `${s.nom}${suffixe}`, position: [x, haut + 1.2, z] });
    xs.push(x);
    hauteurMax = Math.max(hauteurMax, haut);
  });
  if (etiquetteGenerale) {
    const centre = (Math.min(...xs) + Math.max(...xs)) / 2;
    etiquettes.push({ texte: "Ouvrages annexes", position: [centre, hauteurMax + 3, z] });
  }
  void xFin;
}

// --- Route ---

function construireRoute(
  chantier: ChantierScene,
  sections: SectionScene[],
  elements: ElementScene[],
  etiquettes: EtiquetteScene[],
): ResumeScene {
  const segments = sections.filter((s) => {
    const debut = lirePk(s.pk_debut);
    const fin = lirePk(s.pk_fin);
    return debut !== null && fin !== null && fin > debut;
  });
  const annexes = sections.filter((s) => !segments.includes(s));

  const longueurChantier = nombrePositif(chantier.longueur);
  const pkDebut = segments.length > 0 ? Math.min(...segments.map((s) => lirePk(s.pk_debut) as number)) : 0;
  const pkFin =
    segments.length > 0 ? Math.max(...segments.map((s) => lirePk(s.pk_fin) as number)) : longueurChantier ?? 100;
  const portee = Math.max(4, pkFin - pkDebut);
  const largeurChaussee = nombrePositif(chantier.largeur) ?? 7;
  const accotement = Math.max(0.8, largeurChaussee * 0.2);
  const xDebut = -portee / 2;
  const xDe = (valeur: number) => xDebut + (valeur - pkDebut);

  // Sol / plateforme d'emprise
  elements.push({
    forme: "boite",
    position: [0, -0.15, 0],
    taille: [portee + 12, 0.3, largeurChaussee + accotement * 2 + 10],
    couleur: "#cbb491",
  });
  // Corps de chaussee en couches : fondation, base, revetement
  elements.push({ forme: "boite", position: [0, 0.15, 0], taille: [portee, 0.3, largeurChaussee], couleur: "#9a9183" });
  elements.push({ forme: "boite", position: [0, 0.41, 0], taille: [portee, 0.22, largeurChaussee], couleur: "#8a8274" });
  elements.push({ forme: "boite", position: [0, 0.57, 0], taille: [portee, 0.1, largeurChaussee], couleur: "#43464a" });
  // Accotements
  const zAccotement = largeurChaussee / 2 + accotement / 2;
  for (const cote of [-1, 1]) {
    elements.push({
      forme: "boite",
      position: [0, 0.62, cote * zAccotement],
      taille: [portee, 0.06, accotement],
      couleur: "#b9915f",
    });
  }
  // Marquage axial (pointilles espaces selon la longueur)
  const nbTirets = Math.min(70, Math.max(6, Math.round(portee / 25)));
  const espacementTirets = portee / (nbTirets + 1);
  for (let i = 1; i <= nbTirets; i++) {
    elements.push({
      forme: "boite",
      position: [xDebut + espacementTirets * i, 0.635, 0],
      taille: [Math.min(3, espacementTirets * 0.5), 0.02, 0.18],
      couleur: "#eef0f2",
    });
  }
  // Sections : bandes colorees selon l'avancement, borne a chaque debut de section
  const avecEtiquette = segments.length <= 12;
  const zBorne = -(largeurChaussee / 2 + accotement + 0.4);
  for (const s of segments) {
    const debut = lirePk(s.pk_debut) as number;
    const fin = lirePk(s.pk_fin) as number;
    const longueurSegment = fin - debut;
    const centre = xDe((debut + fin) / 2);
    const couleur = s.couleur || couleurAvancement(s.avancement_pct);
    elements.push({
      forme: "boite",
      position: [centre, 0.635, 0],
      taille: [longueurSegment, 0.05, largeurChaussee + accotement * 2],
      couleur,
      opacite: 0.9,
    });
    elements.push({
      forme: "cylindre",
      position: [xDe(debut) + 0.3, 0.9, zBorne],
      taille: [0.18, 1.2, 0.18],
      couleur: "#2f3437",
    });
    if (avecEtiquette || longueurSegment >= portee / 25) {
      const pct = Math.round(Number(s.avancement_pct ?? 0));
      etiquettes.push({ texte: `${s.nom} · ${pct} %`, position: [centre, 2.4, 0] });
    }
  }
  if (segments.length > 0) {
    elements.push({
      forme: "cylindre",
      position: [xDe(pkFin) - 0.3, 0.9, zBorne],
      taille: [0.18, 1.2, 0.18],
      couleur: "#2f3437",
    });
  }
  // Etiquettes de PK aux extremites
  const zPk = -(largeurChaussee / 2 + accotement + 1.6);
  const etiquetteDebut = formaterPK(pkDebut);
  const etiquetteFin = formaterPK(pkFin);
  if (etiquetteDebut) etiquettes.push({ texte: etiquetteDebut, position: [xDe(pkDebut), 1.6, zPk] });
  if (etiquetteFin) etiquettes.push({ texte: etiquetteFin, position: [xDe(pkFin), 1.6, zPk] });
  // Bornes kilometriques regulieres (cote oppose aux PK)
  const pas = pasGrille(portee);
  let nbBornes = 0;
  for (let valeur = Math.ceil((pkDebut + pas) / pas) * pas; valeur <= pkFin && nbBornes < 24; valeur += pas) {
    elements.push({
      forme: "cylindre",
      position: [xDe(valeur), 0.8, largeurChaussee / 2 + accotement + 0.5],
      taille: [0.14, 1.1, 0.14],
      couleur: "#30363d",
    });
    nbBornes++;
  }
  // Ouvrages annexes (elements sans PK saisis dans la modelisation 3D)
  if (annexes.length > 0) {
    const espacement = Math.max(5, Math.min(30, portee / Math.max(1, annexes.length + 1)));
    const zAnnexes = largeurChaussee / 2 + accotement + 4;
    const xMilieu = 0;
    placerAnnexes(annexes, elements, etiquettes, {
      xDebut: xMilieu - ((annexes.length - 1) * espacement) / 2,
      xFin: xMilieu + ((annexes.length - 1) * espacement) / 2,
      z: zAnnexes,
      espacement,
      etiquetteGenerale: true,
    });
  }

  return {
    longueur: portee,
    largeur: largeurChaussee,
    hauteur: null,
    pkDebut,
    pkFin,
    nbNiveaux: null,
    nbOuvragesAnnexes: annexes.length,
  };
}

// --- Batiment ---

function construireBatiment(
  chantier: ChantierScene,
  sections: SectionScene[],
  elements: ElementScene[],
  etiquettes: EtiquetteScene[],
): ResumeScene {
  const longueur = nombrePositif(chantier.longueur) ?? 20;
  const largeur = nombrePositif(chantier.largeur) ?? 10;

  const parNiveau = new Map<number, SectionScene[]>();
  const annexes: SectionScene[] = [];
  for (const s of sections) {
    const indice = niveauDepuisTexte(s.niveau);
    if (indice === null) {
      annexes.push(s);
    } else {
      const liste = parNiveau.get(indice) ?? [];
      liste.push(s);
      parNiveau.set(indice, liste);
    }
  }
  const indices = [...parNiveau.keys()].sort((a, b) => a - b);
  const premierIndice = indices.length > 0 ? indices[0] : 0;
  const nbDepuisSections = indices.length > 0 ? indices[indices.length - 1] - premierIndice + 1 : 0;
  const nbNiveaux =
    nbDepuisSections > 0 ? nbDepuisSections : Math.max(1, Math.round((nombrePositif(chantier.hauteur) ?? 6) / 3));
  const hauteurTotale = nombrePositif(chantier.hauteur) ?? nbNiveaux * 3;
  const hauteurNiveau = hauteurTotale / nbNiveaux;

  // Terrain (emprise + abords)
  elements.push({ forme: "boite", position: [0, -0.1, 0], taille: [longueur + 8, 0.2, largeur + 8], couleur: "#cbb491" });

  for (let i = 0; i < nbNiveaux; i++) {
    const indice = premierIndice + i;
    const yBase = i * hauteurNiveau;
    const sectionsNiveau = parNiveau.get(indice) ?? [];
    const avancementNiveau = avancementMoyenSections(sectionsNiveau);

    // Dalle du niveau + bande d'avancement sur son pourtour
    elements.push({ forme: "boite", position: [0, yBase + 0.1, 0], taille: [longueur + 0.4, 0.2, largeur + 0.4], couleur: "#bdb7ab" });
    elements.push({
      forme: "boite",
      position: [0, yBase + 0.235, 0],
      taille: [longueur + 0.46, 0.07, largeur + 0.46],
      couleur: couleurAvancement(avancementNiveau),
    });

    // Poteaux repartis regulierement (tous les 6 m environ)
    const nbPoteauxX = Math.max(2, Math.round(longueur / 6) + 1);
    for (let k = 0; k < nbPoteauxX; k++) {
      const x = -(longueur / 2 - 0.15) + (k * (longueur - 0.3)) / (nbPoteauxX - 1);
      for (const cote of [-1, 1]) {
        elements.push({
          forme: "boite",
          position: [x, yBase + hauteurNiveau / 2 + 0.1, cote * (largeur / 2 - 0.15)],
          taille: [0.3, hauteurNiveau, 0.3],
          couleur: "#5c5f66",
        });
      }
    }
    // Voiles semi-transparents (lecture "en construction")
    const epaisseur = 0.12;
    const yVoile = yBase + hauteurNiveau / 2 + 0.1;
    for (const cote of [-1, 1]) {
      elements.push({
        forme: "boite",
        position: [0, yVoile, cote * (largeur / 2 - epaisseur / 2)],
        taille: [longueur, hauteurNiveau, epaisseur],
        couleur: "#d8d2c6",
        opacite: 0.16,
      });
      elements.push({
        forme: "boite",
        position: [cote * (longueur / 2 - epaisseur / 2), yVoile, 0],
        taille: [epaisseur, hauteurNiveau, largeur],
        couleur: "#d8d2c6",
        opacite: 0.16,
      });
    }

    // Etiquette du niveau : "R+1 · Gros oeuvre · 65 %"
    const lots = [...new Set(sectionsNiveau.map((s) => s.lot).filter((l): l is string => Boolean(l)))].slice(0, 2);
    const parties = [libelleNiveau(indice)];
    if (lots.length > 0) parties.push(lots.join(" / "));
    if (avancementNiveau !== null) parties.push(`${Math.round(avancementNiveau)} %`);
    etiquettes.push({ texte: parties.join(" · "), position: [-(longueur / 2 + 3), yBase + hauteurNiveau / 2, 0] });
  }

  // Ouvrages annexes (elements sans niveau)
  placerAnnexes(annexes, elements, etiquettes, {
    xDebut: longueur / 2 + 5,
    xFin: 0,
    z: 0,
    espacement: 5,
    etiquetteGenerale: annexes.length > 0,
  });

  return {
    longueur,
    largeur,
    hauteur: hauteurTotale,
    pkDebut: null,
    pkFin: null,
    nbNiveaux,
    nbOuvragesAnnexes: annexes.length,
  };
}

// --- Point d'entree ---

/** Construit la scene 3D complete d'un chantier a partir de ses sections. */
export function construireSceneChantier(
  chantier: ChantierScene | null,
  sections: SectionScene[],
): SceneChantier | null {
  if (!chantier) return null;
  const liste = Array.isArray(sections) ? sections : [];
  const type: "route" | "batiment" = chantier.type === "route" ? "route" : "batiment";
  const elements: ElementScene[] = [];
  const etiquettes: EtiquetteScene[] = [];
  const resume =
    type === "route"
      ? construireRoute(chantier, liste, elements, etiquettes)
      : construireBatiment(chantier, liste, elements, etiquettes);
  return {
    type,
    elements,
    etiquettes,
    rayon: rayonElements(elements),
    resume: { ...resume, nbSections: liste.length, avancement: avancementMoyenSections(liste) },
  };
}
