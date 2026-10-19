// Conditions tarifaires des fournisseurs (exigences FOU-03 et FOU-04).
//
//   FOU-03 : chaque fournisseur propose ses conditions (prix, delai,
//            conditions de paiement et de livraison) ; l'information est
//            centralisee et lisible.
//   FOU-04 : plusieurs offres sont comparees pour un meme poste ; le choix
//            retenu est **motive** et la decision est tracee.
//
// Module pur : la comparaison, le choix motive et la propagation du prix
// retenu vers la base de prix sont testables sans base de donnees.

/** Une offre de prix d'un fournisseur. */
export type OffreFournisseur = {
  id: string;
  fournisseurId: string;
  fournisseurNom: string;
  poste: string;
  unite: string | null;
  prixUnitaire: number;
  delaiLivraisonJours: number | null;
  conditions: string | null;
  dateDevis: string;
  choisi: boolean;
  motifChoix: string | null;
};

/** Resultat de la comparaison des offres d'un meme poste. */
export type ComparaisonPoste = {
  poste: string;
  unite: string | null;
  /** Offres classees par prix croissant. */
  offres: OffreFournisseur[];
  /** Offre la moins chere (a prix egal, la plus rapide). */
  meilleureOffre: OffreFournisseur | null;
  /** Offre la plus rapide. */
  offreLaPlusRapide: OffreFournisseur | null;
  /** Ecart en % entre le prix le plus bas et le plus haut. */
  ecartPourcent: number;
  /** Nombre d'offres retenables (meme unite, prix > 0). */
  offresComparables: number;
};

function normaliser(valeur: string | null | undefined): string {
  return String(valeur ?? "").trim().toLowerCase();
}

/** Deux offres ne sont comparables que si elles portent la meme unite. */
export function memesUnites(a: OffreFournisseur, b: OffreFournisseur): boolean {
  const ua = normaliser(a.unite);
  const ub = normaliser(b.unite);
  if (!ua || !ub) return true; // unite non renseignee : on ne peut pas exclure l'offre
  return ua === ub;
}

/**
 * Compare les offres d'un meme poste (FOU-04) : tri par prix croissant,
 * meilleure offre, offre la plus rapide, ecart de prix en %.
 */
export function comparerOffres(offres: OffreFournisseur[]): ComparaisonPoste {
  const retenables = offres.filter((o) => o.prixUnitaire > 0);
  const classees = [...retenables].sort((a, b) => {
    if (a.prixUnitaire !== b.prixUnitaire) return a.prixUnitaire - b.prixUnitaire;
    const da = a.delaiLivraisonJours ?? Number.MAX_SAFE_INTEGER;
    const db = b.delaiLivraisonJours ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return a.fournisseurNom.localeCompare(b.fournisseurNom, "fr");
  });
  const prixMin = classees[0]?.prixUnitaire ?? 0;
  const prixMax = classees[classees.length - 1]?.prixUnitaire ?? 0;
  const meilleure =
    classees.find((o) => o.prixUnitaire === prixMin) ??
    classees.find((o) => o.choisi) ??
    null;
  const plusRapide = [...retenables].sort((a, b) => {
    const da = a.delaiLivraisonJours ?? Number.MAX_SAFE_INTEGER;
    const db = b.delaiLivraisonJours ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  })[0] ?? null;
  const offreChoisie = retenables.find((o) => o.choisi) ?? null;

  return {
    poste: offres[0]?.poste ?? "",
    unite: offres[0]?.unite ?? null,
    offres: classees,
    meilleureOffre: offreChoisie ?? meilleure,
    offreLaPlusRapide: plusRapide,
    ecartPourcent: prixMax > 0 && prixMin > 0 ? ((prixMax - prixMin) / prixMin) * 100 : 0,
    offresComparables: retenables.length,
  };
}

/** Regroupe les offres par poste (normalisé) pour la comparaison. */
export function grouperParPoste(offres: OffreFournisseur[]): ComparaisonPoste[] {
  const groupes = new Map<string, OffreFournisseur[]>();
  for (const offre of offres) {
    const cle = normaliser(offre.poste);
    if (!cle) continue;
    const liste = groupes.get(cle) ?? [];
    liste.push(offre);
    groupes.set(cle, liste);
  }
  return [...groupes.values()]
    .map((liste) => comparerOffres(liste))
    .sort((a, b) => a.poste.localeCompare(b.poste, "fr"));
}

