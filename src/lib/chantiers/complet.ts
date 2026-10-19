// Regles metier des chantiers : identite (CHA-01), decoupage sections / PK (CHA-02),
// documents (CHA-03) et suivi (echeances, avancement). Fonctions pures, testables.

// --- CHA-02 : points kilométriques (route) ---

/** Formate une distance en metres pour un affichage de type "PK 2+500". */
export function formaterPK(valeur: number | null | undefined): string | null {
  if (valeur === null || valeur === undefined) return null;
  const m = Number(valeur);
  if (!Number.isFinite(m)) return null;
  const arrondi = Math.max(0, Math.round(m));
  const km = Math.floor(arrondi / 1000);
  const reste = arrondi % 1000;
  return `PK ${km}+${String(reste).padStart(3, "0")}`;
}

/** Lit un PK saisi ("2+500", "PK 2+500", "2500", "2 500,5") et renvoie la distance en metres. */
export function analyserPK(texte: string | null | undefined): number | null {
  if (!texte) return null;
  let t = String(texte).trim().toLowerCase();
  if (!t) return null;
  t = t.replace(/^pk\s*/, "");
  const avecPlus = t.match(/^(\d+)\s*\+\s*(\d{1,3}(?:[.,]\d+)?)$/);
  if (avecPlus) {
    const km = Number(avecPlus[1]);
    const m = Number(avecPlus[2].replace(",", "."));
    if (!Number.isFinite(km) || !Number.isFinite(m)) return null;
    return km * 1000 + m;
  }
  if (/^[\d\s.,]+$/.test(t)) {
    const propre = t.replace(/\s/g, "").replace(",", ".");
    const n = Number(propre);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

/** Longueur d'une section a partir de ses PK (null si incoherent ou incomplet). */
export function longueurSection(
  debut: number | null | undefined,
  fin: number | null | undefined,
): number | null {
  if (debut === null || debut === undefined || fin === null || fin === undefined) return null;
  const d = Number(debut);
  const f = Number(fin);
  if (!Number.isFinite(d) || !Number.isFinite(f) || f <= d) return null;
  return Math.round((f - d) * 100) / 100;
}

/** Affichage court d'une distance : "2,5 km" ou "450 m". */
export function formaterMetres(metres: number | null | undefined): string | null {
  if (metres === null || metres === undefined) return null;
  const m = Number(metres);
  if (!Number.isFinite(m) || m < 0) return null;
  if (m >= 1000) {
    const km = Math.round(m / 100) / 10;
    return `${String(km).replace(".", ",")} km`;
  }
  return `${Math.round(m)} m`;
}

/** Ligne secondaire d'une section : "PK 0+000 → PK 2+500 · 2,5 km" ou "R+1 · Gros œuvre". */
export function detailSection(s: {
  pk_debut?: number | null;
  pk_fin?: number | null;
  niveau?: string | null;
  lot?: string | null;
  type_ouvrage?: string | null;
}): string {
  const parties: string[] = [];
  const debut = formaterPK(s.pk_debut ?? null);
  const fin = formaterPK(s.pk_fin ?? null);
  if (debut && fin) {
    const l = longueurSection(s.pk_debut, s.pk_fin);
    parties.push(`${debut} → ${fin}${l ? ` · ${formaterMetres(l)}` : ""}`);
  }
  if (s.niveau) parties.push(s.niveau);
  if (s.lot) parties.push(s.lot);
  if (s.type_ouvrage) parties.push(s.type_ouvrage);
  return parties.join(" · ") || "Sans détail";
}

// --- Suivi : avancement et echeances ---

/**
 * Avancement global a partir des sections : pondere par la longueur quand toutes
 * les sections ont un PK coherent (route), sinon moyenne simple (batiment).
 * Renvoie null s'il n'y a aucune section.
 */
export function avancementMoyenSections(
  sections: Array<{ avancement_pct?: number | null; pk_debut?: number | null; pk_fin?: number | null }>,
): number | null {
  if (!sections || sections.length === 0) return null;
  const valeurs = sections.map((s) => Number(s.avancement_pct ?? 0)).filter((v) => Number.isFinite(v));
  if (valeurs.length === 0) return null;
  const longueurs = sections.map((s) => longueurSection(s.pk_debut ?? null, s.pk_fin ?? null));
  const toutesAvecLongueur = longueurs.every((l) => l !== null && l > 0);
  let resultat: number;
  if (toutesAvecLongueur) {
    let somme = 0;
    let poids = 0;
    valeurs.forEach((v, i) => {
      const l = longueurs[i] as number;
      somme += Math.min(100, Math.max(0, v)) * l;
      poids += l;
    });
    resultat = poids > 0 ? somme / poids : 0;
  } else {
    resultat = valeurs.reduce((a, b) => a + Math.min(100, Math.max(0, b)), 0) / valeurs.length;
  }
  return Math.round(resultat * 10) / 10;
}

/** Nombre de jours restants avant la fin prevue (negatif si depassee), null si pas de date. */
export function joursRestants(dateFin: string | null | undefined, reference: Date = new Date()): number | null {
  if (!dateFin) return null;
  const fin = new Date(`${dateFin}T00:00:00`);
  if (Number.isNaN(fin.getTime())) return null;
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  return Math.round((fin.getTime() - ref.getTime()) / 86400000);
}

export type EtatEcheance = "cloture" | "inconnu" | "depasse" | "proche" | "normal";

/** Etat d'echeance d'un chantier, pour colorer le suivi (seuil "proche" = 14 jours). */
export function etatEcheance(
  dateFin: string | null | undefined,
  statut: string | null | undefined,
  reference: Date = new Date(),
  seuilJours: number = 14,
): EtatEcheance {
  if (statut === "receptionne_provisoirement" || statut === "cloture") return "cloture";
  const jours = joursRestants(dateFin, reference);
  if (jours === null) return "inconnu";
  if (jours < 0) return "depasse";
  if (jours <= seuilJours) return "proche";
  return "normal";
}

// --- CHA-01 : intervenants ---

/** Convertit un numero saisi en lien tel: (Cote d'Ivoire +225 par defaut). */
export function normaliserTelephone(numero: string | null | undefined): string | null {
  if (!numero) return null;
  const brut = String(numero).trim();
  if (!brut) return null;
  const commenceParPlus = brut.startsWith("+");
  const chiffres = brut.replace(/\D/g, "");
  if (!chiffres) return null;
  if (commenceParPlus) return `+${chiffres}`;
  if (chiffres.startsWith("00")) return `+${chiffres.slice(2)}`;
  if (chiffres.startsWith("225") && chiffres.length >= 11) return `+${chiffres}`;
  if (chiffres.length <= 10) return `+225${chiffres}`;
  return `+${chiffres}`;
}

/** Vrai si deux noms de chantier sont identiques a la casse, aux accents et espaces pres. */
export function estNomChantierSimilaire(a: string, b: string): boolean {
  return cleNom(a) === cleNom(b);
}

function cleNom(v: string): string {
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// --- CHA-03 : documents ---

export const TYPES_DOCUMENTS = ["plan", "marche", "ordre_service", "pv", "autre"] as const;
export type TypeDocument = (typeof TYPES_DOCUMENTS)[number];

/** Libelle francais d'un type de document. */
export function libelleTypeDocument(type: string | null | undefined): string {
  const labels: Record<string, string> = {
    plan: "Plan",
    marche: "Marché",
    ordre_service: "Ordre de service",
    pv: "PV",
    autre: "Autre",
  };
  return labels[type ?? ""] ?? "Autre";
}

/** Taille de fichier lisible : "340 Ko", "1,2 Mo". */
export function tailleLisible(octets: number | null | undefined): string {
  if (octets === null || octets === undefined || !Number.isFinite(Number(octets)) || Number(octets) < 0) {
    return "—";
  }
  const o = Number(octets);
  if (o < 1024) return `${Math.round(o)} o`;
  const ko = o / 1024;
  if (ko < 1024) return `${arrondi1(ko)} Ko`;
  const mo = ko / 1024;
  if (mo < 1024) return `${arrondi1(mo)} Mo`;
  return `${arrondi1(mo / 1024)} Go`;
}

function arrondi1(v: number): string {
  return String(Math.round(v * 10) / 10).replace(".", ",");
}

/** Taille maximale acceptee pour un document joint (25 Mo). */
export const LIMITE_DOCUMENT_OCTETS = 25 * 1024 * 1024;
