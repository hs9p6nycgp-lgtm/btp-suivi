// Alimentation du DQE d'un chantier a partir des lignes d'un devis
// (audit metier du 19/10/2026, §3 : « on ressaisit les quantites a la main
// dans le DQE »). Logique pure, testable.
//
// Le DQE (postes_dqe) porte : chantier, code, designation, unite,
// quantite de marche et prix unitaire. On reprend les lignes du devis qui
// ont une quantite et un prix ; les postes deja presents (meme designation
// et meme unite) ne sont pas recrees.

export type LigneDevisSource = {
  designation: string;
  unite: string;
  quantite: number;
  prix_unitaire: number;
};

export type PosteDqeExistant = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  quantite_marche?: number | null;
  prix_unitaire?: number | null;
};

export type LigneAEcrire = {
  code: string;
  designation: string;
  unite: string;
  quantite_marche: number;
  prix_unitaire: number;
};

export type ResultatPreparationDqe = {
  aEcrire: LigneAEcrire[];
  dejaPresents: string[];
  sansPrix: string[];
  sansQuantite: string[];
};

/** Comparaison de libelles insensible a la casse, aux accents et aux espaces. */
export function normaliserLibelle(valeur: string | null | undefined): string {
  return String(valeur ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cle d'identification d'un poste : designation + unite. */
export function clePoste(designation: string, unite: string): string {
  return `${normaliserLibelle(designation)}|${normaliserLibelle(unite)}`;
}

/** Prochain code libre pour le DQE (DQE-01, DQE-02...). */
export function codePosteLibre(
  codesExistants: (string | null | undefined)[],
  prefixe = "DQE",
): string {
  // Seuls les codes du même préfixe sont pris en compte (les codes importés
  // d'un Excel, comme « A1 », ne doivent pas décaler la numérotation).
  const motif = new RegExp(`^${prefixe}-?(\\d+)$`, "i");
  let max = 0;
  for (const code of codesExistants ?? []) {
    const trouve = motif.exec(String(code ?? "").trim());
    if (trouve) max = Math.max(max, Number(trouve[1]));
  }
  return `${prefixe}-${String(max + 1).padStart(2, "0")}`;
}

/**
 * Compare les lignes du devis aux postes existants du DQE et prépare
 * les lignes à créer (sans jamais écraser une donnée existante).
 */
export function preparerPostesDqe(
  lignes: LigneDevisSource[],
  existants: PosteDqeExistant[],
  prefixe = "DQE",
): ResultatPreparationDqe {
  const clesExistantes = new Set(
    (existants ?? []).map((p) => clePoste(p.designation, p.unite)),
  );
  const codes = (existants ?? []).map((p) => p.code);

  const aEcrire: LigneAEcrire[] = [];
  const dejaPresents: string[] = [];
  const sansPrix: string[] = [];
  const sansQuantite: string[] = [];

  for (const ligne of lignes ?? []) {
    const designation = String(ligne.designation ?? "").trim();
    if (!designation) continue;
    const quantite = Number(ligne.quantite) || 0;
    const prix = Number(ligne.prix_unitaire) || 0;

    if (quantite <= 0) {
      sansQuantite.push(designation);
      continue;
    }
    if (prix <= 0) {
      sansPrix.push(designation);
      continue;
    }
    if (clesExistantes.has(clePoste(designation, ligne.unite))) {
      dejaPresents.push(designation);
      continue;
    }

    aEcrire.push({
      code: codePosteLibre(codes, prefixe),
      designation,
      unite: String(ligne.unite ?? "").trim(),
      quantite_marche: quantite,
      prix_unitaire: Math.round(prix),
    });
    codes.push(aEcrire[aEcrire.length - 1].code);
  }

  return { aEcrire, dejaPresents, sansPrix, sansQuantite };
}
