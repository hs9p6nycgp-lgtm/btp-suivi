// Parametres de l'entreprise et envoi des rapports par e-mail.
//
//   REP-04 : envoi des rapports aux destinataires choisis.
//   REP-05 : rapport personnalise avec le logo et les coordonnees de
//             l'entreprise.
//
// Module pur : la preparation du message et des destinataires est testable
// sans service de messagerie ni base de donnees.

/** Coordonnees de l'entreprise, utilisees en tete des documents. */
export type ParametresEntreprise = {
  id?: string;
  nom: string;
  sigle: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  nif: string | null;
  rccm: string | null;
  /** Chemin du logo dans le stockage (bucket « chantiers-documents »). */
  logo: string | null;
  /** Destinataires par defaut des rapports (adresses e-mail). */
  destinataires: string[];
};

/** Expression reguliere simple pour verifier une adresse e-mail. */
export function estEmailValide(adresse: string | null | undefined): boolean {
  const a = String(adresse ?? "").trim();
  if (!a) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a);
}

/**
 * Transforme une saisie libre (« a@b.fr, c@d.fr ») en liste d'adresses
 * valides, sans doublon. Les adresses invalides sont ignorees.
 */
export function parseDestinataires(saisie: string | null | undefined): string[] {
  const vus = new Set<string>();
  for (const partie of String(saisie ?? "").split(/[,;\s]+/)) {
    const adresse = partie.trim().toLowerCase();
    if (estEmailValide(adresse)) vus.add(adresse);
  }
  return [...vus];
}

/** Message d'erreur lisible quand aucune adresse n'est exploitable. */
export function erreurDestinataires(destinataires: string[]): string | null {
  if (destinataires.length === 0) {
    return "Aucune adresse e-mail valide : indiquez au moins un destinataire (ex. : responsable@entreprise.ci).";
  }
  return null;
}

export type DonneesRapportEmail = {
  chantier: string;
  debut: string;
  fin: string;
  avancement: number;
  montantMarche: number;
  valorisation: number;
  depenses: number;
  marge: number;
  nbJournaux: number;
  nonConformitesOuvertes: number;
  /** null quand aucun essai n'a ete realise : le taux n'est pas applicable. */
  tauxConformite: number | null;
  delai: string;
};

/** Objet du message : « Rapport de suivi — Chantier X (du 01/10 au 31/10) ». */
export function objetRapport(donnees: DonneesRapportEmail): string {
  return `Rapport de suivi — ${donnees.chantier} (${donnees.debut} au ${donnees.fin})`;
}

function nombreFr(valeur: number): string {
  return Math.round(valeur).toLocaleString("fr-FR");
}

function pourcent(valeur: number): string {
  return `${(Math.round(valeur * 10) / 10).toLocaleString("fr-FR")} %`;
}

/** Taux de conformite : « non applicable » quand aucun essai n'a ete fait. */
export function libelleTauxConformite(valeur: number | null): string {
  return valeur === null ? "non applicable (aucun essai réalisé)" : pourcent(valeur);
}

/**
 * Corps du message, en texte simple : les chiffres cles du rapport, lisibles
 * dans n'importe quel client de messagerie.
 */
export function corpsRapport(donnees: DonneesRapportEmail): string {
  const lignes = [
    `Chantier : ${donnees.chantier}`,
    `Période : du ${donnees.debut} au ${donnees.fin}`,
    "",
    `Avancement physique : ${pourcent(donnees.avancement)}`,
    `Montant du marché : ${nombreFr(donnees.montantMarche)} FCFA`,
    `Valorisation des travaux : ${nombreFr(donnees.valorisation)} FCFA`,
    `Dépenses réelles : ${nombreFr(donnees.depenses)} FCFA`,
    `Marge (valorisation - dépenses) : ${nombreFr(donnees.marge)} FCFA`,
    "",
    `Journaux saisis : ${donnees.nbJournaux}`,
    `Non-conformités ouvertes : ${donnees.nonConformitesOuvertes}`,
    `Taux de conformité des essais : ${libelleTauxConformite(donnees.tauxConformite)}`,
    `Situation par rapport aux délais : ${donnees.delai}`,
    "",
    "Le détail complet est joint au présent message.",
  ];
  return lignes.join("\n");
}

