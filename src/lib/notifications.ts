// Regroupement des problèmes de tous les chantiers : la cloche de la barre du
// haut et la page « Centre d'alertes ».
//
// L'information à suivre est répartie dans trois endroits de la base :
//  - `alertes`         : écarts de quantité, dépassements de budget, stocks, délais ;
//  - `non_conformites` : problèmes qualité (mineur, majeur, critique) ;
//  - `chantiers`      : date de fin prévue et avancement (permettent de voir les retards).
//
// Ce module les réunit en une liste unique, triée par gravité. Il ne fait
// aucune requête réseau et n'importe rien : les tests le vérifient directement
// (comme les autres modules purs du projet).

export type Gravite = "critique" | "attention" | "info";

export type CategorieNotification = "alerte" | "non_conformite" | "retard" | "stock";

export type AlerteRow = {
  id: string;
  chantier_id: string;
  type: string;
  valeur: number | string;
  seuil: number | string;
  statut: string;
  date_alerte?: string | null;
};

export type NonConformiteRow = {
  id: string;
  chantier_id: string;
  description: string;
  gravite: string;
  statut: string;
  echeance?: string | null;
  created_at?: string | null;
};

export type ChantierRow = {
  id: string;
  nom: string;
  date_fin_prevue?: string | null;
  avancement_pct?: number | null;
  statut?: string | null;
};

/** Matériau dont le stock est au seuil ou en dessous. */
export type StockRow = {
  chantier_id: string;
  cle: string;
  libelle: string;
  stock: number;
  seuil: number;
};

export type Notification = {
  id: string;
  categorie: CategorieNotification;
  /** Type d'alerte brut (« budget », « quantite »…) ou « qualite » / « delai ». */
  type: string;
  gravite: Gravite;
  chantierId: string;
  chantierNom: string;
  /** Écran à ouvrir pour traiter le problème. */
  lien: string;
  /** Date de l'événement (AAAA-MM-JJ), ou date de fin dépassée pour un retard. */
  date: string;
  valeur?: number | string;
  seuil?: number | string;
  description?: string;
  avancementPct?: number;
  dateFinPrevue?: string;
};

const GRAVITE_PAR_TYPE: Record<string, Gravite> = {
  hse: "critique",
  budget: "attention",
  quantite: "attention",
  ecart_quantite: "attention",
  delai: "attention",
  qualite: "attention",
  stock: "attention",
  eprouvette: "info",
  prix: "info",
};

/** Gravité d'une alerte, d'après son type. */
export function graviteAlerte(type: string): Gravite {
  return GRAVITE_PAR_TYPE[type] ?? "info";
}

/** Gravité d'une non-conformité, d'après la gravité quality. */
export function graviteNonConformite(gravite: string): Gravite {
  if (gravite === "critique") return "critique";
  if (gravite === "majeure") return "attention";
  return "info";
}

/** Écran où traiter l'alerte, selon son type. */
export function lienAlerte(type: string, chantierId: string): string {
  switch (type) {
    case "stock":
      return `/chantiers/${chantierId}/livraisons`;
    case "budget":
    case "quantite":
    case "ecart_quantite":
      return `/chantiers/${chantierId}/couts`;
    case "delai":
      return `/chantiers/${chantierId}/planning`;
    case "qualite":
      return `/chantiers/${chantierId}/qualite`;
    default:
      return `/chantiers/${chantierId}`;
  }
}

/** Un chantier est en retard si sa fin prévue est dépassée et qu'il n'est pas terminé. */
export function estEnRetard(chantier: ChantierRow, aujourdHui: string): boolean {
  if (!chantier.date_fin_prevue) return false;
  if (chantier.statut === "cloture" || chantier.statut === "receptionne_provisoirement") return false;
  if (Number(chantier.avancement_pct ?? 0) >= 100) return false;
  // Les dates sont au format AAAA-MM-JJ : la comparaison alphabétique suffit.
  return chantier.date_fin_prevue < aujourdHui;
}

/** Date au format JJ/MM/AAAA, sans décalage de fuseau horaire. */
export function formatDateFR(date?: string | null): string {
  if (!date) return "";
  const iso = date.slice(0, 10);
  const parties = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (parties) return `${parties[3]}/${parties[2]}/${parties[1]}`;
  const valeur = new Date(date);
  if (Number.isNaN(valeur.getTime())) return "";
  const jour = String(valeur.getDate()).padStart(2, "0");
  const mois = String(valeur.getMonth() + 1).padStart(2, "0");
  return `${jour}/${mois}/${valeur.getFullYear()}`;
}

