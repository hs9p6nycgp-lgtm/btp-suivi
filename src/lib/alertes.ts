// Libellés lisibles pour les alertes (table `alertes`).
//
// La base stocke des valeurs techniques : type = "quantite", "budget"...,
// statut = "ouverte", "acquittee", "cloturee". Les écrans doivent afficher
// des phrases françaises (ou anglaises), jamais les valeurs brutes.

export type LangueAlerte = "fr" | "en";

const LIBELLES_TYPE: Record<string, Record<LangueAlerte, string>> = {
  quantite: { fr: "Écart de quantité", en: "Quantity difference" },
  ecart_quantite: { fr: "Écart de quantité", en: "Quantity difference" },
  budget: { fr: "Dépassement de budget", en: "Budget overrun" },
  delai: { fr: "Retard de planning", en: "Schedule delay" },
  stock: { fr: "Stock bas", en: "Low stock" },
  qualite: { fr: "Non-conformité qualité", en: "Quality non-conformity" },
  hse: { fr: "Alerte sécurité (HSE)", en: "Safety alert (HSE)" },
  eprouvette: { fr: "Échéance éprouvette béton", en: "Concrete sample due" },
  prix: { fr: "Prix à mettre à jour", en: "Price to update" },
};

const LIBELLES_STATUT: Record<string, Record<LangueAlerte, string>> = {
  ouverte: { fr: "Ouverte", en: "Open" },
  acquittee: { fr: "Acquittée", en: "Acknowledged" },
  cloturee: { fr: "Clôturée", en: "Closed" },
};

function texteDeSecours(valeur: string): string {
  const propre = valeur.replace(/_/g, " ").trim();
  if (!propre) return "";
  return propre.charAt(0).toUpperCase() + propre.slice(1);
}

export function libelleTypeAlerte(type: string, langue: LangueAlerte = "fr"): string {
  return LIBELLES_TYPE[type]?.[langue] ?? texteDeSecours(type);
}

export function libelleStatutAlerte(statut: string, langue: LangueAlerte = "fr"): string {
  return LIBELLES_STATUT[statut]?.[langue] ?? texteDeSecours(statut);
}

function formaterNombre(valeur: number | string, langue: LangueAlerte): string {
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) return String(valeur);
  return new Intl.NumberFormat(langue === "fr" ? "fr-FR" : "en-GB", {
    maximumFractionDigits: 1,
  }).format(nombre);
}

const TYPES_EN_POURCENTAGE = new Set(["quantite", "ecart_quantite", "budget"]);

/** Phrase de détail d'une alerte, lisible (remplace « Valeur : x / Seuil : y »). */
export function detailAlerte(
  alerte: { type: string; valeur: number | string; seuil: number | string },
  langue: LangueAlerte = "fr",
): string {
  const valeur = Number(alerte.valeur);
  const seuil = formaterNombre(alerte.seuil, langue);

  if (TYPES_EN_POURCENTAGE.has(alerte.type)) {
    const nombre = formaterNombre(Math.abs(valeur), langue);
    const signe = valeur > 0 ? "+" : valeur < 0 ? "-" : "";
    return langue === "fr"
      ? `Écart : ${signe}${nombre} % · seuil : ${seuil} %`
      : `Deviation: ${signe}${nombre}% · threshold: ${seuil}%`;
  }

  const nombre = formaterNombre(valeur, langue);
  return langue === "fr" ? `Valeur : ${nombre} · seuil : ${seuil}` : `Value: ${nombre} · threshold: ${seuil}`;
}
