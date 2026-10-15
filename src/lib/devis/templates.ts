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

export const templates: DevisTemplate[] = [
  {
    id: "mur-agglos",
    nom: "Mur en agglos",
    typeChantier: "batiment",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "10" },
      { id: "hauteur", label: "Hauteur (m)", type: "number", default: "2.8" },
      { id: "epaisseur", label: "Epaisseur (m)", type: "number", default: "0.15" },
      { id: "ouvertures", label: "Ouvertures (%)", type: "number", default: "5" },
      { id: "pertes", label: "Pertes blocs (%)", type: "number", default: "5" },
    ],
    lignes: [
      {
        code: "MUR-AGGLO",
        designation: "Agglos / blocs",
        calcul: "surface nette / 0.04 x (1 + pertes)",
        unite: "u",
        quantite: (i) => {
          const L = Number(i.longueur) || 0;
          const H = Number(i.hauteur) || 0;
          const ouv = (Number(i.ouvertures) || 0) / 100;
          const surf = L * H * (1 - ouv);
          const coeff = 1 + (Number(i.pertes) || 0) / 100;
          return Math.ceil((surf / (0.2 * 0.2)) * coeff);
        },
        keywords: ["agglo", "bloc"],
      },
      {
        code: "MUR-MORTIER",
        designation: "Mortier (ciment + sable)",
        calcul: "mortier (m3)",
        unite: "m3",
        quantite: (i) => {
          const L = Number(i.longueur) || 0;
          const H = Number(i.hauteur) || 0;
          const E = Number(i.epaisseur) || 0;
          const ouv = (Number(i.ouvertures) || 0) / 100;
          const surf = L * H * (1 - ouv);
          const nb = Math.ceil((surf / (0.2 * 0.2)) * (1 + (Number(i.pertes) || 0) / 100));
          const volMur = surf * E;
          const volBloc = nb * 0.2 * 0.2 * E;
          return Math.max(volMur - volBloc * 0.92, 0);
        },
        keywords: ["ciment"],
      },
      {
        code: "MUR-CIMENT",
        designation: "Ciment (kg)",
        calcul: "mortier x 280 kg/m3",
        unite: "kg",
        quantite: (i) => {
          const t = templates.find((x) => x.id === "mur-agglos")!;
          const m = t.lignes.find((l) => l.code === "MUR-MORTIER")!.quantite(i);
          return m * 280;
        },
        keywords: ["ciment"],
      },
      {
        code: "MUR-SABLE",
        designation: "Sable",
        calcul: "mortier x 0.8 m3",
        unite: "m3",
        quantite: (i) => {
          const t = templates.find((x) => x.id === "mur-agglos")!;
          const m = t.lignes.find((l) => l.code === "MUR-MORTIER")!.quantite(i);
          return m * 0.8;
        },
        keywords: ["sable"],
      },
      {
        code: "MUR-ENDUIT",
        designation: "Enduit",
        calcul: "surface nette (m2)",
        unite: "m2",
        quantite: (i) => {
          const L = Number(i.longueur) || 0;
          const H = Number(i.hauteur) || 0;
          const ouv = (Number(i.ouvertures) || 0) / 100;
          return L * H * (1 - ouv);
        },
        keywords: ["enduit"],
      },
    ],
    taches: (i) => {
      const surf = (Number(i.longueur) || 0) * (Number(i.hauteur) || 0) * (1 - (Number(i.ouvertures) || 0) / 100);
      return [
        { nom: "Implantation et fondations", jours: 1 },
        { nom: "Montage mur en agglos", jours: Math.max(1, Math.ceil(surf / 8)) },
        { nom: "Pose mortier / reglage", jours: Math.max(1, Math.ceil(surf / 20)) },
        { nom: "Enduit", jours: Math.max(1, Math.ceil(surf / 15)) },
        { nom: "Finition et cure", jours: Math.max(1, Math.ceil(surf / 25)) },
      ];
    },
  },
  {
    id: "dalle-beton",
    nom: "Dalle / radier en beton",
    typeChantier: "batiment",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "10" },
      { id: "largeur", label: "Largeur (m)", type: "number", default: "5" },
      { id: "epaisseur", label: "Epaisseur (m)", type: "number", default: "0.12" },
      { id: "ratio_acier", label: "Ratio acier (kg/m3)", type: "number", default: "80" },
    ],
    lignes: [
      {
        code: "DALLE-BETON",
        designation: "Beton",
        calcul: "L x l x e (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.epaisseur) || 0),
        keywords: ["beton", "béton", "concrete"],
      },
      {
        code: "DALLE-ACIER",
        designation: "Acier HA",
        calcul: "volume x ratio (kg)",
        unite: "kg",
        quantite: (i) => {
          const v = (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.epaisseur) || 0);
          return v * (Number(i.ratio_acier) || 0);
        },
        keywords: ["acier", "fer", "ha"],
      },
    ],
    taches: (i) => {
      const surf = (Number(i.longueur) || 0) * (Number(i.largeur) || 0);
      return [
        { nom: "Coffrage et ferrailage", jours: Math.max(1, Math.ceil(surf / 20)) },
        { nom: "Betonage", jours: Math.max(1, Math.ceil(surf / 40)) },
        { nom: "Cure", jours: 3 },
      ];
    },
  },
  {
    id: "terrassement-route",
    nom: "Terrassement route (couche granulaire)",
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
        code: "TERR-VOL",
        designation: "Volume en place",
        calcul: "L x l x e (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.epaisseur) || 0),
        keywords: ["laterite", "remblai", "granulat"],
      },
      {
        code: "TERR-FOISON",
        designation: "Volume foisonne",
        calcul: "volume x coeff. foisonnement (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.epaisseur) || 0) * (Number(i.foisonnement) || 1),
        keywords: ["laterite", "remblai"],
      },
      {
        code: "TERR-BENNES",
        designation: "Nombre de bennes",
        calcul: "volume foisonne / capacite benne (arrondi sup.)",
        unite: "u",
        quantite: (i) => {
          const v = (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.epaisseur) || 0) * (Number(i.foisonnement) || 1);
          const c = Number(i.capacite_benne) || 15;
          return Math.ceil(v / c);
        },
        keywords: [],
      },
    ],
    taches: (i) => {
      const surf = (Number(i.longueur) || 0) * (Number(i.largeur) || 0);
      return [
        { nom: "Decapage et mise en forme", jours: Math.max(1, Math.ceil(surf / 500)) },
        { nom: "Mise en place couche", jours: Math.max(1, Math.ceil(surf / 300)) },
        { nom: "Compactage", jours: Math.max(1, Math.ceil(surf / 400)) },
      ];
    },
  },
  {
    id: "peinture",
    nom: "Peinture interieure",
    typeChantier: "batiment",
    inputs: [
      { id: "surface", label: "Surface a peindre (m2)", type: "number", default: "100" },
      { id: "couches", label: "Nombre de couches", type: "number", default: "2" },
      { id: "rendement", label: "Rendement (m2/L)", type: "number", default: "10" },
    ],
    lignes: [
      {
        code: "PEINT-QTE",
        designation: "Peinture",
        calcul: "surface x couches / rendement (L)",
        unite: "L",
        quantite: (i) => ((Number(i.surface) || 0) * (Number(i.couches) || 1)) / (Number(i.rendement) || 10),
        keywords: ["peinture"],
      },
      {
        code: "PEINT-SURFACE",
        designation: "Surface preparee (enduit/bouche-pores)",
        calcul: "surface (m2)",
        unite: "m2",
        quantite: (i) => Number(i.surface) || 0,
        keywords: ["enduit"],
      },
    ],
    taches: (i) => [
      { nom: "Preparation supports", jours: Math.max(1, Math.ceil((Number(i.surface) || 0) / 50)) },
      { nom: "Application peinture", jours: Math.max(1, Math.ceil(((Number(i.surface) || 0) * (Number(i.couches) || 1)) / 80)) },
    ],
  },
  {
    id: "fondations-semelles",
    nom: "Fondations - semelles isolees (beton arme)",
    typeChantier: "batiment",
    inputs: [
      { id: "nb", label: "Nombre de semelles", type: "number", default: "4" },
      { id: "longueur", label: "Longueur semelle (m)", type: "number", default: "1.2" },
      { id: "largeur", label: "Largeur semelle (m)", type: "number", default: "1.2" },
      { id: "hauteur", label: "Hauteur / profondeur (m)", type: "number", default: "0.6" },
      { id: "ratio_acier", label: "Ratio acier (kg/m3)", type: "number", default: "90" },
    ],
    lignes: [
      {
        code: "FOND-BETON",
        designation: "Beton de fondation",
        calcul: "nb x L x l x h (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.nb) || 0) * (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.hauteur) || 0),
        keywords: ["beton", "béton", "concrete"],
      },
      {
        code: "FOND-ACIER",
        designation: "Acier HA",
        calcul: "volume x ratio (kg)",
        unite: "kg",
        quantite: (i) => (Number(i.nb) || 0) * (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.hauteur) || 0) * (Number(i.ratio_acier) || 0),
        keywords: ["acier", "fer", "ha"],
      },
      {
        code: "FOND-COFFRAGE",
        designation: "Coffrage",
        calcul: "surface contact (m2)",
        unite: "m2",
        quantite: (i) => (Number(i.nb) || 0) * 2 * ((Number(i.longueur) || 0) + (Number(i.largeur) || 0)) * (Number(i.hauteur) || 0),
        keywords: ["coffrage", "bois"],
      },
      {
        code: "FOND-TERRASSEMENT",
        designation: "Terrassement fouille",
        calcul: "volume + foisonnement (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.nb) || 0) * (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.hauteur) || 0) * 1.2,
        keywords: ["terrassement", "excavation"],
      },
    ],
    taches: (i) => [
      { nom: "Implantation et terrassement", jours: Math.max(1, Math.ceil(((Number(i.nb) || 0) * (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.hauteur) || 0) * 1.2) / 15)) },
      { nom: "Coffrage", jours: Math.max(1, Math.ceil(((Number(i.nb) || 0) * 2 * ((Number(i.longueur) || 0) + (Number(i.largeur) || 0)) * (Number(i.hauteur) || 0)) / 20)) },
      { nom: "Ferraillage", jours: Math.max(1, Math.ceil(((Number(i.nb) || 0) * (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.hauteur) || 0) * (Number(i.ratio_acier) || 0)) / 100)) },
      { nom: "Betonage et cure", jours: Math.max(1, Math.ceil(((Number(i.nb) || 0) * (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.hauteur) || 0)) / 6)) },
    ],
  },
  {
    id: "chaussee-bitume",
    nom: "Chaussee (couche de base + enrobe)",
    typeChantier: "route",
    inputs: [
      { id: "longueur", label: "Longueur (m)", type: "number", default: "100" },
      { id: "largeur", label: "Largeur (m)", type: "number", default: "7" },
      { id: "ep_base", label: "Epaisseur base (m)", type: "number", default: "0.25" },
      { id: "ep_roul", label: "Epaisseur roulement (m)", type: "number", default: "0.05" },
      { id: "foisonnement", label: "Coeff. foisonnement", type: "number", default: "1.2" },
      { id: "capacite_benne", label: "Capacite benne (m3)", type: "number", default: "15" },
    ],
    lignes: [
      {
        code: "CHAUSS-SURFACE",
        designation: "Surface de chaussee",
        calcul: "L x l (m2)",
        unite: "m2",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0),
        keywords: [],
      },
      {
        code: "CHAUSS-BASE-VOL",
        designation: "Volume couche de base (foisonne)",
        calcul: "L x l x e_base x coeff. foisonnement (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.ep_base) || 0) * (Number(i.foisonnement) || 1),
        keywords: ["laterite", "remblai", "granulat", "gravier"],
      },
      {
        code: "CHAUSS-ENROBE",
        designation: "Volume enrobe (roulement)",
        calcul: "L x l x e_roul (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.ep_roul) || 0),
        keywords: ["enrobe", "bitume", "asphalte"],
      },
      {
        code: "CHAUSS-BENNES",
        designation: "Nombre de bennes (base)",
        calcul: "volume foisonne / capacite benne (arrondi sup.)",
        unite: "u",
        quantite: (i) => Math.ceil(((Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.ep_base) || 0) * (Number(i.foisonnement) || 1)) / (Number(i.capacite_benne) || 15)),
        keywords: [],
      },
    ],
    taches: (i) => {
      const surf = (Number(i.longueur) || 0) * (Number(i.largeur) || 0);
      return [
        { nom: "Decapage et preparation de la plateforme", jours: Math.max(1, Math.ceil(surf / 800)) },
        { nom: "Mise en place couche de base", jours: Math.max(1, Math.ceil(surf / 500)) },
        { nom: "Compactage", jours: Math.max(1, Math.ceil(surf / 600)) },
        { nom: "Pose enrobe / roulement", jours: Math.max(1, Math.ceil(surf / 400)) },
        { nom: "Controle et reception", jours: 1 },
      ];
    },
  },
  {
    id: "charpente-toiture",
    nom: "Charpente et toiture",
    typeChantier: "batiment",
    inputs: [
      { id: "surface", label: "Surface du toit (m2)", type: "number", default: "120" },
      { id: "pente", label: "Pente (degres)", type: "number", default: "25" },
      { id: "portee", label: "Portee moyenne (m)", type: "number", default: "6" },
    ],
    lignes: [
      {
        code: "CHARP-SURFACE",
        designation: "Surface de couverture",
        calcul: "surface du toit (m2)",
        unite: "m2",
        quantite: (i) => Number(i.surface) || 0,
        keywords: ["couverture", "bac acier", "tuile", "tôle"],
      },
      {
        code: "CHARP-ETANCHE",
        designation: "Etancheite sous-toiture",
        calcul: "surface x 1.10 (m2)",
        unite: "m2",
        quantite: (i) => (Number(i.surface) || 0) * 1.1,
        keywords: ["etancheite", "membrane", "sous-toiture"],
      },
      {
        code: "CHARP-BOIS",
        designation: "Bois de charpente (chevrons/fermes)",
        calcul: "surface x 0.05 m3 (estimation)",
        unite: "m3",
        quantite: (i) => (Number(i.surface) || 0) * 0.05,
        keywords: ["bois", "charpente", "chevron"],
      },
      {
        code: "CHARP-BARDAGE",
        designation: "Bardage / planche de rive",
        calcul: "perimetre estime x 0.6 (m2)",
        unite: "m2",
        quantite: (i) => Math.sqrt(Number(i.surface) || 0) * 4 * 0.6,
        keywords: ["bardage", "bois"],
      },
    ],
    taches: (i) => {
      const surf = Number(i.surface) || 0;
      return [
        { nom: "Leve de la charpente", jours: Math.max(1, Math.ceil(surf / 30)) },
        { nom: "Pose de la couverture", jours: Math.max(1, Math.ceil(surf / 40)) },
        { nom: "Etancheite et finitions", jours: Math.max(1, Math.ceil(surf / 50)) },
      ];
    },
  },

  {
    id: "assainissement-fouille",
    nom: "Assainissement - fouille et remblai",
    typeChantier: "route",
    inputs: [
      { id: "longueur", label: "Longueur de fouille (m)", type: "number", default: "50" },
      { id: "largeur", label: "Largeur de fouille (m)", type: "number", default: "0.8" },
      { id: "profondeur", label: "Profondeur (m)", type: "number", default: "1.2" },
      { id: "foisonnement", label: "Coeff. foisonnement", type: "number", default: "1.25" },
      { id: "capacite_benne", label: "Capacite benne (m3)", type: "number", default: "10" },
    ],
    lignes: [
      {
        code: "ASS-TERR",
        designation: "Terrassement fouille",
        calcul: "L x l x h (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.profondeur) || 0),
        keywords: ["terrassement", "excavation"],
      },
      {
        code: "ASS-FOISON",
        designation: "Volume evacue (foisonne)",
        calcul: "volume x coeff. foisonnement (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.profondeur) || 0) * (Number(i.foisonnement) || 1),
        keywords: ["remblai", "laterite"],
      },
      {
        code: "ASS-BENNES",
        designation: "Nombre de bennes (evacuation)",
        calcul: "volume foisonne / capacite benne (arrondi sup.)",
        unite: "u",
        quantite: (i) => Math.ceil(((Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.profondeur) || 0) * (Number(i.foisonnement) || 1)) / (Number(i.capacite_benne) || 10)),
        keywords: [],
      },
      {
        code: "ASS-REMBLAI",
        designation: "Remblai (m3)",
        calcul: "volume de fouille (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.profondeur) || 0),
        keywords: ["remblai", "sable"],
      },
    ],
    taches: (i) => {
      const vol = (Number(i.longueur) || 0) * (Number(i.largeur) || 0) * (Number(i.profondeur) || 0);
      return [
        { nom: "Ouverture de fouille", jours: Math.max(1, Math.ceil(vol / 15)) },
        { nom: "Pose canalisation et regards", jours: Math.max(1, Math.ceil((Number(i.longueur) || 0) / 10)) },
        { nom: "Remblai et compactage", jours: Math.max(1, Math.ceil(vol / 20)) },
        { nom: "Controle final", jours: 1 },
      ];
    },
  },
  {
    id: "fondations-profondes",
    nom: "Fondations profondes (pieux fores)",
    typeChantier: "batiment",
    inputs: [
      { id: "nb", label: "Nombre de pieux", type: "number", default: "6" },
      { id: "diametre", label: "Diametre (m)", type: "number", default: "0.6" },
      { id: "profondeur", label: "Profondeur (m)", type: "number", default: "8" },
      { id: "ratio_acier", label: "Ratio acier (kg/m3)", type: "number", default: "120" },
    ],
    lignes: [
      {
        code: "PIEUX-BETON",
        designation: "Beton de pieu",
        calcul: "nb x pi x (d/2)^2 x h (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.nb) || 0) * Math.PI * Math.pow((Number(i.diametre) || 0) / 2, 2) * (Number(i.profondeur) || 0),
        keywords: ["beton", "béton", "concrete"],
      },
      {
        code: "PIEUX-ACIER",
        designation: "Acier HA pieu",
        calcul: "volume x ratio (kg)",
        unite: "kg",
        quantite: (i) => (Number(i.nb) || 0) * Math.PI * Math.pow((Number(i.diametre) || 0) / 2, 2) * (Number(i.profondeur) || 0) * (Number(i.ratio_acier) || 0),
        keywords: ["acier", "fer", "ha"],
      },
      {
        code: "PIEUX-SPOIL",
        designation: "Deblais evacuation (foisonne)",
        calcul: "volume x 1.3 (m3)",
        unite: "m3",
        quantite: (i) => (Number(i.nb) || 0) * Math.PI * Math.pow((Number(i.diametre) || 0) / 2, 2) * (Number(i.profondeur) || 0) * 1.3,
        keywords: ["terrassement", "excavation"],
      },
      {
        code: "PIEUX-COFFRAGE",
        designation: "Coffrage / cuvelage",
        calcul: "surface laterale (m2)",
        unite: "m2",
        quantite: (i) => (Number(i.nb) || 0) * Math.PI * (Number(i.diametre) || 0) * (Number(i.profondeur) || 0),
        keywords: ["coffrage", "bois"],
      },
    ],
    taches: (i) => {
      const vol = (Number(i.nb) || 0) * Math.PI * Math.pow((Number(i.diametre) || 0) / 2, 2) * (Number(i.profondeur) || 0);
      return [
        { nom: "Implantation et forage", jours: Math.max(1, Math.ceil(vol / 4)) },
        { nom: "Pose armatures et betonage", jours: Math.max(1, Math.ceil(vol / 6)) },
        { nom: "Cure et controle", jours: 2 },
      ];
    },
  },
  {
    id: "finition-revetement-sol",
    nom: "Finition - revetement sol (carrelage)",
    typeChantier: "batiment",
    inputs: [
      { id: "surface", label: "Surface (m2)", type: "number", default: "50" },
      { id: "pertes", label: "Pertes carrelage (%)", type: "number", default: "10" },
      { id: "surface_carreau", label: "Surface d'un carreau (m2)", type: "number", default: "0.04" },
    ],
    lignes: [
      {
        code: "REV-CARREAU",
        designation: "Carreaux",
        calcul: "surface / surface_carreau x (1 + pertes)",
        unite: "u",
        quantite: (i) => Math.ceil(((Number(i.surface) || 0) / (Number(i.surface_carreau) || 0.04)) * (1 + (Number(i.pertes) || 0) / 100)),
        keywords: ["carrelage", "carreau", "faience"],
      },
      {
        code: "REV-COLLE",
        designation: "Colle a carrelage",
        calcul: "surface x 5 kg/m2",
        unite: "kg",
        quantite: (i) => (Number(i.surface) || 0) * 5,
        keywords: ["colle", "mortier colle"],
      },
      {
        code: "REV-JOINT",
        designation: "Joint / enduit de finition",
        calcul: "surface x 2 kg/m2",
        unite: "kg",
        quantite: (i) => (Number(i.surface) || 0) * 2,
        keywords: ["joint", "enduit"],
      },
      {
        code: "REV-SURFACE",
        designation: "Surface preparee",
        calcul: "surface (m2)",
        unite: "m2",
        quantite: (i) => Number(i.surface) || 0,
        keywords: ["chape", "ragreage"],
      },
    ],
    taches: (i) => {
      const surf = Number(i.surface) || 0;
      return [
        { nom: "Preparation support / chape", jours: Math.max(1, Math.ceil(surf / 40)) },
        { nom: "Pose du revetement", jours: Math.max(1, Math.ceil(surf / 20)) },
        { nom: "Joints et nettoyage", jours: Math.max(1, Math.ceil(surf / 50)) },
      ];
    },
  },
];
