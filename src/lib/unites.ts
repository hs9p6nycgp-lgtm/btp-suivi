// Normalisation et conversion des unites (source unique).
//
// Le BPU melange les ecritures : « t » et « tonne », « m3 » et « m³ »,
// « m2 » et « m² », « sac » et « sac 50 kg ». Sans normalisation, deux postes
// du meme produit ne se reconnaissent pas, et une unite mal ecrite fait
// choisir le mauvais prix dans un devis.
//
// Module pur : aucune dependance.

/** Normalise une unite : minuscules, sans accents, exposants convertis. */
export function normaliserUnite(unite: string | null | undefined): string {
  const u = String(unite ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[³²¹]/g, (c) => (c === "³" ? "3" : c === "²" ? "2" : "1"))
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
  if (!u) return "";
  if (u.startsWith("m3") || u.startsWith("m cube")) return "m3";
  if (u.startsWith("m2")) return "m2";
  if (u === "kg" || u.startsWith("kg ")) return "kg";
  if (u === "g" || u.startsWith("g ")) return "g";
  if (u === "t" || u === "tonne" || u === "tonnes" || u.startsWith("tonne")) return "t";
  if (u.startsWith("sac")) return "sac";
  if (u === "m" || u.startsWith("m ")) return "m";
  if (u === "l" || u === "litre" || u === "litres" || u === "ml") return "l";
  if (u === "u" || u === "unite" || u === "unites" || u === "pcs" || u === "piece" || u === "pièce" || u === "elt" || u === "element") return "u";
  if (u === "m carre") return "m2";
  return u;
}

/** Deux unites sont-elles equivalentes (« tonne » et « t »…) ? */
export function unitesEquivalentes(a: string | null | undefined, b: string | null | undefined): boolean {
  const ua = normaliserUnite(a);
  const ub = normaliserUnite(b);
  if (!ua || !ub) return false;
  return ua === ub;
}

// Conversions de meme nature (masse, volume, longueur, surface, quantite).
const CONVERSIONS: Record<string, Record<string, number>> = {
  kg: { g: 1000, t: 0.001 },
  g: { kg: 0.001 },
  t: { kg: 1000, g: 1000000 },
  m3: { l: 1000 },
  l: { m3: 0.001 },
};

/**
 * Convertit une quantité d'une unité vers une autre.
 * Renvoie null quand la conversion n'est pas possible (unités de nature
 * différente : des litres ne deviennent pas des mètres carrés).
 */
export function convertirQuantite(
  valeur: number,
  uniteDepart: string,
  uniteArrivee: string,
): number | null {
  const depart = normaliserUnite(uniteDepart);
  const arrivee = normaliserUnite(uniteArrivee);
  if (!depart || !arrivee) return null;
  if (depart === arrivee) return valeur;
  const facteur = CONVERSIONS[depart]?.[arrivee];
  if (facteur === undefined) return null;
  return valeur * facteur;
}
