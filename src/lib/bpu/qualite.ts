// Qualite de la base de prix (BPU) : doublons, ecarts de prix et
// ambiguites de devis (exigence REF-01, audit metier du 19/10/2026).
//
// Trois problemes releves sur les 289 postes :
//   1. des **doublons** (meme produit, unite equivalente) : « Ciment CPJ
//      42,5 - sac 50kg » a 4 500 et « Ciment CPJ 42,5 (sac 50 kg) » a 4 800 ;
//   2. des **ecarts de prix** sur un meme produit : l'enrobé a 35 000 et a
//      95 000 FCFA/t — 63 % d'ecart sur le poste le plus cher de la route ;
//   3. des **ambiguites de devis** : une ligne de devis trouve plusieurs
//      postes du BPU, donc le prix retenu depend de l'ordre de lecture.
//
// Ce module ne modifie aucune donnee : il signale. L'arbitrage des prix
// revient a l'utilisateur (une source datee reste la seule reference).
//
// Module pur : tout est testable sans base.

import { normaliserUnite } from "../unites.ts";

/** Une ligne de la base de prix. */
export type LigneBpu = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  statut: "valide" | "a_verifier";
};

/** Cle de comparaison d'une designation (minuscules, sans accents ni ponctuation). */
export function cleDesignation(designation: string | null | undefined): string {
  return String(designation ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    // « 50 kg » et « 50kg » sont le meme produit ; « CPJ 42 » et « CPJ42 » aussi.
    .replace(/(\d)\s+([a-z])/g, "$1$2")
    .replace(/([a-z])\s+(\d)/g, "$1$2");
}

/** Deux designations designent-elles le meme produit ? */
export function memeDesignation(a: string, b: string): boolean {
  return cleDesignation(a) === cleDesignation(b);
}

/**
 * Mots generiques de tete de designation : ils ne distinguent pas un
 * produit d'un autre (« Location camion-benne » et « Location pelleteuse »
 * sont deux produits differents). On les saute pour chercher le mot
 * reellement distinctif.
 */
const MOTS_GENERIQUES = new Set([
  "location", "louage", "fourniture", "fournitures", "transport", "reprise",
  "evacuation", "mise", "pose", "montage", "demontage", "branchement",
  "branche", "apport", "remblai", "terre", "terrassement", "travaux",
  "location", "achat", "vente", "service", "prestation", "couverture",
]);

/**
 * Cle de « famille » : le premier mot significatif de la designation
 * (« Enrobé à chaud » et « Enrobe » → « enrobe » ; « Location pelleteuse »
 * → « pelleteuse »). Elle permet de rapprocher des lignes dont la
 * designation differe legerement.
 */
export function cleFamille(designation: string | null | undefined): string {
  const mots = cleDesignation(designation).split(" ").filter(Boolean);
  for (const mot of mots.slice(0, 3)) {
    if (!MOTS_GENERIQUES.has(mot)) return mot;
  }
  return mots[0] ?? "";
}

export type GroupeDoublon = {
  /** Lignes du meme produit et de la meme unite. */
  lignes: LigneBpu[];
  /** Ecart entre le prix le plus bas et le plus haut, en %. */
  ecartPct: number;
  /** Ligne la plus complete (source + date + statut valide), a conserver. */
  ligneRetenue: LigneBpu | null;
};

/**
 * Doublons : memes produits (designation normalisee) et memes unites
 * (unite normalisee : « t » et « tonne », « m3 » et « m³ »…).
 */
export function detecterDoublons(lignes: LigneBpu[]): GroupeDoublon[] {
  const groupes = new Map<string, LigneBpu[]>();
  for (const ligne of lignes) {
    const cle = `${cleDesignation(ligne.designation)}|${normaliserUnite(ligne.unite)}`;
    if (!cleDesignation(ligne.designation)) continue;
    const liste = groupes.get(cle) ?? [];
    liste.push(ligne);
    groupes.set(cle, liste);
  }
  const resultat: GroupeDoublon[] = [];
  for (const liste of groupes.values()) {
    if (liste.length < 2) continue;
    const prix = liste.map((l) => Number(l.prix_unitaire) || 0);
    const min = Math.min(...prix);
    const max = Math.max(...prix);
    resultat.push({
      lignes: liste,
      ecartPct: min > 0 ? ((max - min) / min) * 100 : 0,
      ligneRetenue: choisirLigne(liste),
    });
  }
  return resultat.sort((a, b) => b.ecartPct - a.ecartPct || a.lignes[0].designation.localeCompare(b.lignes[0].designation, "fr"));
}

/** La ligne la plus complete : source, date, statut valide, puis code renseigne. */
function choisirLigne(lignes: LigneBpu[]): LigneBpu | null {
  if (lignes.length === 0) return null;
  return [...lignes].sort((a, b) => scoreLigne(b) - scoreLigne(a))[0];
}

function scoreLigne(ligne: LigneBpu): number {
  let score = 0;
  if (ligne.source) score += 4;
  if (ligne.date_source) score += 2;
  if (ligne.statut === "valide") score += 1;
  if (ligne.code) score += 1;
  return score;
}

export type EcartPrix = {
  designation: string;
  /** Lignes concernees (meme produit, unites eventuellement differentes). */
  lignes: LigneBpu[];
  /** Ecart entre le prix le plus bas et le plus haut, en %. */
  ecartPct: number;
  /** Prix le plus bas et le plus haut, pour arbitrage. */
  prixMin: number;
  prixMax: number;
};

/**
 * Familles de produits a verifier : memes premier mot (« enrobe ») et memes
 * unites equivalentes, dans une petite famille (au plus `maxLignes` lignes).
 *
 * Le module ne pretend pas que ces lignes sont le meme produit : il les
 * signale pour verification. L'arbitrage (et la decision de fusionner) reste
 * a l'utilisateur, seul juge de la source reelle du prix.
 */
export function detecterEcarts(lignes: LigneBpu[], seuilPct = 25, maxLignes = 4): EcartPrix[] {
  const groupes = new Map<string, LigneBpu[]>();
  for (const ligne of lignes) {
    const famille = cleFamille(ligne.designation);
    if (!famille) continue;
    // On ne compare que les lignes dont les unites sont equivalentes :
    // un prix au m2 et un prix a l'unite ne sont pas comparables.
    const cle = `${famille}|${normaliserUnite(ligne.unite)}`;
    const liste = groupes.get(cle) ?? [];
    liste.push(ligne);
    groupes.set(cle, liste);
  }
  const ecarts: EcartPrix[] = [];
  for (const liste of groupes.values()) {
    if (liste.length < 2 || liste.length > maxLignes) continue;
    const prix = liste.map((l) => Number(l.prix_unitaire) || 0);
    const min = Math.min(...prix);
    const max = Math.max(...prix);
    const ecartPct = min > 0 ? ((max - min) / min) * 100 : 0;
    if (ecartPct < seuilPct) continue;
    ecarts.push({
      designation: liste[0].designation,
      lignes: liste,
      ecartPct,
      prixMin: min,
      prixMax: max,
    });
  }
  return ecarts.sort((a, b) => b.ecartPct - a.ecartPct);
}

/**
 * Quasi-doublons : meme produit (designation normalisee identique) mais
 * unites ecrites differemment (« sac » et « sac 50 kg », « t » et
 * « tonne ») et prix tres proches. Ce sont les cas que la normalisation des
 * unites fait maintenant apparaitre.
 */
export function detecterQuasiDoublons(
  lignes: LigneBpu[],
  seuilPct = 10,
  maxLignes = 4,
): EcartPrix[] {
  const groupes = new Map<string, LigneBpu[]>();
  for (const ligne of lignes) {
    const cle = cleDesignation(ligne.designation);
    if (!cle) continue;
    const liste = groupes.get(cle) ?? [];
    liste.push(ligne);
    groupes.set(cle, liste);
  }
  const resultat: EcartPrix[] = [];
  for (const liste of groupes.values()) {
    if (liste.length < 2 || liste.length > maxLignes) continue;
    // Les unites sont ecrites differemment (« sac » et « sac 50 kg », « t »
    // et « tonne ») alors qu'elles designent la meme unite : c'est
    // l'incoherence que la normalisation revele.
    const ecritures = new Set(liste.map((l) => String(l.unite ?? "").trim().toLowerCase()));
    if (ecritures.size < 2) continue;
    const prix = liste.map((l) => Number(l.prix_unitaire) || 0);
    const min = Math.min(...prix);
    const max = Math.max(...prix);
    const ecartPct = min > 0 ? ((max - min) / min) * 100 : 0;
    if (ecartPct > seuilPct) continue;
    resultat.push({
      designation: liste[0].designation,
      lignes: liste,
      ecartPct,
      prixMin: min,
      prixMax: max,
    });
  }
  return resultat.sort((a, b) => b.lignes.length - a.lignes.length);
}

export type AmbiguiteDevis = {
  /** Identifiant du modele de devis. */
  modele: string;
  /** Code de la ligne de devis. */
  code: string;
  designation: string;
  /** Postes du BPU correspondants, avec leur prix. */
  correspondances: { designation: string; unite: string; prix: number; id: string }[];
  /** Vrai si les prix correspondants sont differents (ambiguite reelle). */
  prixConcurrents: boolean;
};

/**
 * Ambiguites : une ligne de devis (par mots-cles) trouve plusieurs postes du
 * BPU. Si les prix diffèrent, le devis ne peut pas choisir un prix de façon
 * fiable : c'est a signaler.
 */
export function detecterAmbiguitesDevis(
  modeles: { id: string; lignes: { code: string; designation: string; keywords: string[] }[] }[],
  postesBpu: LigneBpu[],
): AmbiguiteDevis[] {
  const ambiguites: AmbiguiteDevis[] = [];
  for (const modele of modeles) {
    for (const ligne of modele.lignes) {
      if (ligne.keywords.length === 0) continue;
      const correspondances = postesBpu
        .filter((p) =>
          ligne.keywords.some((k) =>
            cleDesignation(p.designation).includes(cleDesignation(k)),
          ),
        )
        .map((p) => ({
          id: p.id,
          designation: p.designation,
          unite: p.unite,
          prix: Number(p.prix_unitaire) || 0,
        }));
      if (correspondances.length < 2) continue;
      const prix = new Set(correspondances.map((c) => c.prix));
      ambiguites.push({
        modele: modele.id,
        code: ligne.code,
        designation: ligne.designation,
        correspondances,
        prixConcurrents: prix.size > 1,
      });
    }
  }
  return ambiguites;
}

/** Resume court pour l'affichage : « 3 doublons, 2 ecarts de prix a arbitrer ». */
export function resumeQualite(doublons: GroupeDoublon[], ecarts: EcartPrix[]): {
  doublons: number;
  ecarts: number;
  lignesConcernees: number;
} {
  const lignes = new Set<string>();
  for (const groupe of doublons) for (const l of groupe.lignes) lignes.add(l.id);
  for (const ecart of ecarts) for (const l of ecart.lignes) lignes.add(l.id);
  return { doublons: doublons.length, ecarts: ecarts.length, lignesConcernees: lignes.size };
}
