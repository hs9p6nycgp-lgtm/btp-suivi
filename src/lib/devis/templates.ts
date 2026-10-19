// Modeles de devis estimes (calculateurs).
// Chaque modele propose : des entrees (dimensions), des lignes detailees
// (materiaux, main d'oeuvre, location d'engins) et un planning indicatif.
//
// Regles :
// - Les formules du cahier des charges (section 5) sont respectees a l'identique :
//   volume de couche = L x l x e ; volume foisonne = volume x coeff ;
//   nombre de bennes = arrondi superieur ; volume beton = L x l x e ;
//   ratio d'acier = volume x ratio ; rendement peinture = surface x couches / rendement.
// - Chaque ligne avec `keywords` doit correspondre a au moins un poste du BPU
//   (verifie par le test de couverture) pour proposer un prix reel.

export type DevisInput = {
  id: string;
  label: string;
  type: "number" | "select";
  default: string;
  options?: { value: string; label: string }[];
};

export type DevisLine = {
  code: string;
  designation: string;
  calcul: string;
  unite: string;
  quantite: (inputs: Record<string, string>) => number;
  keywords: string[];
};

export type DevisTemplate = {
  id: string;
  nom: string;
  typeChantier: "route" | "batiment" | "commun";
  inputs: DevisInput[];
  lignes: DevisLine[];
  taches: (inputs: Record<string, string>) => { nom: string; jours: number }[];
};

/** Lecture numerique d'une entree (0 si vide ou invalide). */
function n(i: Record<string, string>, cle: string, defaut = 0): number {
  const v = Number(i[cle]);
  return Number.isFinite(v) ? v : defaut;
}

/** Nombre de bennes : arrondi a l'entier superieur (cahier des charges, section 5). */
function nbBennes(volume: number, capacite: number): number {
  return Math.ceil(volume / (capacite > 0 ? capacite : 15));
}