function trierParGravite(liste: Notification[]): Notification[] {
  const rang: Record<Gravite, number> = { critique: 0, attention: 1, info: 2 };
  return [...liste].sort((a, b) => {
    const ecart = rang[a.gravite] - rang[b.gravite];
    if (ecart !== 0) return ecart;
    if (a.date !== b.date) return a.date < b.date ? 1 : -1; // le plus récent d'abord
    return a.id.localeCompare(b.id);
  });
}

/**
 * Construit la liste unique des problèmes à traiter, tous chantiers confondus.
 * Ne sont retenues que les alertes ouvertes, les non-conformités en cours et
 * les chantiers en retard.
 */
export function construireNotifications(donnees: {
  alertes: AlerteRow[];
  nonConformites: NonConformiteRow[];
  chantiers: ChantierRow[];
  aujourdHui: string;
  stocks?: StockRow[];
}): Notification[] {
  const noms = new Map(donnees.chantiers.map((chantier) => [chantier.id, chantier.nom]));
  const liste: Notification[] = [];

  for (const alerte of donnees.alertes) {
    // Une alerte acquittée ou clôturée n'est plus à traiter.
    if (alerte.statut !== "ouverte") continue;
    liste.push({
      id: `alerte-${alerte.id}`,
      categorie: "alerte",
      type: alerte.type,
      gravite: graviteAlerte(alerte.type),
      chantierId: alerte.chantier_id,
      chantierNom: noms.get(alerte.chantier_id) ?? "Chantier",
      lien: lienAlerte(alerte.type, alerte.chantier_id),
      date: alerte.date_alerte ?? "",
      valeur: alerte.valeur,
      seuil: alerte.seuil,
    });
  }

  for (const nonConformite of donnees.nonConformites) {
    // « cloturee » et « rejetee » sont des non-conformités terminées.
    if (nonConformite.statut !== "ouverte" && nonConformite.statut !== "en_cours") continue;
    liste.push({
      id: `nc-${nonConformite.id}`,
      categorie: "non_conformite",
      type: "qualite",
      gravite: graviteNonConformite(nonConformite.gravite),
      chantierId: nonConformite.chantier_id,
      chantierNom: noms.get(nonConformite.chantier_id) ?? "Chantier",
      lien: `/chantiers/${nonConformite.chantier_id}/qualite`,
      date: nonConformite.created_at ?? "",
      description: nonConformite.description,
    });
  }

  for (const chantier of donnees.chantiers) {
    if (!estEnRetard(chantier, donnees.aujourdHui)) continue;
    liste.push({
      id: `retard-${chantier.id}`,
      categorie: "retard",
      type: "delai",
      gravite: "attention",
      chantierId: chantier.id,
      chantierNom: chantier.nom,
      lien: `/chantiers/${chantier.id}/planning`,
      date: chantier.date_fin_prevue ?? "",
      avancementPct: Number(chantier.avancement_pct ?? 0),
      dateFinPrevue: chantier.date_fin_prevue ?? "",
    });
  }

  // Stock bas : un matériau sous son seuil d'alerte doit être recommandaé.
  for (const stock of donnees.stocks ?? []) {
    liste.push({
      id: `stock-${stock.chantier_id}-${stock.cle}`,
      categorie: "stock",
      type: "stock",
      gravite: "attention",
      chantierId: stock.chantier_id,
      chantierNom: noms.get(stock.chantier_id) ?? "Chantier",
      lien: lienAlerte("stock", stock.chantier_id),
      date: "",
      description: stock.libelle,
      valeur: stock.stock,
      seuil: stock.seuil,
    });
  }

  return trierParGravite(liste);
}

/** Nombre de problèmes par gravité. */
export function compteParGravite(liste: Notification[]): Record<Gravite, number> {
  return {
    critique: liste.filter((notification) => notification.gravite === "critique").length,
    attention: liste.filter((notification) => notification.gravite === "attention").length,
    info: liste.filter((notification) => notification.gravite === "info").length,
  };
}
