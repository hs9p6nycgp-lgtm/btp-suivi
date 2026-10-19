// Export CSV (séparateur point-virgule, lisible dans Excel en français).
//
// Module pur : la mise en forme est testable sans navigateur.

/** Échappe une valeur : guillemets, séparateur et retours à la ligne. */
function echapper(valeur: unknown): string {
  const texte = valeur === null || valeur === undefined ? "" : String(valeur);
  if (texte.includes('"') || texte.includes(";") || texte.includes("\n") || texte.includes("\r")) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

/**
 * Construit un fichier CSV : marqueur d'ordre des octets (pour les accents
 * dans Excel), séparateur point-virgule, fins de ligne CRLF.
 */
export function versCsv(entetes: string[], lignes: unknown[][]): string {
  const toutes = [entetes, ...lignes].map((ligne) => ligne.map(echapper).join(";"));
  return "﻿" + toutes.join("\r\n") + "\r\n";
}

/** Nom de fichier horodaté (ex. « alertes-2026-10-19.csv »). */
export function nomFichierCsv(prefixe: string, date: Date = new Date()): string {
  const jour = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return `${prefixe}-${jour}.csv`;
}