export const templates: DevisTemplate[] = [
  // ============================================================
  // BATIMENT
  // ============================================================
  {
    id: "mur-agglos",
    nom: "Mur en agglos (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "10" },
      { id: "hauteur", label: "Hauteur (m)", type: "number", default: "2.8" },
      { id: "epaisseur", label: "Epaisseur (m)", type: "number", default: "0.15" },
      { id: "ouvertures", label: "Ouvertures (%)", type: "number", default: "5" },
      { id: "pertes", label: "Pertes blocs (%)", type: "number", default: "5" },
      { id: "faces_enduites", label: "Faces enduites (1 ou 2)", type: "number", default: "2" },
    ],
    lignes: [
      {
        code: "MUR-AGGLO-M2",
        designation: "Maçonnerie agglos - fourniture (m2)",
        calcul: "surface nette x (1 + pertes)",
        unite: "m2",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          return surf * (1 + n(i, "pertes") / 100);
        },
        keywords: ["agglo creux", "agglo plein"],
      },
      {
        code: "MUR-BLOCS",
        designation: "Nombre de blocs (agglo 15 : 12,5 u/m2)",
        calcul: "surface nette / 0.08 x (1 + pertes), arrondi sup.",
        unite: "u",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          return Math.ceil((surf / 0.08) * (1 + n(i, "pertes") / 100));
        },
        keywords: [],
      },
      {
        code: "MUR-MORTIER",
        designation: "Mortier de pose (joints)",
        calcul: "surface nette x 0.02 m3/m2",
        unite: "m3",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          return surf * 0.02;
        },
        keywords: ["mortier prêt à l'emploi", "mortier prêt"],
      },
      {
        code: "MUR-CIMENT",
        designation: "Ciment pour mortier (sacs de 50 kg)",
        calcul: "mortier x 280 kg/m3 / 50",
        unite: "sac",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          return Math.ceil(((surf * 0.02 * 280) / 50) * 10) / 10;
        },
        keywords: ["ciment"],
      },
      {
        code: "MUR-SABLE",
        designation: "Sable pour mortier",
        calcul: "mortier x 0.9",
        unite: "m3",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          return surf * 0.02 * 0.9;
        },
        keywords: ["sable de carrière", "sable de rivière"],
      },
      {
        code: "MUR-ENDUIT",
        designation: "Enduit (une ou deux faces)",
        calcul: "surface nette x faces enduites (m2)",
        unite: "m2",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          return surf * Math.min(Math.max(n(i, "faces_enduites", 2), 1), 2);
        },
        keywords: ["enduit de façade", "enduit superficiel"],
      },
      {
        code: "MUR-CIMENT-ENDUIT",
        designation: "Ciment pour enduit (sacs de 50 kg)",
        calcul: "enduit x 0.012 m3/m2 x 280 kg / 50",
        unite: "sac",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          const enduit = surf * Math.min(Math.max(n(i, "faces_enduites", 2), 1), 2);
          return Math.ceil(((enduit * 0.012 * 280) / 50) * 10) / 10;
        },
        keywords: ["ciment"],
      },
      {
        code: "MUR-SABLE-ENDUIT",
        designation: "Sable pour enduit",
        calcul: "enduit x 0.012 m3/m2",
        unite: "m3",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          const enduit = surf * Math.min(Math.max(n(i, "faces_enduites", 2), 1), 2);
          return enduit * 0.012;
        },
        keywords: ["sable de carrière", "sable de rivière"],
      },
      {
        code: "MUR-IMPLANTATION",
        designation: "Implantation et traçage",
        calcul: "longueur (ml)",
        unite: "ml",
        quantite: (i) => n(i, "longueur"),
        keywords: ["implantation des ouvrages"],
      },
      {
        code: "MUR-MACON",
        designation: "Maçon (journées)",
        calcul: "surface nette / 10, arrondi sup.",
        unite: "jour",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          return Math.max(1, Math.ceil(surf / 10));
        },
        keywords: ["maçon (journée)", "main-d’œuvre maçon"],
      },
      {
        code: "MUR-AIDE",
        designation: "Aide-maçon (journées)",
        calcul: "surface nette / 15, arrondi sup.",
        unite: "jour",
        quantite: (i) => {
          const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
          return Math.max(1, Math.ceil(surf / 15));
        },
        keywords: ["aide-maçon"],
      },
    ],
    taches: (i) => {
      const surf = n(i, "longueur") * n(i, "hauteur") * (1 - n(i, "ouvertures") / 100);
      return [
        { nom: "Implantation et traçage", jours: 1 },
        { nom: "Approvisionnement blocs et liants", jours: Math.max(1, Math.ceil(surf / 40)) },
        { nom: "Montage mur en agglos", jours: Math.max(1, Math.ceil(surf / 8)) },
        { nom: "Enduit et finition", jours: Math.max(1, Math.ceil(surf / 15)) },
        { nom: "Cure et réception", jours: Math.max(1, Math.ceil(surf / 25)) },
      ];
    },
  },
  {
    id: "dalle-beton",
    nom: "Dalle / radier en beton arme (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "10" },
      { id: "largeur", label: "Largeur (m)", type: "number", default: "5" },
      { id: "epaisseur", label: "Epaisseur (m)", type: "number", default: "0.12" },
      { id: "dosage", label: "Dosage ciment (kg/m3)", type: "number", default: "350" },
      { id: "ratio_acier", label: "Ratio acier (kg/m3)", type: "number", default: "80" },
    ],
    lignes: [
      {
        code: "DALLE-BETON",
        designation: "Beton (volume en place)",
        calcul: "L x l x e (m3)",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur"),
        keywords: ["béton c30/37", "béton dosé 350"],
      },
      {
        code: "DALLE-CIMENT",
        designation: "Ciment (sacs de 50 kg, si fabrication chantier)",
        calcul: "volume x dosage / 50",
        unite: "sac",
        quantite: (i) => {
          const v = n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur");
          return Math.ceil((v * n(i, "dosage", 350)) / 50);
        },
        keywords: ["ciment"],
      },
      {
        code: "DALLE-SABLE",
        designation: "Sable",
        calcul: "volume x 0.4",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * 0.4,
        keywords: ["sable de carrière", "sable de rivière"],
      },
      {
        code: "DALLE-GRAVIER",
        designation: "Gravier",
        calcul: "volume x 0.8",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * 0.8,
        keywords: ["gravier"],
      },
      {
        code: "DALLE-ACIER",
        designation: "Acier HA",
        calcul: "volume x ratio (kg) - cahier des charges",
        unite: "kg",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * n(i, "ratio_acier", 80),
        keywords: ["barre ha", "acier pour fondations", "acier pour poutres"],
      },
      {
        code: "DALLE-TREILLIS",
        designation: "Treillis soudé (nappe)",
        calcul: "surface x 1.1",
        unite: "m2",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * 1.1,
        keywords: ["treillis soudé"],
      },
      {
        code: "DALLE-FIL",
        designation: "Fil d'attache",
        calcul: "acier x 2%",
        unite: "kg",
        quantite: (i) =>
          n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * n(i, "ratio_acier", 80) * 0.02,
        keywords: ["fil d'attache"],
      },
      {
        code: "DALLE-COFFRAGE",
        designation: "Coffrage de rive",
        calcul: "périmètre x épaisseur (m2)",
        unite: "m2",
        quantite: (i) => 2 * (n(i, "longueur") + n(i, "largeur")) * n(i, "epaisseur"),
        keywords: ["planche coffrage", "planche de coffrage", "panneau de coffrage"],
      },
      {
        code: "DALLE-CLOUS",
        designation: "Clous de coffrage",
        calcul: "coffrage x 0.15 kg/m2",
        unite: "kg",
        quantite: (i) => 2 * (n(i, "longueur") + n(i, "largeur")) * n(i, "epaisseur") * 0.15,
        keywords: ["clous"],
      },
      {
        code: "DALLE-VIBRANT",
        designation: "Location aiguille vibrante (journées)",
        calcul: "volume / 8, arrondi sup.",
        unite: "jour",
        quantite: (i) => {
          const v = n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur");
          return Math.max(1, Math.ceil(v / 8));
        },
        keywords: ["aiguille vibrante"],
      },
    ],
    taches: (i) => {
      const surf = n(i, "longueur") * n(i, "largeur");
      const v = surf * n(i, "epaisseur");
      return [
        { nom: "Implantation et terrassement", jours: Math.max(1, Math.ceil(surf / 30)) },
        { nom: "Coffrage et ferraillage", jours: Math.max(1, Math.ceil(surf / 20)) },
        { nom: "Betonage et vibration", jours: Math.max(1, Math.ceil(v / 6)) },
        { nom: "Cure", jours: 3 },
      ];
    },
  },
  {
    id: "peinture",
    nom: "Peinture interieure (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "surface", label: "Surface a peindre (m2)", type: "number", default: "100" },
      { id: "couches", label: "Nombre de couches", type: "number", default: "2" },
      { id: "rendement", label: "Rendement (m2/L)", type: "number", default: "10" },
    ],
    lignes: [
      {
        code: "PEINT-PREPA",
        designation: "Préparation des supports (ragréage)",
        calcul: "surface (m2)",
        unite: "m2",
        quantite: (i) => n(i, "surface"),
        keywords: ["ragreage", "enduit de façade"],
      },
      {
        code: "PEINT-IMPRESSION",
        designation: "Impression / sous-couche",
        calcul: "surface / 8 (L)",
        unite: "L",
        quantite: (i) => n(i, "surface") / 8,
        keywords: [],
      },
      {
        code: "PEINT-QTE",
        designation: "Peinture de finition",
        calcul: "surface x couches / rendement (L) - cahier des charges",
        unite: "L",
        quantite: (i) => (n(i, "surface") * n(i, "couches", 1)) / (n(i, "rendement", 10) || 10),
        keywords: ["peinture (l)", "peinture"],
      },
      {
        code: "PEINT-APPLICATION",
        designation: "Peintre (journées)",
        calcul: "surface x couches / 60, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "surface") * n(i, "couches", 1)) / 60)),
        keywords: ["peintre"],
      },
    ],
    taches: (i) => [
      { nom: "Préparation des supports", jours: Math.max(1, Math.ceil(n(i, "surface") / 50)) },
      { nom: "Impression", jours: Math.max(1, Math.ceil(n(i, "surface") / 80)) },
      { nom: "Application peinture (couches)", jours: Math.max(1, Math.ceil((n(i, "surface") * n(i, "couches", 1)) / 80)) },
      { nom: "Reprises et réception", jours: 1 },
    ],
  },
  {
    id: "fondations-semelles",
    nom: "Fondations - semelles isolees (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "nb", label: "Nombre de semelles", type: "number", default: "4" },
      { id: "longueur", label: "Longueur semelle (m)", type: "number", default: "1.2" },
      { id: "largeur", label: "Largeur semelle (m)", type: "number", default: "1.2" },
      { id: "hauteur", label: "Hauteur / profondeur (m)", type: "number", default: "0.6" },
      { id: "ratio_acier", label: "Ratio acier (kg/m3)", type: "number", default: "90" },
      { id: "ep_proprete", label: "Beton de propreté - épaisseur (m)", type: "number", default: "0.05" },
      { id: "foisonnement", label: "Coeff. foisonnement (fouille)", type: "number", default: "1.2" },
      { id: "capacite_benne", label: "Capacite benne (m3)", type: "number", default: "15" },
    ],
    lignes: [
      {
        code: "FOND-PROPRETE",
        designation: "Beton de propreté",
        calcul: "nb x (L+0.2) x (l+0.2) x ép.",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * (n(i, "longueur") + 0.2) * (n(i, "largeur") + 0.2) * n(i, "ep_proprete", 0.05),
        keywords: ["béton de propreté"],
      },
      {
        code: "FOND-BETON",
        designation: "Beton de fondation (semelles)",
        calcul: "nb x L x l x h (m3)",
        unite: "m3",
        quantite: (i) => n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur"),
        keywords: ["béton dosé", "béton c30/37", "béton fabriqué chantier"],
      },
      {
        code: "FOND-CIMENT",
        designation: "Ciment (sacs de 50 kg, si fabrication chantier)",
        calcul: "(beton + propreté) x 0.35 t/m3 / 50",
        unite: "sac",
        quantite: (i) => {
          const v = n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur");
          const vp = n(i, "nb") * (n(i, "longueur") + 0.2) * (n(i, "largeur") + 0.2) * n(i, "ep_proprete", 0.05);
          return Math.ceil((v + vp) * 7);
        },
        keywords: ["ciment"],
      },
      {
        code: "FOND-SABLE",
        designation: "Sable",
        calcul: "(beton + propreté) x 0.4",
        unite: "m3",
        quantite: (i) => {
          const v = n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur");
          const vp = n(i, "nb") * (n(i, "longueur") + 0.2) * (n(i, "largeur") + 0.2) * n(i, "ep_proprete", 0.05);
          return (v + vp) * 0.4;
        },
        keywords: ["sable de carrière", "sable de rivière"],
      },
      {
        code: "FOND-GRAVIER",
        designation: "Gravier",
        calcul: "(beton + propreté) x 0.8",
        unite: "m3",
        quantite: (i) => {
          const v = n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur");
          const vp = n(i, "nb") * (n(i, "longueur") + 0.2) * (n(i, "largeur") + 0.2) * n(i, "ep_proprete", 0.05);
          return (v + vp) * 0.8;
        },
        keywords: ["gravier"],
      },
      {
        code: "FOND-ACIER",
        designation: "Acier HA",
        calcul: "volume x ratio (kg)",
        unite: "kg",
        quantite: (i) =>
          n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur") * n(i, "ratio_acier", 90),
        keywords: ["acier pour fondations", "barre ha"],
      },
      {
        code: "FOND-FIL",
        designation: "Fil d'attache",
        calcul: "acier x 2%",
        unite: "kg",
        quantite: (i) =>
          n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur") * n(i, "ratio_acier", 90) * 0.02,
        keywords: ["fil d'attache"],
      },
      {
        code: "FOND-COFFRAGE",
        designation: "Coffrage des semelles",
        calcul: "nb x 2 x (L + l) x h (m2)",
        unite: "m2",
        quantite: (i) =>
          n(i, "nb") * 2 * (n(i, "longueur") + n(i, "largeur")) * n(i, "hauteur"),
        keywords: ["planche coffrage", "planche de coffrage", "bois de coffrage"],
      },
      {
        code: "FOND-CLOUS",
        designation: "Clous de coffrage",
        calcul: "coffrage x 0.2 kg/m2",
        unite: "kg",
        quantite: (i) =>
          n(i, "nb") * 2 * (n(i, "longueur") + n(i, "largeur")) * n(i, "hauteur") * 0.2,
        keywords: ["clous"],
      },
      {
        code: "FOND-TERRASSEMENT",
        designation: "Terrassement des fouilles",
        calcul: "volume beton x coeff. foisonnement (m3)",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur") * (n(i, "foisonnement", 1.2) || 1.2),
        keywords: ["terrassement", "fouilles", "excavation"],
      },
      {
        code: "FOND-REMBLAI",
        designation: "Remblai des fouilles",
        calcul: "fouille x coeff. foisonnement - volume beton",
        unite: "m3",
        quantite: (i) => {
          const v = n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur");
          return Math.max(v * (n(i, "foisonnement", 1.2) || 1.2) - v, 0);
        },
        keywords: ["remblai manuel des fouilles", "remblai de terre"],
      },
    ],
    taches: (i) => {
      const v = n(i, "nb") * n(i, "longueur") * n(i, "largeur") * n(i, "hauteur");
      const foisonnement = n(i, "foisonnement", 1.2) || 1.2;
      const capaciteBenne = n(i, "capacite_benne", 15) || 15;
      return [
        { nom: "Implantation et terrassement", jours: Math.max(1, Math.ceil((v * foisonnement) / capaciteBenne)) },
        { nom: "Beton de propreté", jours: 1 },
        { nom: "Coffrage", jours: Math.max(1, Math.ceil((n(i, "nb") * 2 * (n(i, "longueur") + n(i, "largeur")) * n(i, "hauteur")) / 20)) },
        { nom: "Ferraillage", jours: Math.max(1, Math.ceil((v * n(i, "ratio_acier", 90)) / 100)) },
        { nom: "Betonage et cure", jours: Math.max(1, Math.ceil(v / 6)) },
      ];
    },
  },
  {
    id: "charpente-toiture",
    nom: "Charpente et toiture (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "surface", label: "Surface du toit (m2)", type: "number", default: "120" },
      { id: "pente", label: "Pente (degres)", type: "number", default: "25" },
      { id: "entraxe", label: "Entraxe chevrons (m)", type: "number", default: "0.6" },
    ],
    lignes: [
      {
        code: "CHARP-COUVERTURE",
        designation: "Couverture (bac acier, tôle ou tuiles)",
        calcul: "surface x 1.05 (recouvrement)",
        unite: "m2",
        quantite: (i) => n(i, "surface") * 1.05,
        keywords: ["couverture", "tôle bac acier", "tôle ondulée", "tuile béton"],
      },
      {
        code: "CHARP-BOIS",
        designation: "Bois de charpente (fermes, pannes)",
        calcul: "surface x 0.05 m3 (estimation)",
        unite: "m3",
        quantite: (i) => n(i, "surface") * 0.05,
        keywords: ["bois de charpente"],
      },
      {
        code: "CHARP-CHEVRONS",
        designation: "Chevrons",
        calcul: "surface / entraxe",
        unite: "ml",
        quantite: (i) => n(i, "surface") / (n(i, "entraxe", 0.6) || 0.6),
        keywords: ["chevrons"],
      },
      {
        code: "CHARP-LITEAUX",
        designation: "Tasseaux et liteaux",
        calcul: "surface x 3 m/m2",
        unite: "ml",
        quantite: (i) => n(i, "surface") * 3,
        keywords: ["tasseaux et liteaux"],
      },
      {
        code: "CHARP-SOUS-TOITURE",
        designation: "Sous-toiture",
        calcul: "surface x 1.05",
        unite: "m2",
        quantite: (i) => n(i, "surface") * 1.05,
        keywords: ["sous-toiture"],
      },
      {
        code: "CHARP-ETANCHE",
        designation: "Etanchéité",
        calcul: "surface x 1.1",
        unite: "m2",
        quantite: (i) => n(i, "surface") * 1.1,
        keywords: ["etancheite", "membrane etancheite"],
      },
      {
        code: "CHARP-GOUTTIERE",
        designation: "Gouttières",
        calcul: "2 x racine(surface) (ml)",
        unite: "ml",
        quantite: (i) => 2 * Math.sqrt(n(i, "surface")),
        keywords: ["gouttière pvc"],
      },
      {
        code: "CHARP-BARDAGE",
        designation: "Bardage / planche de rive",
        calcul: "périmètre estimé x 0.6 (m2)",
        unite: "m2",
        quantite: (i) => Math.sqrt(n(i, "surface")) * 4 * 0.6,
        keywords: ["bardage", "volige"],
      },
      {
        code: "CHARP-CLOUS",
        designation: "Clous / visserie",
        calcul: "surface x 0.08 kg/m2",
        unite: "kg",
        quantite: (i) => n(i, "surface") * 0.08,
        keywords: ["clous", "vis"],
      },
      {
        code: "CHARP-MENUISIER",
        designation: "Menuisier (journées)",
        calcul: "surface / 30, arrondi sup.",
        unite: "jour",
        quantite: (i) => Math.max(1, Math.ceil(n(i, "surface") / 30)),
        keywords: ["menuisier"],
      },
    ],
    taches: (i) => {
      const surf = n(i, "surface");
      return [
        { nom: "Levé de la charpente", jours: Math.max(1, Math.ceil(surf / 30)) },
        { nom: "Pose de la couverture", jours: Math.max(1, Math.ceil(surf / 40)) },
        { nom: "Etanchéité, gouttières et finitions", jours: Math.max(1, Math.ceil(surf / 50)) },
      ];
    },
  },
  {
    id: "fondations-profondes",
    nom: "Fondations profondes - pieux fores (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "nb", label: "Nombre de pieux", type: "number", default: "6" },
      { id: "diametre", label: "Diametre (m)", type: "number", default: "0.6" },
      { id: "profondeur", label: "Profondeur (m)", type: "number", default: "8" },
      { id: "dosage", label: "Dosage ciment (kg/m3)", type: "number", default: "400" },
      { id: "ratio_acier", label: "Ratio acier (kg/m3)", type: "number", default: "120" },
      { id: "foisonnement", label: "Coeff. foisonnement (deblais)", type: "number", default: "1.3" },
    ],
    lignes: [
      {
        code: "PIEUX-VOL",
        designation: "Volume de beton des pieux",
        calcul: "nb x pi x (d/2)^2 x h (m3)",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur"),
        keywords: [],
      },
      {
        code: "PIEUX-BETON",
        designation: "Beton de pieu",
        calcul: "volume (m3)",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur"),
        keywords: ["béton c30/37", "béton dosé 400", "béton dosé 350"],
      },
      {
        code: "PIEUX-CIMENT",
        designation: "Ciment (sacs de 50 kg, si fabrication chantier)",
        calcul: "volume x dosage / 50",
        unite: "sac",
        quantite: (i) => {
          const v = n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur");
          return Math.ceil((v * n(i, "dosage", 400)) / 50);
        },
        keywords: ["ciment"],
      },
      {
        code: "PIEUX-SABLE",
        designation: "Sable",
        calcul: "volume x 0.4",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur") * 0.4,
        keywords: ["sable de carrière", "sable de rivière"],
      },
      {
        code: "PIEUX-GRAVIER",
        designation: "Gravier",
        calcul: "volume x 0.8",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur") * 0.8,
        keywords: ["gravier"],
      },
      {
        code: "PIEUX-ACIER",
        designation: "Acier HA des pieux",
        calcul: "volume x ratio (kg)",
        unite: "kg",
        quantite: (i) =>
          n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur") * n(i, "ratio_acier", 120),
        keywords: ["acier pour fondations", "barre ha"],
      },
      {
        code: "PIEUX-FIL",
        designation: "Fil d'attache",
        calcul: "acier x 2%",
        unite: "kg",
        quantite: (i) =>
          n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur") * n(i, "ratio_acier", 120) * 0.02,
        keywords: ["fil d'attache"],
      },
      {
        code: "PIEUX-CUVELAGE",
        designation: "Cuvelage / chemise des pieux",
        calcul: "surface laterale (m2)",
        unite: "m2",
        quantite: (i) =>
          n(i, "nb") * Math.PI * n(i, "diametre") * n(i, "profondeur"),
        keywords: ["location banche", "location simple banche"],
      },
      {
        code: "PIEUX-SPOIL",
        designation: "Deblais et évacuation (foisonné)",
        calcul: "volume x coeff. foisonnement (m3)",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur") * (n(i, "foisonnement", 1.3) || 1.3),
        keywords: ["épandage", "évacuation"],
      },
      {
        code: "PIEUX-FORAGE",
        designation: "Location engin de forage (journées)",
        calcul: "volume / 6, arrondi sup.",
        unite: "jour",
        quantite: (i) => {
          const v = n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur");
          return Math.max(1, Math.ceil(v / 6));
        },
        keywords: ["location pelle hydraulique", "location mini-pelle"],
      },
    ],
    taches: (i) => {
      const v = n(i, "nb") * Math.PI * Math.pow(n(i, "diametre") / 2, 2) * n(i, "profondeur");
      return [
        { nom: "Implantation et forage", jours: Math.max(1, Math.ceil(v / 4)) },
        { nom: "Pose armatures et bétonage", jours: Math.max(1, Math.ceil(v / 6)) },
        { nom: "Cure et contrôle", jours: 2 },
      ];
    },
  },
  {
    id: "finition-revetement-sol",
    nom: "Finition - revetement de sol (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "surface", label: "Surface (m2)", type: "number", default: "50" },
      { id: "pertes", label: "Pertes carrelage (%)", type: "number", default: "10" },
      { id: "surface_carreau", label: "Surface d'un carreau (m2)", type: "number", default: "0.04" },
      { id: "longueur_plinthes", label: "Longueur de plinthes (ml)", type: "number", default: "20" },
    ],
    lignes: [
      {
        code: "REV-CHAPE",
        designation: "Chape de ragréage (5 cm)",
        calcul: "surface x 0.05",
        unite: "m3",
        quantite: (i) => n(i, "surface") * 0.05,
        keywords: ["chape (m3)"],
      },
      {
        code: "REV-RAGREAGE",
        designation: "Ragréage de surface",
        calcul: "surface (m2)",
        unite: "m2",
        quantite: (i) => n(i, "surface"),
        keywords: ["ragreage"],
      },
      {
        code: "REV-CARREAU",
        designation: "Carreaux",
        calcul: "surface / surface_carreau x (1 + pertes)",
        unite: "u",
        quantite: (i) =>
          Math.ceil((n(i, "surface") / (n(i, "surface_carreau", 0.04) || 0.04)) * (1 + n(i, "pertes") / 100)),
        keywords: ["carreau (u)"],
      },
      {
        code: "REV-CARRELAGE-M2",
        designation: "Carrelage posé (option au m2)",
        calcul: "surface x 1.1",
        unite: "m2",
        quantite: (i) => n(i, "surface") * 1.1,
        keywords: ["carrelage (m2)"],
      },
      {
        code: "REV-COLLE",
        designation: "Colle à carrelage",
        calcul: "surface x 5 kg/m2",
        unite: "kg",
        quantite: (i) => n(i, "surface") * 5,
        keywords: ["colle a carrelage", "mortier colle"],
      },
      {
        code: "REV-JOINT",
        designation: "Joint de carrelage",
        calcul: "surface x 0.5 kg/m2",
        unite: "kg",
        quantite: (i) => n(i, "surface") * 0.5,
        keywords: [],
      },
      {
        code: "REV-PLINTHE",
        designation: "Plinthes",
        calcul: "longueur (ml)",
        unite: "ml",
        quantite: (i) => n(i, "longueur_plinthes"),
        keywords: ["plinthe"],
      },
      {
        code: "REV-CARRELEUR",
        designation: "Carreleur (journées)",
        calcul: "surface / 20, arrondi sup.",
        unite: "jour",
        quantite: (i) => Math.max(1, Math.ceil(n(i, "surface") / 20)),
        keywords: ["carreleur"],
      },
    ],
    taches: (i) => {
      const surf = n(i, "surface");
      return [
        { nom: "Chape / ragréage et séchage", jours: Math.max(1, Math.ceil(surf / 40)) + 2 },
        { nom: "Pose du revêtement", jours: Math.max(1, Math.ceil(surf / 20)) },
        { nom: "Joints, plinthes et nettoyage", jours: Math.max(1, Math.ceil(surf / 50)) },
      ];
    },
  },
  {
    id: "poteaux-beton-arme",
    nom: "Poteaux en beton arme (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "nb", label: "Nombre de poteaux", type: "number", default: "8" },
      { id: "section_a", label: "Section a (m)", type: "number", default: "0.2" },
      { id: "section_b", label: "Section b (m)", type: "number", default: "0.2" },
      { id: "hauteur", label: "Hauteur (m)", type: "number", default: "3" },
      { id: "dosage", label: "Dosage ciment (kg/m3)", type: "number", default: "350" },
      { id: "ratio_acier", label: "Ratio acier (kg/m3)", type: "number", default: "120" },
    ],
    lignes: [
      {
        code: "POT-BETON",
        designation: "Beton des poteaux",
        calcul: "nb x a x b x h (m3)",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * n(i, "section_a") * n(i, "section_b") * n(i, "hauteur"),
        keywords: ["béton c30/37", "béton dosé"],
      },
      {
        code: "POT-CIMENT",
        designation: "Ciment (sacs de 50 kg, si fabrication chantier)",
        calcul: "volume x dosage / 50",
        unite: "sac",
        quantite: (i) => {
          const v = n(i, "nb") * n(i, "section_a") * n(i, "section_b") * n(i, "hauteur");
          return Math.ceil((v * n(i, "dosage", 350)) / 50);
        },
        keywords: ["ciment"],
      },
      {
        code: "POT-SABLE",
        designation: "Sable",
        calcul: "volume x 0.4",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * n(i, "section_a") * n(i, "section_b") * n(i, "hauteur") * 0.4,
        keywords: ["sable de carrière", "sable de rivière"],
      },
      {
        code: "POT-GRAVIER",
        designation: "Gravier",
        calcul: "volume x 0.8",
        unite: "m3",
        quantite: (i) =>
          n(i, "nb") * n(i, "section_a") * n(i, "section_b") * n(i, "hauteur") * 0.8,
        keywords: ["gravier"],
      },
      {
        code: "POT-ACIER",
        designation: "Acier HA des poteaux",
        calcul: "volume x ratio (kg)",
        unite: "kg",
        quantite: (i) =>
          n(i, "nb") * n(i, "section_a") * n(i, "section_b") * n(i, "hauteur") * n(i, "ratio_acier", 120),
        keywords: ["acier pour poutres", "barre ha"],
      },
      {
        code: "POT-FIL",
        designation: "Fil d'attache",
        calcul: "acier x 2%",
        unite: "kg",
        quantite: (i) =>
          n(i, "nb") * n(i, "section_a") * n(i, "section_b") * n(i, "hauteur") * n(i, "ratio_acier", 120) * 0.02,
        keywords: ["fil d'attache"],
      },
      {
        code: "POT-COFFRAGE",
        designation: "Coffrage des poteaux (4 faces)",
        calcul: "nb x 2 x (a + b) x h (m2)",
        unite: "m2",
        quantite: (i) =>
          n(i, "nb") * 2 * (n(i, "section_a") + n(i, "section_b")) * n(i, "hauteur"),
        keywords: ["planche coffrage", "planche de coffrage", "panneau de coffrage", "location banche"],
      },
      {
        code: "POT-CLOUS",
        designation: "Clous de coffrage",
        calcul: "coffrage x 0.2 kg/m2",
        unite: "kg",
        quantite: (i) =>
          n(i, "nb") * 2 * (n(i, "section_a") + n(i, "section_b")) * n(i, "hauteur") * 0.2,
        keywords: ["clous"],
      },
      {
        code: "POT-ETAI",
        designation: "Etais de stabilisation",
        calcul: "3 étais par poteau",
        unite: "u",
        quantite: (i) => n(i, "nb") * 3,
        keywords: ["étai métallique"],
      },
      {
        code: "POT-VIBRANT",
        designation: "Location aiguille vibrante (journées)",
        calcul: "volume / 4, arrondi sup.",
        unite: "jour",
        quantite: (i) => {
          const v = n(i, "nb") * n(i, "section_a") * n(i, "section_b") * n(i, "hauteur");
          return Math.max(1, Math.ceil(v / 4));
        },
        keywords: ["aiguille vibrante"],
      },
    ],
    taches: (i) => {
      const v = n(i, "nb") * n(i, "section_a") * n(i, "section_b") * n(i, "hauteur");
      return [
        { nom: "Ferraglage des poteaux", jours: Math.max(1, Math.ceil((v * n(i, "ratio_acier", 120)) / 150)) },
        { nom: "Coffrage", jours: Math.max(1, Math.ceil(v / 1.5)) },
        { nom: "Betonage et vibration", jours: Math.max(1, Math.ceil(v / 4)) },
        { nom: "Décoffrage et cure", jours: 3 },
      ];
    },
  },
  {
    id: "poutres-chaine",
    nom: "Poutres et chainages en beton arme (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "longueur", label: "Longueur totale (ml)", type: "number", default: "40" },
      { id: "section_l", label: "Largeur (m)", type: "number", default: "0.2" },
      { id: "section_h", label: "Hauteur (m)", type: "number", default: "0.3" },
      { id: "dosage", label: "Dosage ciment (kg/m3)", type: "number", default: "350" },
      { id: "ratio_acier", label: "Ratio acier (kg/m3)", type: "number", default: "100" },
    ],
    lignes: [
      {
        code: "POUT-BETON",
        designation: "Beton des poutres / chaînages",
        calcul: "L x l x h (m3)",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "section_l") * n(i, "section_h"),
        keywords: ["poutres chaînages linteaux", "béton dosé"],
      },
      {
        code: "POUT-CIMENT",
        designation: "Ciment (sacs de 50 kg, si fabrication chantier)",
        calcul: "volume x dosage / 50",
        unite: "sac",
        quantite: (i) => {
          const v = n(i, "longueur") * n(i, "section_l") * n(i, "section_h");
          return Math.ceil((v * n(i, "dosage", 350)) / 50);
        },
        keywords: ["ciment"],
      },
      {
        code: "POUT-SABLE",
        designation: "Sable",
        calcul: "volume x 0.4",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "section_l") * n(i, "section_h") * 0.4,
        keywords: ["sable de carrière", "sable de rivière"],
      },
      {
        code: "POUT-GRAVIER",
        designation: "Gravier",
        calcul: "volume x 0.8",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "section_l") * n(i, "section_h") * 0.8,
        keywords: ["gravier"],
      },
      {
        code: "POUT-ACIER",
        designation: "Acier HA",
        calcul: "volume x ratio (kg)",
        unite: "kg",
        quantite: (i) =>
          n(i, "longueur") * n(i, "section_l") * n(i, "section_h") * n(i, "ratio_acier", 100),
        keywords: ["acier pour poutres", "barre ha"],
      },
      {
        code: "POUT-FIL",
        designation: "Fil d'attache",
        calcul: "acier x 2%",
        unite: "kg",
        quantite: (i) =>
          n(i, "longueur") * n(i, "section_l") * n(i, "section_h") * n(i, "ratio_acier", 100) * 0.02,
        keywords: ["fil d'attache"],
      },
      {
        code: "POUT-COFFRAGE",
        designation: "Coffrage",
        calcul: "L x (2 x h + l) (m2)",
        unite: "m2",
        quantite: (i) =>
          n(i, "longueur") * (2 * n(i, "section_h") + n(i, "section_l")),
        keywords: ["planche coffrage", "planche de coffrage", "panneau de coffrage"],
      },
      {
        code: "POUT-CLOUS",
        designation: "Clous de coffrage",
        calcul: "coffrage x 0.2 kg/m2",
        unite: "kg",
        quantite: (i) =>
          n(i, "longueur") * (2 * n(i, "section_h") + n(i, "section_l")) * 0.2,
        keywords: ["clous"],
      },
      {
        code: "POUT-ETAI",
        designation: "Etais de coffrage",
        calcul: "1 étai par mètre",
        unite: "u",
        quantite: (i) => Math.ceil(n(i, "longueur")),
        keywords: ["étai métallique"],
      },
      {
        code: "POUT-VIBRANT",
        designation: "Location aiguille vibrante (journées)",
        calcul: "volume / 5, arrondi sup.",
        unite: "jour",
        quantite: (i) => {
          const v = n(i, "longueur") * n(i, "section_l") * n(i, "section_h");
          return Math.max(1, Math.ceil(v / 5));
        },
        keywords: ["aiguille vibrante"],
      },
    ],
    taches: (i) => {
      const v = n(i, "longueur") * n(i, "section_l") * n(i, "section_h");
      return [
        { nom: "Coffrage et étaiement", jours: Math.max(1, Math.ceil(n(i, "longueur") / 15)) },
        { nom: "Ferraillage", jours: Math.max(1, Math.ceil((v * n(i, "ratio_acier", 100)) / 150)) },
        { nom: "Betonage et décoffrage", jours: Math.max(1, Math.ceil(v / 4)) + 2 },
      ];
    },
  },
  {
    id: "plancher-poutrelles",
    nom: "Plancher poutrelles + hourdis (detaille)",
    typeChantier: "batiment",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "10" },
      { id: "largeur", label: "Largeur (m)", type: "number", default: "5" },
      { id: "entraxe", label: "Entraxe poutrelles (m)", type: "number", default: "0.6" },
    ],
    lignes: [
      {
        code: "PLN-POUTRELLES",
        designation: "Poutrelles",
        calcul: "(largeur / entraxe + 1) x longueur (ml)",
        unite: "ml",
        quantite: (i) =>
          (Math.ceil(n(i, "largeur") / (n(i, "entraxe", 0.6) || 0.6)) + 1) * n(i, "longueur"),
        keywords: ["poutrelle h20"],
      },
      {
        code: "PLN-HOURDIS",
        designation: "Hourdis",
        calcul: "surface (m2)",
        unite: "m2",
        quantite: (i) => n(i, "longueur") * n(i, "largeur"),
        keywords: [],
      },
      {
        code: "PLN-TREILLIS",
        designation: "Treillis soudé",
        calcul: "surface x 1.1",
        unite: "m2",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * 1.1,
        keywords: ["treillis soudé"],
      },
      {
        code: "PLN-BETON",
        designation: "Beton de compression (5 cm)",
        calcul: "surface x 0.05 (m3)",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * 0.05,
        keywords: ["béton dosé", "béton c30/37"],
      },
      {
        code: "PLN-CIMENT",
        designation: "Ciment (sacs de 50 kg, si fabrication chantier)",
        calcul: "volume x 350 / 50",
        unite: "sac",
        quantite: (i) =>
          Math.ceil((n(i, "longueur") * n(i, "largeur") * 0.05 * 350) / 50),
        keywords: ["ciment"],
      },
      {
        code: "PLN-ETAI",
        designation: "Etais de soutien",
        calcul: "surface / 2 (u)",
        unite: "u",
        quantite: (i) => Math.ceil((n(i, "longueur") * n(i, "largeur")) / 2),
        keywords: ["étai métallique"],
      },
      {
        code: "PLN-VIBRANT",
        designation: "Location aiguille vibrante (journées)",
        calcul: "surface / 40, arrondi sup.",
        unite: "jour",
        quantite: (i) => Math.max(1, Math.ceil((n(i, "longueur") * n(i, "largeur")) / 40)),
        keywords: ["aiguille vibrante"],
      },
    ],
    taches: (i) => {
      const surf = n(i, "longueur") * n(i, "largeur");
      return [
        { nom: "Étaiement et pose poutrelles", jours: Math.max(1, Math.ceil(surf / 25)) },
        { nom: "Pose hourdis et treillis", jours: Math.max(1, Math.ceil(surf / 30)) },
        { nom: "Betonage de compression", jours: Math.max(1, Math.ceil(surf / 50)) },
        { nom: "Cure et dépose étais", jours: 4 },
      ];
    },
  },

  // ============================================================
  // ROUTE
  // ============================================================
  {
    id: "terrassement-route",
    nom: "Terrassement route - couche granulaire (detaille)",
    typeChantier: "route",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "100" },
      { id: "largeur", label: "Largeur (m)", type: "number", default: "7" },
      { id: "epaisseur", label: "Epaisseur (m)", type: "number", default: "0.25" },
      { id: "foisonnement", label: "Coeff. foisonnement", type: "number", default: "1.2" },
      { id: "capacite_benne", label: "Capacite benne (m3)", type: "number", default: "15" },
    ],
    lignes: [
      {
        code: "TERR-DECAPAGE",
        designation: "Décapage de la terre végétale",
        calcul: "L x l (m2)",
        unite: "m2",
        quantite: (i) => n(i, "longueur") * n(i, "largeur"),
        keywords: ["décapage à la pelle", "décapage à la pioche"],
      },
      {
        code: "TERR-VOL",
        designation: "Volume de matériau en place",
        calcul: "L x l x e (m3) - cahier des charges",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur"),
        keywords: ["latérite", "laterite", "granulat", "couche de base", "couche de fondation"],
      },
      {
        code: "TERR-FOISON",
        designation: "Volume foisonne",
        calcul: "volume x coeff. foisonnement (m3) - cahier des charges",
        unite: "m3",
        quantite: (i) =>
          n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * (n(i, "foisonnement", 1) || 1),
        keywords: [],
      },
      {
        code: "TERR-BENNES",
        designation: "Nombre de bennes",
        calcul: "volume foisonne / capacite benne, arrondi sup. - cahier des charges",
        unite: "u",
        quantite: (i) =>
          nbBennes(
            n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * (n(i, "foisonnement", 1) || 1),
            n(i, "capacite_benne", 15),
          ),
        keywords: [],
      },
      {
        code: "TERR-TRANSPORT",
        designation: "Transport du matériau",
        calcul: "nombre de bennes (voyages)",
        unite: "voyage",
        quantite: (i) =>
          nbBennes(
            n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * (n(i, "foisonnement", 1) || 1),
            n(i, "capacite_benne", 15),
          ),
        keywords: ["transport matériaux"],
      },
      {
        code: "TERR-EAU",
        designation: "Eau de compactage",
        calcul: "volume x 0.05",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * 0.05,
        keywords: ["eau (m"],
      },
      {
        code: "TERR-NIVELEUSE",
        designation: "Location niveleuse (journées)",
        calcul: "surface / 800, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "longueur") * n(i, "largeur")) / 800)),
        keywords: ["location niveleuse"],
      },
      {
        code: "TERR-CHARGEUSE",
        designation: "Location chargeuse (journées)",
        calcul: "surface / 500, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "longueur") * n(i, "largeur")) / 500)),
        keywords: ["location chargeuse"],
      },
      {
        code: "TERR-COMPACTEUR",
        designation: "Location compacteur (journées)",
        calcul: "surface / 600, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "longueur") * n(i, "largeur")) / 600)),
        keywords: ["location compacteur"],
      },
    ],
    taches: (i) => {
      const surf = n(i, "longueur") * n(i, "largeur");
      return [
        { nom: "Décapage et mise en forme", jours: Math.max(1, Math.ceil(surf / 500)) },
        { nom: "Approvisionnement et mise en place de la couche", jours: Math.max(1, Math.ceil(surf / 300)) },
        { nom: "Réglage et compactage", jours: Math.max(1, Math.ceil(surf / 400)) },
        { nom: "Contrôle et réception", jours: 1 },
      ];
    },
  },
  {
    id: "chaussee-bitume",
    nom: "Chaussee - couche de base + enrobe (detaille)",
    typeChantier: "route",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "100" },
      { id: "largeur", label: "Largeur (m)", type: "number", default: "7" },
      { id: "ep_base", label: "Epaisseur base (m)", type: "number", default: "0.25" },
      { id: "ep_roul", label: "Epaisseur roulement (m)", type: "number", default: "0.05" },
      { id: "foisonnement", label: "Coeff. foisonnement", type: "number", default: "1.2" },
      { id: "capacite_benne", label: "Capacite benne (m3)", type: "number", default: "15" },
      { id: "densite_enrobe", label: "Densite enrobe (t/m3)", type: "number", default: "2.3" },
    ],
    lignes: [
      {
        code: "CHAUSS-SURFACE",
        designation: "Surface de chaussee",
        calcul: "L x l (m2)",
        unite: "m2",
        quantite: (i) => n(i, "longueur") * n(i, "largeur"),
        keywords: [],
      },
      {
        code: "CHAUSS-DECAPAGE",
        designation: "Décapage et préparation de la plateforme",
        calcul: "L x l (m2)",
        unite: "m2",
        quantite: (i) => n(i, "longueur") * n(i, "largeur"),
        keywords: ["décapage à la pelle", "décapage à la pioche"],
      },
      {
        code: "CHAUSS-BASE-VOL",
        designation: "Volume couche de base (foisonne)",
        calcul: "L x l x e_base x coeff. foisonnement (m3)",
        unite: "m3",
        quantite: (i) =>
          n(i, "longueur") * n(i, "largeur") * n(i, "ep_base") * (n(i, "foisonnement", 1) || 1),
        keywords: ["latérite", "laterite", "couche de base", "couche de fondation", "grave bitume"],
      },
      {
        code: "CHAUSS-BENNES",
        designation: "Nombre de bennes (base)",
        calcul: "volume foisonne / capacite benne, arrondi sup. - cahier des charges",
        unite: "u",
        quantite: (i) =>
          nbBennes(
            n(i, "longueur") * n(i, "largeur") * n(i, "ep_base") * (n(i, "foisonnement", 1) || 1),
            n(i, "capacite_benne", 15),
          ),
        keywords: [],
      },
      {
        code: "CHAUSS-TRANSPORT",
        designation: "Transport de la couche de base",
        calcul: "nombre de bennes (voyages)",
        unite: "voyage",
        quantite: (i) =>
          nbBennes(
            n(i, "longueur") * n(i, "largeur") * n(i, "ep_base") * (n(i, "foisonnement", 1) || 1),
            n(i, "capacite_benne", 15),
          ),
        keywords: ["transport matériaux"],
      },
      {
        code: "CHAUSS-ENROBE",
        designation: "Enrobe de roulement (tonnes)",
        calcul: "L x l x e_roul x densite (t)",
        unite: "t",
        quantite: (i) =>
          n(i, "longueur") * n(i, "largeur") * n(i, "ep_roul") * n(i, "densite_enrobe", 2.3),
        keywords: ["enrobé bitumineux", "enrobe bitumineux", "enrobé à chaud", "asphalte"],
      },
      {
        code: "CHAUSS-ACCROCHAGE",
        designation: "Bitume d'accrochage",
        calcul: "surface x 1 kg/m2 / 1000 (tonnes)",
        unite: "t",
        quantite: (i) => (n(i, "longueur") * n(i, "largeur") * 1) / 1000,
        keywords: ["bitume 50/70", "bitume 60/70"],
      },
      {
        code: "CHAUSS-COMPACTEUR",
        designation: "Location compacteur à rouleau (journées)",
        calcul: "surface / 600, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "longueur") * n(i, "largeur")) / 600)),
        keywords: ["location compacteur"],
      },
      {
        code: "CHAUSS-NIVELEUSE",
        designation: "Location niveleuse (journées)",
        calcul: "surface / 800, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "longueur") * n(i, "largeur")) / 800)),
        keywords: ["location niveleuse"],
      },
      {
        code: "CHAUSS-MARQUAGE",
        designation: "Marquage routier (axe)",
        calcul: "longueur x 0.3 (m2)",
        unite: "m2",
        quantite: (i) => n(i, "longueur") * 0.3,
        keywords: ["marquage routier"],
      },
    ],
    taches: (i) => {
      const surf = n(i, "longueur") * n(i, "largeur");
      return [
        { nom: "Décapage et préparation de la plateforme", jours: Math.max(1, Math.ceil(surf / 800)) },
        { nom: "Mise en place couche de base", jours: Math.max(1, Math.ceil(surf / 500)) },
        { nom: "Compactage", jours: Math.max(1, Math.ceil(surf / 600)) },
        { nom: "Pose enrobé / roulement", jours: Math.max(1, Math.ceil(surf / 400)) },
        { nom: "Contrôle et réception", jours: 1 },
      ];
    },
  },
  {
    id: "assainissement-fouille",
    nom: "Assainissement - fouille, conduite et remblai (detaille)",
    typeChantier: "route",
    inputs: [
      { id: "longueur", label: "Longueur de fouille (m)", type: "number", default: "50" },
      { id: "largeur", label: "Largeur de fouille (m)", type: "number", default: "0.8" },
      { id: "profondeur", label: "Profondeur (m)", type: "number", default: "1.2" },
      { id: "foisonnement", label: "Coeff. foisonnement", type: "number", default: "1.25" },
      { id: "capacite_benne", label: "Capacite benne (m3)", type: "number", default: "10" },
      { id: "nb_regards", label: "Nombre de regards", type: "number", default: "3" },
    ],
    lignes: [
      {
        code: "ASS-TERR",
        designation: "Terrassement de la fouille",
        calcul: "L x l x h (m3)",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "profondeur"),
        keywords: ["fouilles mécaniques en tranchée", "fouilles manuelles en tranchée", "terrassement", "excavation"],
      },
      {
        code: "ASS-FOISON",
        designation: "Volume evacue (foisonne)",
        calcul: "volume x coeff. foisonnement (m3)",
        unite: "m3",
        quantite: (i) =>
          n(i, "longueur") * n(i, "largeur") * n(i, "profondeur") * (n(i, "foisonnement", 1) || 1),
        keywords: [],
      },
      {
        code: "ASS-BENNES",
        designation: "Nombre de bennes (evacuation)",
        calcul: "volume foisonne / capacite benne, arrondi sup. - cahier des charges",
        unite: "u",
        quantite: (i) =>
          nbBennes(
            n(i, "longueur") * n(i, "largeur") * n(i, "profondeur") * (n(i, "foisonnement", 1) || 1),
            n(i, "capacite_benne", 10),
          ),
        keywords: [],
      },
      {
        code: "ASS-CONDUITE",
        designation: "Conduite / canalisation",
        calcul: "longueur de fouille (ml)",
        unite: "ml",
        quantite: (i) => n(i, "longueur"),
        keywords: ["canalisation", "tube pvc"],
      },
      {
        code: "ASS-REGARDS",
        designation: "Regards",
        calcul: "nombre de regards (u)",
        unite: "u",
        quantite: (i) => n(i, "nb_regards", 3),
        keywords: ["regard béton"],
      },
      {
        code: "ASS-SABLE-LIT",
        designation: "Sable de lit de pose",
        calcul: "L x l x 0.1 (m3)",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * 0.1,
        keywords: ["sable de carrière", "sable de rivière"],
      },
      {
        code: "ASS-REMBLAI",
        designation: "Remblai de la fouille",
        calcul: "volume de fouille (m3)",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "profondeur"),
        keywords: ["remblai manuel des fouilles", "remblai de terre"],
      },
      {
        code: "ASS-DECHARGE",
        designation: "Evacuation des deblais excédentaires",
        calcul: "volume foisonne - volume remblaye (m3)",
        unite: "m3",
        quantite: (i) => {
          const v = n(i, "longueur") * n(i, "largeur") * n(i, "profondeur");
          return Math.max(v * (n(i, "foisonnement", 1) || 1) - v, 0);
        },
        keywords: ["évacuation de la terre", "épandage"],
      },
      {
        code: "ASS-COMPACTEUR",
        designation: "Compactage (location plaque vibrante, journées)",
        calcul: "longueur / 50, arrondi sup.",
        unite: "jour",
        quantite: (i) => Math.max(1, Math.ceil(n(i, "longueur") / 50)),
        keywords: ["plaque vibrante"],
      },
    ],
    taches: (i) => {
      const vol = n(i, "longueur") * n(i, "largeur") * n(i, "profondeur");
      return [
        { nom: "Ouverture de fouille", jours: Math.max(1, Math.ceil(vol / 15)) },
        { nom: "Pose canalisation et regards", jours: Math.max(1, Math.ceil(n(i, "longueur") / 10)) },
        { nom: "Remblai et compactage", jours: Math.max(1, Math.ceil(vol / 20)) },
        { nom: "Contrôle final", jours: 1 },
      ];
    },
  },
  {
    id: "remblai-apport",
    nom: "Remblai d'apport (laterite / graveleuse) (detaille)",
    typeChantier: "route",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "50" },
      { id: "largeur", label: "Largeur (m)", type: "number", default: "6" },
      { id: "epaisseur", label: "Epaisseur (m)", type: "number", default: "0.3" },
      { id: "foisonnement", label: "Coeff. foisonnement", type: "number", default: "1.2" },
      { id: "capacite_benne", label: "Capacite benne (m3)", type: "number", default: "15" },
    ],
    lignes: [
      {
        code: "REM-VOL",
        designation: "Volume en place",
        calcul: "L x l x e (m3) - cahier des charges",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur"),
        keywords: ["latérite", "laterite", "apport de terre"],
      },
      {
        code: "REM-FOISON",
        designation: "Volume foisonne",
        calcul: "volume x coeff. foisonnement (m3) - cahier des charges",
        unite: "m3",
        quantite: (i) =>
          n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * (n(i, "foisonnement", 1) || 1),
        keywords: [],
      },
      {
        code: "REM-BENNES",
        designation: "Nombre de bennes",
        calcul: "volume foisonne / capacite benne, arrondi sup. - cahier des charges",
        unite: "u",
        quantite: (i) =>
          nbBennes(
            n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * (n(i, "foisonnement", 1) || 1),
            n(i, "capacite_benne", 15),
          ),
        keywords: [],
      },
      {
        code: "REM-TRANSPORT",
        designation: "Transport du remblai",
        calcul: "nombre de bennes (voyages)",
        unite: "voyage",
        quantite: (i) =>
          nbBennes(
            n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * (n(i, "foisonnement", 1) || 1),
            n(i, "capacite_benne", 15),
          ),
        keywords: ["transport matériaux"],
      },
      {
        code: "REM-NIVELEUSE",
        designation: "Réglage - location niveleuse (journées)",
        calcul: "surface / 800, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "longueur") * n(i, "largeur")) / 800)),
        keywords: ["location niveleuse"],
      },
      {
        code: "REM-COMPACTEUR",
        designation: "Compactage - location compacteur (journées)",
        calcul: "surface / 500, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "longueur") * n(i, "largeur")) / 500)),
        keywords: ["location compacteur"],
      },
      {
        code: "REM-EAU",
        designation: "Eau de compactage",
        calcul: "volume x 0.05",
        unite: "m3",
        quantite: (i) => n(i, "longueur") * n(i, "largeur") * n(i, "epaisseur") * 0.05,
        keywords: ["eau (m"],
      },
    ],
    taches: (i) => {
      const surf = n(i, "longueur") * n(i, "largeur");
      return [
        { nom: "Préparation du fond de forme", jours: Math.max(1, Math.ceil(surf / 500)) },
        { nom: "Approvisionnement et mise en place", jours: Math.max(1, Math.ceil(surf / 300)) },
        { nom: "Réglage", jours: Math.max(1, Math.ceil(surf / 500)) },
        { nom: "Compactage et contrôle", jours: Math.max(1, Math.ceil(surf / 400)) },
      ];
    },
  },
  {
    id: "voirie-bordures-caniveaux",
    nom: "Voirie urbaine - bordures et caniveaux (detaille)",
    typeChantier: "route",
    inputs: [
      { id: "longueur_bordures", label: "Longueur de bordures (ml)", type: "number", default: "100" },
      { id: "longueur_caniveaux", label: "Longueur de caniveaux (ml)", type: "number", default: "100" },
      { id: "nb_regards", label: "Nombre de regards", type: "number", default: "4" },
    ],
    lignes: [
      {
        code: "VOI-BORDURES",
        designation: "Bordures en béton",
        calcul: "longueur (ml)",
        unite: "ml",
        quantite: (i) => n(i, "longueur_bordures"),
        keywords: ["bordure en béton"],
      },
      {
        code: "VOI-CANIVEAUX",
        designation: "Caniveaux préfabriqués",
        calcul: "longueur (ml)",
        unite: "ml",
        quantite: (i) => n(i, "longueur_caniveaux"),
        keywords: ["caniveau préfabriqué"],
      },
      {
        code: "VOI-REGARDS",
        designation: "Regards",
        calcul: "nombre (u)",
        unite: "u",
        quantite: (i) => n(i, "nb_regards", 4),
        keywords: ["regard béton"],
      },
      {
        code: "VOI-FOUILLE",
        designation: "Fouille de pose",
        calcul: "(bordures + caniveaux) x 0.4 x 0.2 (m3)",
        unite: "m3",
        quantite: (i) =>
          (n(i, "longueur_bordures") + n(i, "longueur_caniveaux")) * 0.4 * 0.2,
        keywords: ["fouilles manuelles en tranchée", "fouilles mécaniques en tranchée"],
      },
      {
        code: "VOI-CALAGE",
        designation: "Beton de calage / propreté",
        calcul: "(bordures + caniveaux) x 0.25 x 0.1 (m3)",
        unite: "m3",
        quantite: (i) =>
          (n(i, "longueur_bordures") + n(i, "longueur_caniveaux")) * 0.25 * 0.1,
        keywords: ["béton de propreté", "béton fabriqué chantier"],
      },
      {
        code: "VOI-MACON",
        designation: "Maçon (journées)",
        calcul: "(bordures + caniveaux) / 25, arrondi sup.",
        unite: "jour",
        quantite: (i) =>
          Math.max(1, Math.ceil((n(i, "longueur_bordures") + n(i, "longueur_caniveaux")) / 25)),
        keywords: ["maçon (journée)", "aide-maçon"],
      },
    ],
    taches: (i) => {
      const total = n(i, "longueur_bordures") + n(i, "longueur_caniveaux");
      return [
        { nom: "Traçage et fouilles", jours: Math.max(1, Math.ceil(total / 60)) },
        { nom: "Calage et pose", jours: Math.max(1, Math.ceil(total / 30)) },
        { nom: "Joints et finitions", jours: Math.max(1, Math.ceil(total / 80)) },
      ];
    },
  },
];
