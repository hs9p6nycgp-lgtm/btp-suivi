// Export Excel d'un chantier (exigence REP-03) : preparation des feuilles.
// Les regles d'ecriture du projet s'appliquent aussi aux exports :
//   - dates au format JJ/MM/AAAA ;
//   - statuts et categories translates en francais (jamais de code brut) ;
//   - montants en FCFA, entiers, sans decimale ;
//   - une ligne de total sur les feuilles de montants et de quantites.
//
// Logique pure : testable, separee de la generation du classeur (xlsx).

import { libelleCategorieDepense, libelleGravite, valorisationPostes } from "../rapport/agregats.ts";

export type LigneExport = Record<string, string | number | null>;

/** Date au format JJ/MM/AAAA (chaine vide si absente). */
export function formaterDateExport(valeur: string | null | undefined): string {
  if (!valeur) return "";
  const iso = String(valeur).slice(0, 10);
  const [annee, mois, jour] = iso.split("-");
  if (!annee || !mois || !jour) return iso;
  return `${jour}/${mois}/${annee}`;
}

/** Statut d'une tache de planning, en francais. */
export function libelleStatutTache(statut: string | null | undefined): string {
  switch (statut) {
    case "a_faire":
      return "À faire";
    case "en_cours":
      return "En cours";
    case "termine":
      return "Terminé";
    case "retarde":
      return "Retardé";
    case "annule":
      return "Annulé";
    default:
      return statut ? String(statut) : "—";
  }
}

/** Statut d'une fiche de non-conformite, en francais. */
export function libelleStatutNonConformite(statut: string | null | undefined): string {
  switch (statut) {
    case "ouverte":
      return "Ouverte";
    case "en_cours":
      return "En cours";
    case "cloturee":
      return "Clôturée";
    case "rejetee":
      return "Rejetée";
    default:
      return statut ? String(statut) : "—";
  }
}

/** Statut d'un journal de chantier, en francais. */
export function libelleStatutJournal(statut: string | null | undefined): string {
  switch (statut) {
    case "brouillon":
      return "Brouillon";
    case "valide":
      return "Validé";
    default:
      return statut ? String(statut) : "—";
  }
}

/** Oui / Non a partir d'un booleen. */
export function libelleBooleen(valeur: boolean | null | undefined): string {
  return valeur ? "Oui" : "Non";
}

