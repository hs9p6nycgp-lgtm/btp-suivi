// Check-list HSE quotidienne (exigence HSE-02) : port d'EPI, echauffement
// muscular, signalisation du chantier, extincteur verifie.
//
// Quatre points verifies chaque matin, un etat par jour et par chantier.
// Le taux de conformite et le nombre de jours sans accident en sont tires.
//
// Module pur : les calculs sont testables sans base de donnees.

export const ITEMS_CHECKLIST = ["epi", "echauffement", "signalisation", "extincteur"] as const;

export type ItemChecklist = (typeof ITEMS_CHECKLIST)[number];

export const LIBELLES_CHECKLIST: Record<ItemChecklist, { fr: string; en: string; aide: string }> = {
  epi: {
    fr: "Port d'EPI",
    en: "PPE worn",
    aide: "Casque, chaussures de securite, gilet, lunettes : EVERYONE sur le chantier",
  },
  echauffement: {
    fr: "Echauffement muscular",
    en: "Warm-up",
    aide: "Echauffement avant port de charge (5 minutes)",
  },
  signalisation: {
    fr: "Signalisation du chantier",
    en: "Site signage",
    aide: "Panneaux, cones, balisage : conformes et en place",
  },
  extincteur: {
    fr: "Extincteur verifie",
    en: "Fire extinguisher checked",
    aide: "Presence, pression et date de verification",
  },
};

/** Etat de la check-list d'une journee. */
export type EtatChecklist = {
  chantier_id: string;
  date: string;
  epi: boolean;
  echauffement: boolean;
  signalisation: boolean;
  extincteur: boolean;
  commentaire: string | null;
  saisi_par: string | null;
};

export type TauxConformiteChecklist = {
  /** Nombre de cases verifiees sur la periode (4 par jour). */
  cases: number;
  /** Nombre de cases conformes. */
  casesConformes: number;
  /** Taux de conformite en %. */
  taux: number;
  /** Nombre de jours ou les 4 points etaient conformes. */
  joursConformes: number;
  /** Nombre de jours enregistres. */
  joursEnregistres: number;
};

/** Tous les points sont-ils conformes pour cet etat ? */
export function etatCompletementConforme(etat: EtatChecklist): boolean {
  return ITEMS_CHECKLIST.every((item) => Boolean(etat[item]));
}

/** Taux de conformite des check-lists d'une periode. */
export function tauxConformiteChecklist(etats: EtatChecklist[]): TauxConformiteChecklist {
  let cases = 0;
  let casesConformes = 0;
  let joursConformes = 0;
  for (const etat of etats) {
    cases += ITEMS_CHECKLIST.length;
    for (const item of ITEMS_CHECKLIST) {
      if (etat[item]) casesConformes += 1;
    }
    if (etatCompletementConforme(etat)) joursConformes += 1;
  }
  return {
    cases,
    casesConformes,
    taux: cases > 0 ? Math.round((casesConformes / cases) * 100) : 0,
    joursConformes,
    joursEnregistres: etats.length,
  };
}

/**
 * Nombre de jours consecutifs sans accident : on compte les jours depuis le
 * dernier etat Recorded, en remontant tant que la check-list est complete.
 * (Le nombre de jours sans accident au sens HSE vient des declarations
 * d'incidents ; ici on mesure la discipline de la check-list quotidienne.)
 */
export function joursChecklistComplete(etats: EtatChecklist[], reference: Date = new Date()): number {
  const parDate = new Map<string, EtatChecklist>();
  for (const etat of etats) parDate.set(etat.date, etat);
  let jours = 0;
  const curseur = new Date(reference);
  curseur.setHours(0, 0, 0, 0);
  for (let i = 0; i < 400; i++) {
    const cle = curseur.toISOString().slice(0, 10);
    const etat = parDate.get(cle);
    if (!etat || !etatCompletementConforme(etat)) break;
    jours += 1;
    curseur.setDate(curseur.getDate() - 1);
  }
  return jours;
}

/** Un point reste-t-il a verifier sur la journee en cours ? */
export function pointsRestants(etat: EtatChecklist | null): ItemChecklist[] {
  if (!etat) return [...ITEMS_CHECKLIST];
  return ITEMS_CHECKLIST.filter((item) => !etat[item]);
}

/** Libelle court de l'etat d'une journee, pour l'affichage. */
export function libelleEtatChecklist(etat: EtatChecklist | null): string {
  if (!etat) return "Aucune check-list enregistrée aujourd'hui";
  const manquants = pointsRestants(etat);
  if (manquants.length === 0) return "Check-list complète (4/4)";
  return `${manquants.length} point(s) à vérifier : ${manquants
    .map((m) => LIBELLES_CHECKLIST[m].fr)
    .join(", ")}`;
}
