// Regles metier du referentiel de prix (section 4.12, exigences REF-01 a REF-09).

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

export type EntreeHistorique = {
  referentiel_prix_id: string;
  ancien_prix: number;
  nouveau_prix: number;
  auteur: string | null;
  motif: string | null;
};

/** REF-09 (priorite C) : un prix est obsolete s'il n'a pas ete mis a jour depuis plus de `seuilMois` mois. */
export function estPrixObsolete(
  dateSource: string | null,
  reference: Date = new Date(),
  seuilMois: number = 6,
): boolean {
  if (!dateSource) return true;
  const d = new Date(`${dateSource}T00:00:00`);
  if (Number.isNaN(d.getTime())) return true;
  const limite = new Date(reference);
  limite.setMonth(limite.getMonth() - seuilMois);
  return d < limite;
}

/** REF-03 : construit l'entree d'historique lors d'un changement de prix. Renvoie null si le prix n'a pas change. */
export function construireEntreeHistorique(
  prixId: string,
  ancienPrix: number,
  nouveauPrix: number,
  auteur: string | null,
  motif: string | null,
): EntreeHistorique | null {
  if (ancienPrix === nouveauPrix) return null;
  return {
    referentiel_prix_id: prixId,
    ancien_prix: ancienPrix,
    nouveau_prix: nouveauPrix,
    auteur,
    motif,
  };
}

/** REF-06 : lignes d'un DQE / BPU affectees par la mise a jour d'un prix (par code ou designation). */
export type LigneAffectee = { id: string; code: string | null; designation: string };

export function lignesAffecteesParMiseAJour(
  prixCode: string | null,
  prixDesignation: string,
  lignes: LigneAffectee[],
): LigneAffectee[] {
  const codeNorm = (prixCode ?? "").trim().toLowerCase();
  const desigNorm = prixDesignation.trim().toLowerCase();
  return lignes.filter((l) => {
    const lc = (l.code ?? "").trim().toLowerCase();
    const ld = l.designation.trim().toLowerCase();
    if (codeNorm && lc && lc === codeNorm) return true;
    return ld === desigNorm;
  });
}

/** REF-05 (S) : exporte le referentiel en CSV (separateur point-virgule, UTF-8). */
export function exporterReferentielCSV(lignes: LigneReferentiel[]): string {
  if (lignes.length === 0) {
    return "";
  }
  const entete = "code;designation;categorie;unite;prix_unitaire;source;date_source;date_validite;statut;zone";
  const lignesCsv = lignes.map((l) =>
    [
      l.code ?? "",
      l.designation,
      l.categorie ?? "",
      l.unite,
      String(l.prix_unitaire),
      l.source ?? "",
      l.date_source ?? "",
      l.date_validite ?? "",
      l.statut,
      l.zone ?? "",
    ].join(";"),
  );
  return [entete, ...lignesCsv].join("\n");
}

// --- REF-05 (S) : import Excel / CSV ---
// L'interface lit le fichier (xlsx pour Excel, le CSV est aussi lu par xlsx),
// puis transmet ici des lignes brutes { colonne: valeur }. Ce module valide,
// normalise et prepare les ecritures en base.

export type LigneImportReferentiel = {
  code: string | null;
  designation: string;
  categorie: string | null;
  unite: string;
  prix_unitaire: number;
  source: string;
  date_source: string;
  date_validite: string | null;
  statut: "valide" | "a_verifier";
  zone: string | null;
};

export type RejetImport = { ligne: number; raison: string };

export type ResultatAnalyseImport = {
  lignes: LigneImportReferentiel[];
  rejets: RejetImport[];
};

export type MajImport = { id: string; ancienPrix: number; ligne: LigneImportReferentiel };

export type ApplicationImport = {
  aInserer: LigneImportReferentiel[];
  aMettreAJour: MajImport[];
  inchanges: number;
};