/** Arrondi d'un montant au franc. */
export function montantExport(valeur: number | string | null | undefined): number {
  const n = Number(valeur ?? 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

// --- Postes du DQE (avec quantités réalisées) ------------------------------

export function lignesPostesDqeExport(
  postes: any[],
  quantites: any[],
): LigneExport[] {
  const lignes: LigneExport[] = valorisationPostes(postes, quantites).map((l) => ({
    Code: l.code ?? "",
    Désignation: l.designation,
    Unité: l.unite,
    "Qté marché": l.quantiteMarche,
    "Qté réalisée": l.quantiteRealisee,
    "Prix unitaire": montantExport(l.prixUnitaire),
    "Montant marché": montantExport(l.montantMarche),
    "Montant valorisé": montantExport(l.montantRealise),
    "Avancement %": Math.round(l.avancement * 10) / 10,
  }));
  if (lignes.length === 0) return lignes;
  lignes.push({
    Code: "",
    Désignation: "TOTAL",
    Unité: "",
    "Qté marché": null,
    "Qté réalisée": null,
    "Prix unitaire": null,
    "Montant marché": montantExport(
      lignes.reduce((s, l) => s + Number(l["Montant marché"] ?? 0), 0),
    ),
    "Montant valorisé": montantExport(
      lignes.reduce((s, l) => s + Number(l["Montant valorisé"] ?? 0), 0),
    ),
    "Avancement %": null,
  });
  return lignes;
}

// --- Quantités réalisées ---------------------------------------------------

export function lignesQuantitesExport(
  quantites: any[],
  postesParId: Map<string, { designation: string; unite: string }>,
): LigneExport[] {
  return quantites.map((q) => {
    const poste = postesParId.get(q.poste_dqe_id);
    return {
      Date: formaterDateExport(q.date_saisie),
      Poste: poste?.designation ?? "Poste supprimé",
      "Qté réalisée": Number(q.quantite) || 0,
      Unité: poste?.unite ?? "",
      "Poste DQE": q.poste_dqe_id ?? "",
    };
  });
}

// --- Dépenses réelles -------------------------------------------------------

export function lignesDepensesExport(depenses: any[]): LigneExport[] {
  const lignes: LigneExport[] = depenses.map((d) => ({
    Date: formaterDateExport(d.date_depense),
    Catégorie: libelleCategorieDepense(d.categorie),
    Désignation: d.designation ?? "",
    Quantité: Number(d.quantite) || 0,
    Unité: d.unite ?? "",
    "Prix unitaire": montantExport(d.prix_unitaire),
    "Montant total": montantExport(d.montant_total),
    Référence: d.reference ?? "",
  }));
  if (lignes.length === 0) return lignes;
  lignes.push({
    Date: "",
    Catégorie: "TOTAL",
    Désignation: "",
    Quantité: null,
    Unité: "",
    "Prix unitaire": null,
    "Montant total": montantExport(lignes.reduce((s, l) => s + Number(l["Montant total"] ?? 0), 0)),
    Référence: "",
  });
  return lignes;
}

// --- Planning ---------------------------------------------------------------

export function lignesTachesExport(taches: any[]): LigneExport[] {
  return taches.map((t) => ({
    Tâche: t.nom ?? "",
    "Durée (j)": Number(t.duree_jours) || 0,
    "Date début": formaterDateExport(t.date_prevue_debut),
    "Date fin": formaterDateExport(t.date_prevue_fin),
    "Date début réelle": formaterDateExport(t.date_reelle_debut),
    "Date fin réelle": formaterDateExport(t.date_reelle_fin),
    "Avancement %": Number(t.avancement_pct) || 0,
    Statut: libelleStatutTache(t.statut),
    Jalon: libelleBooleen(t.est_jalon),
  }));
}

// --- Découpage du chantier --------------------------------------------------

export function lignesSectionsExport(sections: any[]): LigneExport[] {
  return sections.map((s) => {
    const debut = s.pk_debut !== null && s.pk_debut !== undefined ? Number(s.pk_debut) : null;
    const fin = s.pk_fin !== null && s.pk_fin !== undefined ? Number(s.pk_fin) : null;
    const longueur = debut !== null && fin !== null && fin > debut ? fin - debut : null;
    return {
      Partie: s.nom ?? "",
      "PK début": debut !== null ? `PK ${Math.floor(debut / 1000)}+${String(debut % 1000).padStart(3, "0")}` : "",
      "PK fin": fin !== null ? `PK ${Math.floor(fin / 1000)}+${String(fin % 1000).padStart(3, "0")}` : "",
      "Longueur (m)": longueur !== null ? Math.round(longueur * 100) / 100 : "",
      Niveau: s.niveau ?? "",
      Lot: s.lot ?? "",
      "Avancement %": Number(s.avancement_pct) || 0,
    };
  });
}

// --- Journaux de chantier ---------------------------------------------------

export function lignesJournauxExport(donnees: {
  journaux: any[];
  effectifs?: any[];
  engins?: any[];
  incidents?: any[];
  photos?: any[];
}): LigneExport[] {
  const journaux = donnees.journaux ?? [];
  const effectifs = donnees.effectifs ?? [];
  const engins = donnees.engins ?? [];
  const incidents = donnees.incidents ?? [];
  const photos = donnees.photos ?? [];

  return journaux.map((j) => {
    const eff = effectifs.filter((e) => e.journal_id === j.id);
    const eng = engins.filter((e) => e.journal_id === j.id);
    const inc = incidents.filter((i) => i.journal_id === j.id);
    const pho = photos.filter((p) => p.journal_id === j.id);
    return {
      Date: formaterDateExport(j.date_journal),
      Statut: libelleStatutJournal(j.statut),
      Météo: j.meteo ?? "",
      Effectif: eff.reduce((s, e) => s + (Number(e.nombre) || 0), 0),
      "Heures de marche": Math.round(eng.reduce((s, e) => s + (Number(e.heures_marche) || 0), 0) * 100) / 100,
      "Heures prévues": Math.round(eng.reduce((s, e) => s + (Number(e.heures_prevues) || 0), 0) * 100) / 100,
      Incidents: inc.length,
      "Heures d'arrêt": Math.round(inc.reduce((s, i) => s + (Number(i.duree_heures) || 0), 0) * 100) / 100,
      Photos: pho.length,
      Observations: j.observations ?? "",
    };
  });
}

// --- Livraisons -------------------------------------------------------------

export function lignesLivraisonsExport(livraisons: any[]): LigneExport[] {
  return livraisons.map((l) => ({
    Date: formaterDateExport(l.date_livraison),
    Matériau: l.materiau ?? "",
    Fournisseur: l.fournisseur ?? "",
    "Qté commandée": Number(l.quantite_commandee) || 0,
    "Qté livrée": Number(l.quantite) || 0,
    "Qté mise en œuvre": Number(l.quantite_mise_en_oeuvre) || 0,
    "N° bon": l.numero_bon ?? "",
    Camion: l.camion ?? "",
    "Photo bon": l.photo_bon ?? "",
  }));
}

// --- Photos -----------------------------------------------------------------

export function lignesPhotosExport(photos: any[]): LigneExport[] {
  return photos.map((p) => ({
    Date: formaterDateExport(p.created_at ?? p.date_journal),
    Légende: p.legende ?? "",
    "Fichier": p.chemin ?? "",
    "Coordonnées": p.latitude !== null && p.latitude !== undefined ? `${p.latitude}, ${p.longitude}` : "",
  }));
}

// --- Qualité ----------------------------------------------------------------

export function lignesEssaisExport(essais: any[]): LigneExport[] {
  return essais.map((e) => ({
    Date: formaterDateExport(e.date_controle),
    "Type de contrôle": e.type_controle ?? "",
    "Valeur mesurée": Number(e.valeur_mesuree) || 0,
    "Valeur exigée": Number(e.valeur_exigee) || 0,
    "Tolérance +": Number(e.tolerance_pos) || 0,
    "Tolérance −": Number(e.tolerance_neg) || 0,
    Unité: e.unite ?? "",
    Conforme: libelleBooleen(e.conforme),
    Responsable: e.responsable ?? "",
    Observations: e.observations ?? "",
  }));
}

export function lignesNonConformitesExport(nonConformites: any[]): LigneExport[] {
  return nonConformites.map((n) => ({
    Description: n.description ?? "",
    Gravité: libelleGravite(n.gravite),
    Statut: libelleStatutNonConformite(n.statut),
    Responsable: n.responsable ?? "",
    "Action corrective": n.action_corrective ?? "",
    "Date création": formaterDateExport(n.created_at),
    "Date clôture": formaterDateExport(n.date_cloture),
    Échéance: formaterDateExport(n.echeance),
  }));
}

// --- Points d'avancement ----------------------------------------------------

export function lignesAvancementsExport(points: any[]): LigneExport[] {
  return points.map((p) => ({
    Date: formaterDateExport(p.date_point),
    "Avancement %": Number(p.avancement_pct) || 0,
    Commentaire: p.commentaire ?? "",
  }));
}
