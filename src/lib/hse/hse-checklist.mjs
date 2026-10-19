// Check-list HSE quotidienne — Module logique
// Gère les 4 items quotidiens, le suivi des jours sans accident,
// et le taux de conformité par chantier sur la période glissante.

export type HSEItem = 
  | "epi"        // Port d'EPI
  | "echauffement" // Échauffement musculaire
  | "signalisation" // Signalisation chantier
  | "extincteur"   // Extincteur vérifié;

export type ConformiteHSE = {
  epui: boolean;
  echauffement: boolean;
  signalisation: boolean;
  extincteur: boolean;
};

/** État HSE par chantier et par jour (stocké en base ou en IndexedDB). */
export type EtatHSE = {
  chantierId: string;
  date: string; // format ISO YYYY-MM-DD ou JJ/MM/AAAA
  conformite: ConformiteHSE;
 ajemméPar: string; // id de l'utilisateur qui a saisi
  commentaire?: string;
};

/** Tableau des 4 items quotidiens avec leur libellé FR/EN */
export const LIBELLES_HSE: Record<HSEItem, { fr: string; en: string }> = {
  epi: { fr: "Port d'EPI", en: "PPE" },
  echauffement: { fr: "Échauffement musculaire", en: "Warm-up" },
  signalisation: { fr: "Signalisation chantier", en: "Site signage" },
  extincteur: { fr: "Extincteur vérifié", en: "Fire extinguisher checked" },
};

/** Retourne les 4 items HSE sous forme d'options de formulaire (label + checked). */
export function initialeConformite(horsLigne: boolean = false): ConformiteHSE {
  const base: ConformiteHSE = {
    epui: horsLigne ? false : true, // par défaut coché si on est en ligne
    echauffement: horsLigne ? false : true,
    signalisation: horsLigne ? false : true,
    extincteur: horsLigne ? false : true,
  };
  return base;
}

/** Calcule le taux de conformité HSE sur une série d'états. */
function tauxConformiteHSE(etats: EtatHSE[]): number {
  if (!etats.length) return 0;
  let totalCases = 0;
  let casesConformes = 0;
  for (const e of etats) {
    const conformite = e.conformite;
    totalCases += 4; // 4 items par état
    casesConformes += Object.values(conformite).filter(v => v).length;
  }
  return Math.round((casesConformes / totalCases) * 100);
}

/** Retourne le texte "Jours sans accident" à partir de la dernière date conformité. */
function joursSansAccident(etats: EtatHSE[]): string {
  if (!etats.length) return "Aucune donnée";
  // On trie par date décroissante et on prend le premier état conforme à tout les items
  const copie = [...etats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const e of copie) {
    const tousOk = Object.values(e.conformite).every(v => v);
    if (tousOk) {
      const today = new Date();
      const diffDays = Math.ceil((today.getTime() - new Date(e.date).getTime()) / (1000 * 3600 * 24));
      return diffDays <= 0 ? "Aujourd'hui" : `${diffDays} jour${diffDays > 1 ? "s" : ""} sans accident`;
    }
  }
  return "Dernier état non conforme";
}

/** Exporte les données HSE au format JSON prêt à être envoyé au backend ou stocké en IndexedDB. */
function exportHSEJSON(etats: EtatHSE[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    count: etats.length,
    conformiteMoyenne: tauxConformiteHSE(etats),
    joursSansAccident: joursSansAccident(etats),
    etats,
  });
}

export { LIBELLES_HSE, initialeConformite, tauxConformiteHSE, joursSansAccident, exportHSEJSON };