/** Normalise un nom de colonne : minuscules, sans accents ni espaces superflus. */
function normaliserColonne(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** REF-05 : trouve la colonne correspondant a l'un des mots-cles (correspondance exacte d'abord, puis « contient »). */
export function trouverColonneImport(headers: string[], motsCles: string[]): string | null {
  const norm = headers.map(normaliserColonne);
  for (const mot of motsCles) {
    const m = normaliserColonne(mot);
    const exact = norm.indexOf(m);
    if (exact >= 0) return headers[exact];
  }
  for (const mot of motsCles) {
    const m = normaliserColonne(mot);
    const idx = norm.findIndex((h) => h.includes(m));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function formaterISO(annee: number, mois: number, jour: number): string | null {
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${annee}-${p(mois)}-${p(jour)}`;
}

function isoDepuisObjetDate(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null;
  const minuitUTC = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (minuitUTC) return formaterISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return formaterISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** REF-05 : convertit une date de fichier (texte JJ/MM/AAAA ou AAAA-MM-JJ, nombre Excel, date) en AAAA-MM-JJ. Renvoie null si illisible. */
export function normaliserDate(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null;
  if (valeur instanceof Date) return isoDepuisObjetDate(valeur);
  if (typeof valeur === "number" && Number.isFinite(valeur)) {
    // Numero de serie Excel : 1 = 01/01/1900, 25569 = 01/01/1970.
    if (valeur <= 0 || valeur > 2958465) return null;
    const d = new Date(Math.round((valeur - 25569) * 86400000));
    if (Number.isNaN(d.getTime())) return null;
    return formaterISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const texte = String(valeur).trim();
  if (!texte) return null;
  let m = texte.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return formaterISO(Number(m[1]), Number(m[2]), Number(m[3]));
  m = texte.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let annee = Number(m[3]);
    if (annee < 100) annee += 2000;
    return formaterISO(annee, Number(m[2]), Number(m[1]));
  }
  return null;
}

function nettoyerSeparateurs(texte: string): string {
  const aPoint = texte.includes(".");
  const aVirgule = texte.includes(",");
  if (aPoint && aVirgule) {
    // Le dernier separateur saisi est la decimale.
    if (texte.lastIndexOf(",") > texte.lastIndexOf(".")) {
      return texte.replace(/\./g, "").replace(",", ".");
    }
    return texte.replace(/,/g, "");
  }
  if (aVirgule) {
    if (/^\d{1,3}(,\d{3})+$/.test(texte)) return texte.replace(/,/g, "");
    return texte.replace(/,/g, ".");
  }
  if (aPoint && /^\d{1,3}(\.\d{3})+$/.test(texte)) return texte.replace(/\./g, "");
  return texte;
}

/** REF-05 : convertit une valeur de prix en nombre (gere « 4 500 », « 2,800 », « 1.450 »). */
export function nombreDepuis(valeur: unknown): number {
  if (typeof valeur === "number") return valeur;
  const texte = String(valeur ?? "").replace(/[\s\u00A0]/g, "");
  if (!texte) return NaN;
  return Number(nettoyerSeparateurs(texte));
}

/** REF-05 : analyse les lignes d'un fichier Excel / CSV et renvoie les lignes valides + les rejets expliques. */
export function analyserImportReferentiel(lignes: Record<string, unknown>[]): ResultatAnalyseImport {
  if (lignes.length === 0) {
    return { lignes: [], rejets: [{ ligne: 0, raison: "Fichier vide ou aucune ligne de donnees." }] };
  }
  const headers = Object.keys(lignes[0]);
  const colCode = trouverColonneImport(headers, ["code"]);
  const colDesignation = trouverColonneImport(headers, ["designation", "ouvrage", "poste"]);
  const colCategorie = trouverColonneImport(headers, ["categorie", "famille"]);
  const colUnite = trouverColonneImport(headers, ["unite", "u."]);
  const colPrix = trouverColonneImport(headers, ["prix_unitaire", "prix unitaire", "prix", "pu"]);
  const colSource = trouverColonneImport(headers, ["source", "fournisseur", "origine"]);
  const colDateValidite = trouverColonneImport(headers, ["date_validite", "validite", "expiration"]);
  let colDateSource = trouverColonneImport(headers, ["date_source", "date source", "mise a jour", "date maj", "maj"]);
  if (!colDateSource) {
    colDateSource = headers.find((h) => normaliserColonne(h).includes("date") && h !== colDateValidite) ?? null;
  }
  const colStatut = trouverColonneImport(headers, ["statut", "status", "etat"]);
  const colZone = trouverColonneImport(headers, ["zone", "ville", "localisation"]);

  const rejets: RejetImport[] = [];
  if (!colDesignation) rejets.push({ ligne: 1, raison: "Colonne « Désignation » introuvable dans le fichier." });
  if (!colUnite) rejets.push({ ligne: 1, raison: "Colonne « Unité » introuvable dans le fichier." });
  if (!colPrix) rejets.push({ ligne: 1, raison: "Colonne « Prix unitaire » introuvable dans le fichier." });
  if (rejets.length > 0) return { lignes: [], rejets };

  const valides: LigneImportReferentiel[] = [];
  lignes.forEach((brute, i) => {
    const numero = i + 2; // ligne du fichier (la ligne 1 est l'entete)
    const designation = String(brute[colDesignation as string] ?? "").trim();
    const unite = String(brute[colUnite as string] ?? "").trim();
    const prix = nombreDepuis(brute[colPrix as string]);

    if (!designation) {
      rejets.push({ ligne: numero, raison: "Désignation manquante." });
      return;
    }
    if (!unite) {
      rejets.push({ ligne: numero, raison: "Unité manquante." });
      return;
    }
    if (!Number.isFinite(prix) || prix < 0) {
      rejets.push({ ligne: numero, raison: "Prix unitaire invalide." });
      return;
    }

    const source = colSource ? String(brute[colSource] ?? "").trim() : "";
    const dateSource = colDateSource ? normaliserDate(brute[colDateSource]) : null;
    if (!source || !dateSource) {
      rejets.push({ ligne: numero, raison: "Source ou date manquante (un prix importé doit avoir une source et une date)." });
      return;
    }

    const valeurValidite = colDateValidite ? brute[colDateValidite] : "";
    const aValeurValidite = valeurValidite !== "" && valeurValidite !== null && valeurValidite !== undefined;
    const dateValidite = aValeurValidite ? normaliserDate(valeurValidite) : null;
    if (aValeurValidite && !dateValidite) {
      rejets.push({ ligne: numero, raison: "Date de validité invalide." });
      return;
    }

    const statutBrut = colStatut ? normaliserColonne(String(brute[colStatut] ?? "")) : "";
    const statut: "valide" | "a_verifier" = statutBrut.includes("valide")
      ? "valide"
      : statutBrut
        ? "a_verifier"
        : "valide";

    valides.push({
      code: colCode ? String(brute[colCode] ?? "").trim() || null : null,
      designation,
      categorie: colCategorie ? String(brute[colCategorie] ?? "").trim() || null : null,
      unite,
      prix_unitaire: Math.round(prix),
      source,
      date_source: dateSource,
      date_validite: dateValidite,
      statut,
      zone: colZone ? String(brute[colZone] ?? "").trim() || null : null,
    });
  });

  return { lignes: valides, rejets };
}

function memeContenu(existant: LigneReferentiel, ligne: LigneImportReferentiel): boolean {
  return (
    (existant.code ?? "") === (ligne.code ?? "") &&
    existant.designation === ligne.designation &&
    (existant.categorie ?? "") === (ligne.categorie ?? "") &&
    existant.unite === ligne.unite &&
    existant.prix_unitaire === ligne.prix_unitaire &&
    (existant.source ?? "") === ligne.source &&
    (existant.date_source ?? "") === ligne.date_source &&
    (existant.date_validite ?? "") === (ligne.date_validite ?? "") &&
    existant.statut === ligne.statut &&
    (existant.zone ?? "") === (ligne.zone ?? "")
  );
}

/** REF-05 : repartit les lignes importees en creations / mises a jour / lignes identiques, par code puis par designation. */
export function preparerApplicationImport(
  existants: LigneReferentiel[],
  lignes: LigneImportReferentiel[],
): ApplicationImport {
  const parCode = new Map<string, LigneReferentiel>();
  const parDesignation = new Map<string, LigneReferentiel>();
  for (const e of existants) {
    if (e.code) parCode.set(e.code.trim().toLowerCase(), e);
    parDesignation.set(e.designation.trim().toLowerCase(), e);
  }
  const aInserer: LigneImportReferentiel[] = [];
  const aMettreAJour: MajImport[] = [];
  let inchanges = 0;
  for (const ligne of lignes) {
    const existant =
      (ligne.code ? parCode.get(ligne.code.trim().toLowerCase()) : undefined) ??
      parDesignation.get(ligne.designation.trim().toLowerCase());
    if (!existant) {
      aInserer.push(ligne);
      continue;
    }
    if (memeContenu(existant, ligne)) {
      inchanges += 1;
      continue;
    }
    aMettreAJour.push({ id: existant.id, ancienPrix: existant.prix_unitaire, ligne });
  }
  return { aInserer, aMettreAJour, inchanges };
}