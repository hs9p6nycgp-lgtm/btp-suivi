// Evaluation des fournisseurs (FOU-06) et documents administratifs
// (FOU-07 : attestation fiscale, assurance, agrement, avec date d'echeance
// et alerte 30 jours avant).
//
// Module pur : calculs et regles testables sans base de donnees.

export type EvaluationFournisseur = {
  id: string;
  fournisseur_id: string;
  respect_delais: number | null;
  conformite_livraisons: number | null;
  ecarts_prix: number | null;
  note_globale: number | null;
  commentaire: string | null;
  date_evaluation: string;
};

export type DocumentFournisseur = {
  id: string;
  fournisseur_id: string;
  type: "attestation_fiscale" | "assurance" | "agrement" | "autre";
  libelle: string;
  date_echeance: string | null;
  chemin: string | null;
};

export const LIBELLES_DOCUMENT: Record<DocumentFournisseur["type"], { fr: string; en: string }> = {
  attestation_fiscale: { fr: "Attestation fiscale", en: "Tax certificate" },
  assurance: { fr: "Assurance", en: "Insurance" },
  agrement: { fr: "Agrément", en: "Approval" },
  autre: { fr: "Autre document", en: "Other document" },
};

/** Note globale d'une evaluation : moyenne des trois criteres, sur 5. */
export function noteGlobale(evaluation: {
  respect_delais: number | null;
  conformite_livraisons: number | null;
  ecarts_prix: number | null;
}): number | null {
  const criteres = [evaluation.respect_delais, evaluation.conformite_livraisons, evaluation.ecarts_prix]
    .map((c) => (c === null || c === undefined ? null : Number(c)))
    .filter((c): c is number => c !== null && Number.isFinite(c));
  if (criteres.length === 0) return null;
  const moyenne = criteres.reduce((total, c) => total + c, 0) / criteres.length;
  return Math.round(moyenne * 100) / 100;
}

export type NiveauFournisseur = "excellent" | "bon" | "moyen" | "a_surveiller";

/** Niveau d'un fournisseur d'apres la moyenne de ses evaluations. */
export function classerFournisseur(noteMoyenne: number | null): NiveauFournisseur | null {
  if (noteMoyenne === null) return null;
  if (noteMoyenne >= 4.5) return "excellent";
  if (noteMoyenne >= 3.5) return "bon";
  if (noteMoyenne >= 2.5) return "moyen";
  return "a_surveiller";
}

export const LIBELLES_NIVEAU: Record<NiveauFournisseur, { fr: string; en: string }> = {
  excellent: { fr: "Excellent", en: "Excellent" },
  bon: { fr: "Bon", en: "Good" },
  moyen: { fr: "Moyen", en: "Average" },
  a_surveiller: { fr: "À surveiller", en: "To watch" },
};

/** Note moyenne d'un fournisseur sur toutes ses evaluations. */
export function noteMoyenneFournisseur(evaluations: EvaluationFournisseur[]): number | null {
  const notes = evaluations
    .map((e) => (e.note_globale !== null && e.note_globale !== undefined ? Number(e.note_globale) : noteGlobale(e)))
    .filter((n): n is number => n !== null && Number.isFinite(n));
  if (notes.length === 0) return null;
  return Math.round((notes.reduce((t, n) => t + n, 0) / notes.length) * 100) / 100;
}

/** Jours restants avant une date d'echeance (negatif si depassee). */
export function joursRestants(echeance: string | null, reference: Date = new Date()): number | null {
  if (!echeance) return null;
  const d = new Date(`${echeance}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - ref.getTime()) / 86400000);
}

export type AlerteDocument = {
  id: string;
  libelle: string;
  type: DocumentFournisseur["type"];
  dateEcheance: string | null;
  joursRestants: number | null;
  niveau: "expire" | "bientot" | "ok";
  message: string;
};

/**
 * FOU-07 : alerte sur les documents administratifs dont l'echeance approche
 * (30 jours par defaut) ou est depassee.
 */
export function alertesDocuments(
  documents: DocumentFournisseur[],
  reference: Date = new Date(),
  joursAvantAlerte = 30,
): AlerteDocument[] {
  const alertes: AlerteDocument[] = [];
  for (const doc of documents) {
    const reste = joursRestants(doc.date_echeance, reference);
    const niveau: AlerteDocument["niveau"] =
      reste === null ? "ok" : reste < 0 ? "expire" : reste <= joursAvantAlerte ? "bientot" : "ok";
    if (niveau === "ok") continue;
    alertes.push({
      id: doc.id,
      libelle: doc.libelle,
      type: doc.type,
      dateEcheance: doc.date_echeance,
      joursRestants: reste,
      niveau,
      message:
        niveau === "expire"
          ? `Document expiré le ${doc.date_echeance}`
          : `Document à renouveler dans ${reste} jour(s) (échéance ${doc.date_echeance})`,
    });
  }
  return alertes.sort((a, b) => (a.joursRestants ?? 0) - (b.joursRestants ?? 0));
}

export type StatutLivraison = {
  fournisseur: string;
  nombre: number;
  quantite: number;
  derniereLivraison: string | null;
};

/**
 * FOU-05 : historique des livraisons par fournisseur (lien avec APP-01) —
 * nombre de livraisons, quantité cumulee et date de la derniere.
 */
export function historiqueLivraisons(
  livraisons: Array<{ fournisseur: string | null; quantite: number | null; date_livraison: string | null }>,
): StatutLivraison[] {
  const parFournisseur = new Map<string, StatutLivraison>();
  for (const l of livraisons) {
    const nom = String(l.fournisseur ?? "").trim();
    if (!nom) continue;
    const entree = parFournisseur.get(nom) ?? { fournisseur: nom, nombre: 0, quantite: 0, derniereLivraison: null };
    entree.nombre += 1;
    entree.quantite += Number(l.quantite) || 0;
    if (l.date_livraison && (!entree.derniereLivraison || l.date_livraison > entree.derniereLivraison)) {
      entree.derniereLivraison = l.date_livraison;
    }
    parFournisseur.set(nom, entree);
  }
  return [...parFournisseur.values()].sort((a, b) => b.nombre - a.nombre);
}