/** Lien « mailto: » de secours (aucun partage de fichier possible). */
export function lienMailto(destinataires: string[], objet: string, corps: string): string {
  return `mailto:${destinataires.join(",")}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
}

/**
 * Nom du fichier de rapport : « rapport_chantier_2026-10-01_2026-10-31.html ».
 */
export function nomFichierRapport(donnees: DonneesRapportEmail): string {
  const chantier = donnees.chantier
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return `rapport_${chantier || "chantier"}_${donnees.debut}_${donnees.fin}.html`;
}

/**
 * Document HTML autonome du rapport (le fichier joint au message) : il
 * contient le logo de l'entreprise en image integrates, les chiffres cles et
 * le detail de la valorisation. Aucune ressource externe : le fichier s'ouvre
 * partout, meme hors connexion.
 */
export function htmlRapport(
  donnees: DonneesRapportEmail,
  entreprise: ParametresEntreprise | null,
  logoDataUrl: string | null,
  valorisation: Array<{ code: string | null; designation: string; quantiteMarche: number; quantiteRealisee: number; montantRealise: number }>,
): string {
  const logo = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="" style="max-height:64px;max-width:220px" />`
    : "";
  const entete = `<div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #e5e7eb;padding-bottom:12px;margin-bottom:18px">
      ${logo}
      <div>
        <div style="font-size:16px;font-weight:700">${entreprise?.nom ?? "BTP Suivi Pro"}</div>
        <div style="font-size:12px;color:#4b5563">${[entreprise?.sigle, entreprise?.adresse, entreprise?.ville, entreprise?.telephone, entreprise?.email]
          .filter(Boolean)
          .join(" · ")}</div>
      </div>
    </div>`;

  const cartes = [
    ["Avancement physique", pourcent(donnees.avancement)],
    ["Montant du marché", `${nombreFr(donnees.montantMarche)} FCFA`],
    ["Valorisation des travaux", `${nombreFr(donnees.valorisation)} FCFA`],
    ["Dépenses réelles", `${nombreFr(donnees.depenses)} FCFA`],
    ["Marge", `${nombreFr(donnees.marge)} FCFA`],
    ["Journaux", String(donnees.nbJournaux)],
    ["Non-conformités ouvertes", String(donnees.nonConformitesOuvertes)],
    ["Taux de conformité", libelleTauxConformite(donnees.tauxConformite)],
  ]
    .map(
      ([libelle, valeur]) =>
        `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px"><div style="font-size:11px;color:#6b7280">${libelle}</div><div style="font-size:14px;font-weight:700">${valeur}</div></div>`,
    )
    .join("");

  const lignesValorisation = valorisation
    .map(
      (l) =>
        `<tr><td>${l.code ?? ""}</td><td>${l.designation}</td><td style="text-align:right">${nombreFr(l.quantiteMarche)}</td><td style="text-align:right">${nombreFr(l.quantiteRealisee)}</td><td style="text-align:right">${nombreFr(l.montantRealise)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" />
<title>Rapport de suivi — ${donnees.chantier}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color:#111827; margin:28px; font-size:13px; }
  h1 { font-size:18px; margin:0 0 4px; }
  h2 { font-size:14px; margin:22px 0 8px; }
  .periode { color:#6b7280; font-size:12px; }
  .cartes { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  table { width:100%; border-collapse:collapse; margin-top:6px; }
  th, td { border-bottom:1px solid #e5e7eb; padding:5px 6px; text-align:left; font-size:12px; }
  th { background:#f9fafb; font-weight:600; }
  footer { margin-top:26px; padding-top:10px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:11px; }
</style></head>
<body>
${entete}
<h1>Rapport de suivi — ${donnees.chantier}</h1>
<div class="periode">Période du ${donnees.debut} au ${donnees.fin} · ${donnees.delai}</div>
<h2>Synthèse</h2>
<div class="cartes">${cartes}</div>
<h2>Valorisation des travaux par poste</h2>
<table>
  <thead><tr><th>Code</th><th>Désignation</th><th style="text-align:right">Qté marché</th><th style="text-align:right">Qté réalisée</th><th style="text-align:right">Montant (FCFA)</th></tr></thead>
  <tbody>${lignesValorisation}</tbody>
</table>
<footer>${entreprise?.nom ?? "BTP Suivi Pro"}${entreprise?.nif ? ` · NIF ${entreprise.nif}` : ""}${entreprise?.rccm ? ` · RCCM ${entreprise.rccm}` : ""} — Rapport généré par BTP Suivi Pro</footer>
</body></html>`;
}
