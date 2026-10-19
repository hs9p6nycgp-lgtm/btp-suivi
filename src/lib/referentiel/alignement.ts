// Alignement de la base de prix (BPU) et du referentiel centralise.
//
// Exigences REF-01 (referentiel unique des prix), REF-03 (historique) et
// REF-04 (chaque prix porte une source et une date).
//
// Module pur : la preparation du plan d'alignement est testable sans base.

import { construireEntreeHistorique, type EntreeHistorique } from "./prix.ts";

/** Une ligne de la base de prix (table bpu_postes). */
export type LigneBpu = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  date_validite: string | null;
  statut: "valide" | "a_verifier";
};

/** Une ligne du referentiel centralise (table referentiel_prix). */
export type LigneReferentiel = {
  id: string;
  code: string | null;
  designation: string;
  categorie: string | null;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  date_validite: string | null;
  statut: "valide" | "a_verifier";
  zone: string | null;
};

/**
 * REF-04 : un prix est complet lorsqu'il porte une source ET une date de
 * source. C'est la meme regle que celle appliquee a l'import REF-05
 * (`validerBasePrix`).
 */
export function prixComplet(ligne: { source?: string | null; date_source?: string | null }): boolean {
  return Boolean(ligne.source && String(ligne.source).trim()) && Boolean(ligne.date_source);
}

/**
 * Statut d'un prix d'apres sa source et sa date : « valide » si les deux sont
 * présents, « a_verifier » sinon (c'est la regle du cahier des charges, pas
 * une decision de l'utilisateur : le statut editorial « a_verifier » d'un
 * fichier importe est conserve).
 */
export function statutDuPrix(ligne: {
  source?: string | null;
  date_source?: string | null;
}): "valide" | "a_verifier" {
  return prixComplet(ligne) ? "valide" : "a_verifier";
}

export type PlanAlignement = {
  /** Lignes a creer dans le referentiel. */
  aCreer: LigneBpu[];
  /** Lignes a mettre a jour (cible, ancien prix pour l'historique). */
  aMettreAJour: { ligne: LigneBpu; referentielId: string; ancienPrix: number }[];
  /** Lignes deja identiques dans le referentiel. */
  inchanges: number;
  /** Lignes sans source ni date : non synchronisees (regle REF-04). */
  nonSynchronisables: LigneBpu[];
};

function memeCle(ligneBpu: LigneBpu, ligneRef: LigneReferentiel): boolean {
  const codeBpu = (ligneBpu.code ?? "").trim().toLowerCase();
  const codeRef = (ligneRef.code ?? "").trim().toLowerCase();
  if (codeBpu && codeRef) return codeBpu === codeRef;
  return (
    ligneBpu.designation.trim().toLowerCase() === ligneRef.designation.trim().toLowerCase() &&
    ligneBpu.unite.trim().toLowerCase() === ligneRef.unite.trim().toLowerCase()
  );
}

function memePrix(ligneBpu: LigneBpu, ligneRef: LigneReferentiel): boolean {
  return (
    ligneBpu.prix_unitaire === ligneRef.prix_unitaire &&
    (ligneBpu.source ?? "") === (ligneRef.source ?? "") &&
    (ligneBpu.date_source ?? "") === (ligneRef.date_source ?? "") &&
    (ligneBpu.unite ?? "") === (ligneRef.unite ?? "")
  );
}

/**
 * Prepare la synchronisation de la base de prix vers le referentiel.
 * Reconnaissance par code, puis par designation + unite (meme regle que
 * l'import REF-05). Les prix sans source ni date ne sont pas synchronises :
 * ils remontent dans la liste de travail.
 */
export function planifierAlignement(
  bpu: LigneBpu[],
  referentiel: LigneReferentiel[],
): PlanAlignement {
  const aCreer: LigneBpu[] = [];
  const aMettreAJour: { ligne: LigneBpu; referentielId: string; ancienPrix: number }[] = [];
  const nonSynchronisables: LigneBpu[] = [];
  let inchanges = 0;

  for (const ligne of bpu) {
    if (!prixComplet(ligne)) {
      nonSynchronisables.push(ligne);
      continue;
    }
    const existante = referentiel.find((r) => memeCle(ligne, r));
    if (!existante) {
      aCreer.push(ligne);
      continue;
    }
    if (memePrix(ligne, existante)) {
      inchanges += 1;
      continue;
    }
    aMettreAJour.push({ ligne, referentielId: existante.id, ancienPrix: existante.prix_unitaire });
  }

  return { aCreer, aMettreAJour, inchanges, nonSynchronisables };
}

/**
 * Entree d'historique (REF-03) pour un changement de prix : null si le prix
 * n'a pas change.
 */
export function entreeHistoriquePour(
  referentielPrixId: string,
  ancienPrix: number,
  nouveauPrix: number,
  auteur: string | null,
  motif: string | null,
): EntreeHistorique | null {
  return construireEntreeHistorique(referentielPrixId, ancienPrix, nouveauPrix, auteur, motif);
}

/**
 * Liste de travail des prix « a verifier » (les 131 postes du fichier de
 * base de prix), triee par importance : les prix les plus eleves d'abord
 * (ce sont ceux qui weighent le plus sur un devis).
 */
export function trierParPriorite(lignes: LigneBpu[]): LigneBpu[] {
  return [...lignes].sort((a, b) => {
    if (a.statut !== b.statut) return a.statut === "a_verifier" ? -1 : 1;
    if (b.prix_unitaire !== a.prix_unitaire) return b.prix_unitaire - a.prix_unitaire;
    return a.designation.localeCompare(b.designation, "fr");
  });
}

/** Raison affichee pour un prix incomplet (REG-04). */
export function raisonPrixIncomplet(ligne: { source?: string | null; date_source?: string | null }): string | null {
  if (!ligne.source || !String(ligne.source).trim()) return "Source manquante";
  if (!ligne.date_source) return "Date de source manquante";
  return null;
}
