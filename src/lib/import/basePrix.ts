import * as XLSX from "xlsx";

// Utilitaires d'import du fichier Base_prix_CI_v2.xlsx (REF-05).
// Lit toutes les feuilles d'un classeur et ignore la ligne d'en-tete.

const headerKeywords = {
  code: ["code"],
  designation: ["designation", "désignation", "ouvrage", "poste", "libelle", "libellé"],
  unite: ["unite", "unité", "u."],
  prix: ["prix", "pu", "unitaire"],
  source: ["source"],
  dateSource: ["date_source", "date source"],
  dateValidite: ["date_validite", "date validite", "validite"],
  statut: ["statut"],
  categorie: ["categorie", "catégorie"],
  zone: ["zone"],
};

export type BasePrixRow = {
  code: string | null;
  designation: string;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  date_validite: string | null;
  statut: "valide" | "a_verifier";
  categorie: string | null;
  zone: string | null;
};

function findColumnIndex(headers: unknown[], keywords: string[]): number {
  const lower = headers.map((h) => String(h ?? "").toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function excelSerialToDate(serial: number): string {
  // Excel serial date -> ISO JJ/MM/AAAA converti au format YYYY-MM-DD
  const utc = (serial - 25569) * 86400 * 1000;
  const d = new Date(utc);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    try {
      return excelSerialToDate(v);
    } catch {
      return null;
    }
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  return null;
}

type WorkbookLike = { SheetNames: string[]; Sheets: Record<string, XLSX.WorkSheet> };

export function parseBasePrixWorkbook(workbook: WorkbookLike): BasePrixRow[] {
  const rows: BasePrixRow[] = [];
  const sheets: string[] = workbook.SheetNames ?? [];

  for (const sheetName of sheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });
    // utilitaire generique : si sheet_to_json avec header disponible via XLSX
    const data = (Array.isArray(aoa) ? aoa : []) as unknown[];
    if (data.length === 0) continue;

    // Trouve la ligne d'en-tete : premiere ligne contenant un mot-clef connu
    let headerIndex = 0;
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = (data[i] ?? []) as unknown[];
      const joined = row.map((c) => String(c ?? "").toLowerCase()).join(" ");
      if (headerKeywords.designation.some((k) => joined.includes(k))) {
        headerIndex = i;
        break;
      }
    }

    const headers = (data[headerIndex] ?? []) as unknown[];
    const idx = {
      code: findColumnIndex(headers, headerKeywords.code),
      designation: findColumnIndex(headers, headerKeywords.designation),
      unite: findColumnIndex(headers, headerKeywords.unite),
      prix: findColumnIndex(headers, headerKeywords.prix),
      source: findColumnIndex(headers, headerKeywords.source),
      dateSource: findColumnIndex(headers, headerKeywords.dateSource),
      dateValidite: findColumnIndex(headers, headerKeywords.dateValidite),
      statut: findColumnIndex(headers, headerKeywords.statut),
      categorie: findColumnIndex(headers, headerKeywords.categorie),
      zone: findColumnIndex(headers, headerKeywords.zone),
    };

    if (idx.designation < 0 || idx.unite < 0 || idx.prix < 0) {
      // Feuille non compatible (pas de prix) : on l'ignore proprement.
      continue;
    }

    for (let i = headerIndex + 1; i < data.length; i++) {
      const row = (data[i] ?? []) as unknown[];
      const designation = String(row[idx.designation] ?? "").trim();
      const unite = String(row[idx.unite] ?? "").trim();
      if (!designation || !unite) continue;

      const prix = parseNumber(idx.prix >= 0 ? row[idx.prix] : 0);
      const rawStatut = idx.statut >= 0 ? String(row[idx.statut] ?? "").toLowerCase() : "";
      const statut: "valide" | "a_verifier" = rawStatut === "valide" ? "valide" : "a_verifier";

      rows.push({
        code: idx.code >= 0 ? String(row[idx.code] ?? "").trim() || null : null,
        designation,
        unite,
        prix_unitaire: Math.round(prix),
        source: idx.source >= 0 ? String(row[idx.source] ?? "").trim() || null : null,
        date_source: idx.dateSource >= 0 ? parseDate(row[idx.dateSource]) : null,
        date_validite: idx.dateValidite >= 0 ? parseDate(row[idx.dateValidite]) : null,
        statut,
        categorie: idx.categorie >= 0 ? String(row[idx.categorie] ?? "").trim() || null : null,
        zone: idx.zone >= 0 ? String(row[idx.zone] ?? "").trim() || null : null,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Règles de validation des prix (exigences REF-04 et section 16).
// Chaque prix doit porter une source et une date.
// La règle elle-même vit dans « regles.ts » (sans dépendance) pour que tous
// les chemins d'import l'utilisent ; elle est réexportée ici pour rester le
// point d'entrée historique du module.
// ---------------------------------------------------------------------------

export { validerBasePrix, type LignePrixAValider } from "./regles.ts";