// Suivi d'un poste pendant la saisie des quantites realisees (audit metier
// du 19/10/2026, §4 : « pour un poste deja saisi, aucune vue "total realise
// / restant" a l'ecran pendant la saisie »).
//
// Logique pure, testable : calcul du cumul d'un poste, du restant et de
// l'ecart par rapport a la quantite de marche (formule 5.1).

export type EtatPoste = {
  quantiteMarche: number;
  quantiteDejaRealisee: number;
  quantiteTotale: number;
  restant: number;
  avancementPct: number;
  ecartPct: number; // (cumul - marché) / marché x 100
  depasseSeuil: boolean;
};

function nombre(valeur: number | string | null | undefined): number {
  if (valeur === null || valeur === undefined || valeur === "") return 0;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}

/** Quantité formatee a la francaise (deux decimales au maximum). */
export function formaterQuantite(valeur: number | null | undefined): string {
  const n = nombre(valeur);
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** Decimal avec la virgule francaise : « 41,7 ». */
export function formaterDecimal(valeur: number | null | undefined): string {
  const n = nombre(valeur);
  return String(Math.round(n * 10) / 10).replace(".", ",");
}

/**
 * Etat d'un poste : cumul (realise anterieur + saisie en cours), restant,
 * avancement et ecart par rapport a la quantite de marche.
 */
export function etatPoste(
  quantiteMarche: number | string | null | undefined,
  quantiteDejaRealisee: number | string | null | undefined,
  saisieEnCours: number | string | null | undefined,
  seuilPct = 10,
): EtatPoste {
  const marche = Math.max(0, nombre(quantiteMarche));
  const deja = Math.max(0, nombre(quantiteDejaRealisee));
  const saisie = Math.max(0, nombre(saisieEnCours));
  const total = deja + saisie;

  const avancementPct = marche > 0 ? (total / marche) * 100 : 0;
  const ecartPct = marche > 0 ? ((total - marche) / marche) * 100 : 0;
  const seuil = Math.abs(nombre(seuilPct));

  return {
    quantiteMarche: marche,
    quantiteDejaRealisee: deja,
    quantiteTotale: total,
    restant: Math.max(0, marche - total),
    avancementPct,
    ecartPct,
    // Seul le dépassement du marché est signalé : une réalisation partielle
    // est normale, un cumul supérieur à la quantité de marché ne l'est pas.
    depasseSeuil: marche > 0 && ecartPct > seuil,
  };
}

/** Message lisible sous le champ de saisie d'une quantité. */
export function messageEtatPoste(
  etat: EtatPoste,
  unite: string | null | undefined,
  seuilPct = 10,
): string {
  const suffixe = String(unite ?? "").trim();
  const u = suffixe ? ` ${suffixe}` : "";

  if (etat.quantiteMarche <= 0) {
    return "Quantité de marché non renseignée pour ce poste : le cumul n'est pas comparable.";
  }

  const base = `Réalisé ${formaterQuantite(etat.quantiteTotale)}${u} sur ${formaterQuantite(
    etat.quantiteMarche,
  )}${u} — restant ${formaterQuantite(etat.restant)}${u} (${formaterDecimal(etat.avancementPct)} %)`;

  if (etat.depasseSeuil) {
    const signe = etat.ecartPct > 0 ? "+" : "";
    return `${base} — écart de ${signe}${formaterDecimal(etat.ecartPct)} % (seuil ${seuilPct} %) : à signaler.`;
  }
  return base;
}
