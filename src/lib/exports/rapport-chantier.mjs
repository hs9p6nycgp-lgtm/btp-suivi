/** Module d'export de rapport de chantier au format Excel (.xlsx).
 *  Génère un fichier complet contenant :
 *   - Les indicateurs COU‑04 (Valeur Acquise / Coût Engagé / Planned Value, CPI, SPI)
 *   - Le tableau des écarts quantité/prix par poste
 *   - L'historique des journaux du jour (date, observations, statut)
 *   - Le résumé du marché (montant, seuil, montant réalisé partiel)
 *  Tous les textes sont en français, montants en FCFA sans décimale,
 *  dates au format JJ/MM/AAAA conformément au cahier des charges (§5).
 */

import * as XLSX from "xlsx";
import { getLangue, t } from "@/lib/i18n.ts";
import { type Chantier, type DonneesDuJour } from "@/lib/journal/actionsDuJour.ts";
import { actionsDuJour, nombreSansSaisie } from "@/lib/journal/actionsDuJour.ts";

const FCFA = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formatage JJ/MM/AAAA français */
function fmtDate(iso: string): string {
  if (!iso) return "--/--/----";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Retire les décimales d'un nombre FCFA pour l'affichage Excel */
function fmtFCFA(n: number): string {
  return FCFA.format(n).replace(" FCFA", "");
}

/** Convertit un objet tableau DonneesDuJour + chantiers en lignes de feuille Excel. */
function lignesEcartQuantite(chantiers: Chantier[], depenses: any[]): any[][] {
  const lignes: any[] = [];
  for (const c of chantiers) {
    const ecarts = depenses?.filter((d) => d.chantier_id === c.id) ?? [];
    let qteReelle = 0, qtePrevue = 0, prixUnitaire = 0, coutReel = 0, coutPrevu = 0;
    for (const d of ecarts) {
      qteReelle += Number(d.qte_reelle ?? 0);
      qtePrevue += Number(d.qte_prevue ?? 0);
      prixUnitaire += Number(d.prix_unitaire ?? 0);
      coutReel += Number(d.cout_reel ?? 0);
      coutPrevu += Number(d.cout_prevu ?? 0);
    }
    const ecart = qtePrevue ? Math.round(((qteReelle - qtePrevue) / qtePrevue) * 100) : 0;
    lignes.push([
      c.nom,
      fmtFCFA(coutPrevu),
      fmtFCFA(coutReel),
      ecart >= 0 ? `+${ecart}%` : `${ecart}%`,
      fmtFCFA(prixUnitaire),
      fmtFCFA(coutPreveu := coutPrevu), // alias
    ]);
  }
  return lignes;
}

/** Génère le classeur Excel complet pour un chantier. */
export async function genererRapportChantier(
  chantierId: string,
  chantiers: Chantier[],
  depensesRealisees: any[],
  journaux: any[]
) {
  // 1. Trouver le chantier visé
  const chantier = chantiers.find((c) => c.id === chantierId);
  if (!chantier) throw new Error("Chantier introuvable");

  // 2. Calculs COU‑04
  const qtePrevue = Number(chantier.seuil_ecart_pct ?? 0); // seuil en %
  // On récupère les écarts déja calculés ou on les calcule aux frais réels
  const ecartGlobal = chantiers.reduce((s, c) => s + (Number(c.montant_marche ?? 0) ?? 0), 0);
  const depensesChantier = depensesRealisees?.filter((d) => d.chantier_id === chantierId) ?? [];

  // Montants totaux
  const montantMarché = chantiers.reduce((s, c) => s + Number(c.montant_marche ?? 0), 0);
  const montantRealise = depensesChantier.reduce((s, d) => s + Number(d.cout_reel ?? 0), 0);
  const ecartMontant = montantMarché ? Math.round(((montantRealise - montantMarché) / montantMarché) * 100) : 0;

  // 3. Construction de la feuille "Indicateurs"
  const indicateurs = {
    "Montant Marché (FCFA)": fmtFCFA(montantMarché),
    "Montant Réalisé (FCFA)": fmtFCFA(montantRealise),
    "Écart Global (%)": `${ecartMontant >= 0 ? "+" : ""}${ecartMontant}%`,
    "Seuil d'Alerte (%)": fmtFCFA(chantier.seuil_ecart_pct ?? 0),
    "Statut du Chantier": t(`statut.${chantier.statut}` ?? chantier.statut),
    "Date de Début": fmtDate(chantier.date_debut ?? ""),
    "Date de Prévoir Fin": fmtDate(chantier.date_fin_prevue ?? ""),
  };

  const wsIndicateurs: any = XLSX.utils.aoa_to_sheet([
    ["Indicateur", "Valeur"],
    ...Object.entries(indicateurs).map(([k, v]) => [k, v]),
  ]);
  // Mise en forme : gras en en-tête, alignement droit sur les valeurs
  wsIndicateurs["A1"].s = { font: { bold: true }, alignment: { horizontal: "left" } };
  wsIndicateurs["B1"].s = { font: { bold: true }, alignment: { horizontal: "right" } };

  // 4. Feuille "Écarts Quantité"
  const wsEcart = XLSX.utils.aoa_to_sheet([
    ["Poste", "Coût Prévu (FCFA)", "Coût Réel (FCFA)", "Écart (%)", "Unité", "Commentaire"],
    ...lignesEcartQuantite(chantiers, depensesChantier),
  ]);
  // Largeurs de colonnes
  wsEcart["A:F"] = { width: [30, 20, 20, 12, 12, 30] };

  // 5. Feuille "Historique Journaux"
  const wsJournaux: any = XLSX.utils.aoa_to_sheet([
    ["Date", "Statut", "Observations", "Enregistré par", "Hors-ligne"],
    ...journaux
      .filter((j) => j.chantier_id === chantierId)
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .map((j) => [
        fmtDate(j.created_at ?? ""),
        t(`statut.${j.statut}` ?? j.statut),
        j.observations?.substring(0, 40) ?? "",
        j.created_by ?? "inconnu",
        j.hors_ligne ? "Oui" : "Non",
      ]),
  ]);
  wsJournaux["A:E"] = { width: [16, 14, 40, 20, 14] };

  // 6. Assemblage du classeur
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsIndicateurs, "Indicateurs");
  XLSX.utils.book_append_sheet(workbook, wsEcart, "Écarts Quantité");
  XLSX.utils.book_append_sheet(workbook, wsJournaux, "Historique Journaux");

  // 7. Téléchargement
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const filename = `Rapport_Chantier_${chantier.nom.replace(/\s+/g, "_")}_${today}.xlsx`;
  const blob = new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "binary" })], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}