/**
 * FOU-04 : le choix d'une offre doit etre **motive**. Renvoie la liste des
 * offres mise a jour (l'offre choisie porte `choisi = true` et le motif, les
 * autres sont decochees) ou un message d'erreur.
 */
export function choisirOffre(
  offres: OffreFournisseur[],
  offreId: string,
  motif: string,
): { offres: OffreFournisseur[]; erreur: string | null } {
  const cible = offres.find((o) => o.id === offreId);
  if (!cible) {
    return { offres, erreur: "Offre introuvable." };
  }
  if (!motif || !motif.trim()) {
    return { offres, erreur: "Le choix d'une offre doit etre motive (FOU-04)." };
  }
  return {
    offres: offres.map((o) =>
      o.id === offreId
        ? { ...o, choisi: true, motifChoix: motif.trim() }
        : normaliser(o.poste) === normaliser(cible.poste) && o.choisi
          ? { ...o, choisi: false }
          : o,
    ),
    erreur: null,
  };
}

/**
 * Un offre est perimee lorsque la validite annoncee par le fournisseur est
 * depassee (`validite_prix_jours`).
 */
export function offrePerimee(
  dateDevis: string,
  validiteJours: number | null | undefined,
  reference: Date = new Date(),
): boolean {
  if (!validiteJours || validiteJours <= 0) return false;
  const d = new Date(`${dateDevis}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  // L'offre reste valable jusqu'a la date du devis + duree de validite.
  const fin = new Date(d);
  fin.setDate(fin.getDate() + validiteJours);
  return fin < reference;
}

/**
 * FOU-08 : demande de devis prete a envoyer au fournisseur (par e-mail ou
 * WhatsApp). Le message reprend le chantier, le poste et la quantite ; le
 * fournisseur repond ensuite en saisissant son offre dans l'application.
 */
export function messageDemandeDevis(demande: {
  fournisseur: string;
  chantier: string;
  poste: string;
  quantite: number | null;
  unite: string | null;
  delaiSouhaiteJours: number | null;
  dateReponse: string | null;
}): string {
  const lignes = [
    `Bonjour ${demande.fournisseur},`,
    "",
    `Dans le cadre du chantier « ${demande.chantier} », nous sollicitons un devis pour :`,
    `- Poste : ${demande.poste}`,
    demande.quantite !== null
      ? `- Quantité souhaitée : ${demande.quantite}${demande.unite ? ` ${demande.unite}` : ""}`
      : "- Quantité souhaitée : à préciser",
    demande.delaiSouhaiteJours !== null
      ? `- Délai souhaité : ${demande.delaiSouhaiteJours} jour(s)`
      : "- Délai souhaité : à préciser",
    demande.dateReponse
      ? `- Date de réponse souhaitée : ${demande.dateReponse}`
      : "- Date de réponse souhaitée : à préciser",
    "",
    "Merci de nous indiquer votre prix unitaire, votre délai de livraison et vos conditions de paiement.",
    "Cordialement,",
  ];
  return lignes.join("\n");
}

/** Sujet du message de demande de devis. */
export function objetDemandeDevis(chantier: string, poste: string): string {
  return `Demande de devis — ${chantier} — ${poste}`;
}

/**
 * Propagation du prix retenu vers la base de prix : la source du prix est le
 * devis du fournisseur, la date de source est la date du devis (exigence
 * REF-04 : un prix porte toujours une source et une date).
 */
export function propagationVersBasePrix(offre: OffreFournisseur): {
  source: string;
  date_source: string;
  prix_unitaire: number;
  motif: string;
} {
  return {
    source: `Devis ${offre.fournisseurNom} du ${offre.dateDevis}`,
    date_source: offre.dateDevis,
    prix_unitaire: offre.prixUnitaire,
    motif: offre.motifChoix?.trim()
      ? `Prix retenu : ${offre.motifChoix.trim()}`
      : `Prix retenu : devis ${offre.fournisseurNom}`,
  };
}
