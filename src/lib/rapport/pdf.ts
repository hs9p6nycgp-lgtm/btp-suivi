// Generation du rapport de suivi en PDF (REP-02), utilise par l'envoi
// par e-mail (REP-04).
//
// Le PDF est produit dans le navigateur : aucune donnee ne transite par un
// serveur. La bibliotheque est chargee a la demande (au moment ou
// l'utilisateur demande le PDF), elle n'alourdit pas le chargement initial.

import type { DonneesRapportEmail } from "@/lib/entreprise/parametres";
import type { ParametresEntreprise } from "@/lib/entreprise/parametres";

export type LigneValorisationPdf = {
  code: string | null;
  designation: string;
  unite: string;
  quantiteMarche: number;
  quantiteRealisee: number;
  prixUnitaire: number;
  montantRealise: number;
};

/** Nombre de lignes de valorisation tenant sur une page A4. */
export const LIGNES_PAR_PAGE = 24;

/** Nombre de pages necessaires pour une valorisation donnee. */
export function nombreDePages(nbLignes: number, lignesParPage: number = LIGNES_PAR_PAGE): number {
  if (nbLignes <= 0) return 1;
  return Math.ceil(nbLignes / lignesParPage);
}

/**
 * Formatage d'un montant en FCFA (entier, espace de milliers).
 * Les espaces fines insecables (U+202F) et insecables (U+00A0) sont
 * remplacees par une espace ordinaire : la police standard du PDF ne les
 * contient pas (elles ressortiraient vides a l'impression).
 */
export function fcfa(valeur: number): string {
  return `${Math.round(valeur || 0).toLocaleString("fr-FR").replace(/[\u202F\u00A0]/g, " ")} FCFA`;
}

/** Remplace les espaces insecables par une espace ordinaire (PDF). */
export function textePdf(valeur: string): string {
  return String(valeur ?? "").replace(/[\u202F\u00A0]/g, " ");
}

/** Dimensions d'une image (data URL) en millimetres, ratio conserve. */
async function dimensionsLogo(dataUrl: string, largeurMax: number, hauteurMax: number): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const ratio = image.naturalHeight / image.naturalWidth || 0.5;
      let w = largeurMax;
      let h = w * ratio;
      if (h > hauteurMax) {
        h = hauteurMax;
        w = h / ratio;
      }
      resolve({ w, h });
    };
    image.onerror = () => resolve({ w: 0, h: 0 });
    image.src = dataUrl;
  });
}

/**
 * Produit le rapport de suivi en PDF : en-tete de l'entreprise (logo et
 * coordonnees), chiffres cles, valorisation des travaux par poste et
 * pagination.
 */
export async function genererPdfRapport(
  donnees: DonneesRapportEmail,
  entreprise: ParametresEntreprise | null,
  logoDataUrl: string | null,
  valorisation: LigneValorisationPdf[],
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const largeur = doc.internal.pageSize.getWidth();
  const hauteur = doc.internal.pageSize.getHeight();
  const marge = 15;
  const largeurUtile = largeur - marge * 2;

  // --- En-tete de l'entreprise ---
  let y = 14;
  let titreY = y;
  if (logoDataUrl) {
    const dim = await dimensionsLogo(logoDataUrl, 45, 22);
    if (dim.w > 0) {
      doc.addImage(logoDataUrl, "PNG", marge, y, dim.w, dim.h);
      y = titreY;
    }
  }
  const texteEntreprise = [
    entreprise?.nom || "BTP Suivi Pro",
    [entreprise?.sigle, entreprise?.adresse, entreprise?.ville, entreprise?.telephone, entreprise?.email]
      .filter(Boolean)
      .join(" · "),
    [entreprise?.nif ? `NIF ${entreprise.nif}` : null, entreprise?.rccm ? `RCCM ${entreprise.rccm}` : null]
      .filter(Boolean)
      .join(" · "),
  ].filter(Boolean);
  texteEntreprise.forEach((ligne, i) => {
    doc.setFontSize(i === 0 ? 12 : 8);
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setTextColor(i === 0 ? 17 : 110, i === 0 ? 24 : 110, i === 0 ? 39 : 110);
    doc.text(textePdf(ligne), marge + (logoDataUrl ? 50 : 0), 16 + i * 4.5);
  });
  doc.setDrawColor(200);
  doc.setLineWidth(0.4);
  doc.line(marge, 32, largeur - marge, 32);

  // --- Titre et periode ---
  y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text("Rapport de suivi de chantier", marge, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(textePdf(`${donnees.chantier} — période du ${donnees.debut} au ${donnees.fin}`), marge, y);
  y += 5;
  doc.text(textePdf(donnees.delai), marge, y);
  y += 8;

  // --- Chiffres cles ---
  const cartes = [
    ["Avancement physique", textePdf(`${(Math.round(donnees.avancement * 10) / 10).toLocaleString("fr-FR")} %`)],
    ["Montant du marché", fcfa(donnees.montantMarche)],
    ["Valorisation des travaux", fcfa(donnees.valorisation)],
    ["Dépenses réelles", fcfa(donnees.depenses)],
    ["Marge", fcfa(donnees.marge)],
    ["Journaux saisis", String(donnees.nbJournaux)],
    ["Non-conformités ouvertes", String(donnees.nonConformitesOuvertes)],
    ["Taux de conformité des essais", textePdf(`${(Math.round(donnees.tauxConformite * 10) / 10).toLocaleString("fr-FR")} %`)],
  ];
  const largeurCarte = largeurUtile / 4 - 3;
  cartes.forEach(([libelle, valeur], i) => {
    const colonne = i % 4;
    const ligne = Math.floor(i / 4);
    const x = marge + colonne * (largeurCarte + 4);
    const yCarte = y + ligne * 18;
    doc.setDrawColor(220);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, yCarte, largeurCarte, 15, 1.5, 1.5, "FD");
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text(textePdf(String(libelle)), x + 3, yCarte + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text(textePdf(String(valeur)), x + 3, yCarte + 11);
  });
  y += 2 * 18 + 4;

  // --- Valorisation par poste ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text("Valorisation des travaux par poste", marge, y);
  y += 5;

  const colonnes = [
    { titre: "Code", largeur: 16, align: "left" as const },
    { titre: "Désignation", largeur: 70, align: "left" as const },
    { titre: "Qté marché", largeur: 19, align: "right" as const },
    { titre: "Qté réalisée", largeur: 19, align: "right" as const },
    { titre: "P.U.", largeur: 22, align: "right" as const },
    { titre: "Montant", largeur: 30, align: "right" as const },
  ];

  const enTeteTableau = () => {
    doc.setFillColor(243, 244, 246);
    doc.rect(marge, y - 4, largeurUtile, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    let x = marge + 2;
    for (const colonne of colonnes) {
      doc.text(textePdf(colonne.titre), colonne.align === "right" ? x + colonne.largeur - 2 : x, y);
      x += colonne.largeur;
    }
    y += 7;
  };

  enTeteTableau();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let ligneCourante = 0;
  for (const ligne of valorisation) {
    if (ligneCourante >= LIGNES_PAR_PAGE) {
      doc.addPage();
      y = 20;
      enTeteTableau();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      ligneCourante = 0;
    }
    doc.setTextColor(55, 65, 81);
    let x = marge + 2;
    const valeurs = [
      ligne.code ?? "",
      ligne.designation.length > 44 ? `${ligne.designation.slice(0, 43)}…` : ligne.designation,
      textePdf(ligne.quantiteMarche.toLocaleString("fr-FR")),
      textePdf(ligne.quantiteRealisee.toLocaleString("fr-FR")),
      fcfa(ligne.prixUnitaire).replace(" FCFA", ""),
      fcfa(ligne.montantRealise).replace(" FCFA", ""),
    ];
    valeurs.forEach((valeur, i) => {
      const colonne = colonnes[i];
      doc.text(textePdf(valeur), colonne.align === "right" ? x + colonne.largeur - 2 : x, y);
      x += colonne.largeur;
    });
    doc.setDrawColor(235);
    doc.line(marge, y + 1.5, largeur - marge, y + 1.5);
    y += 6;
    ligneCourante += 1;
  }

  // --- Pied de page sur chaque page ---
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      textePdf(`${entreprise?.nom || "BTP Suivi Pro"} — Rapport de suivi du ${donnees.debut} au ${donnees.fin}`),
      marge,
      hauteur - 8,
    );
    doc.text(`Page ${p} / ${pages}`, largeur - marge, hauteur - 8, { align: "right" });
  }

  return doc.output("blob");
}
