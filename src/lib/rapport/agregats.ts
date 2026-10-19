// Agregats du rapport de synthese (exigences REP-01, REP-02) : valorisation
// des travaux, depenses reelles, journaux, non-conformites, photos et
// comparaison du delai. Logique pure, testable.
//
// Deux notions a ne pas confondre :
// - la VALORISATION DES TRAVAUX : quantites realisees x prix unitaires
//   (ce que represente le chantier en travaux) ;
// - les DEPENSES REELLES : l'argent reellement decaisse (achats, salaires,
//   location d'engins...). L'ecart entre les deux est un indicateur de
//   marge, pas une erreur.

export type PosteDqe = {
  id: string;
  code?: string | null;
  designation: string;
  unite: string;
  quantite_marche: number;
  prix_unitaire: number;
};

export type QuantiteRealisee = { poste_dqe_id: string; quantite: number };

export type DepenseReelle = {
  categorie: string;
  designation: string;
  montant_total: number;
  date_depense?: string | null;
};

export type NonConformite = {
  id: string;
  gravite: string;
  statut: string;
  description?: string | null;
  echeance?: string | null;
};

export type Journal = {
  id: string;
  date_journal: string;
  meteo?: string | null;
  statut?: string | null;
};

export type Effectif = { journal_id: string; corps_metier: string; nombre: number };
export type Engin = {
  journal_id: string;
  type_engin: string;
  heures_marche: number;
  heures_prevues?: number | null;
};
export type Incident = { journal_id: string; type: string; duree_heures: number };
export type Photo = { journal_id: string; chemin: string };

export type LigneValorisation = {
  posteId: string;
  code: string | null;
  designation: string;
  unite: string;
  quantiteMarche: number;
  quantiteRealisee: number;
  prixUnitaire: number;
  montantMarche: number;
  montantRealise: number;
  avancement: number; // % de la quantite de marche realisee
  ecartQuantite: number; // % : ecart de quantite (5.1)
};

export type LigneDepense = { categorie: string; libelle: string; total: number; nombre: number };

export type AgregatNonConformites = {
  total: number;
  ouvertes: number;
  cloturees: number;
  parGravite: { gravite: string; libelle: string; total: number }[];
};

export type AgregatJournaux = {
  nombreJournaux: number;
  nombreValides: number;
  effectifsCumules: number;
  heuresMarche: number;
  heuresPrevues: number;
  tauxDisponibilite: number | null; // indicateur 5.7
  nombreIncidents: number;
  heuresIncident: number;
  nombrePhotos: number;
};

export type ComparaisonDelai = {
  etat: "en_cours" | "a_jour" | "avance" | "retard" | "inconnu";
  jours: number | null;
  libelle: string;
};

export type PeriodeRapport = "journalier" | "hebdomadaire" | "mensuel";

function isoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const j = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

/**
 * Bornes de la periode par defaut (audit metier du 19/10/2026, §5 : le
 * selecteur de periode « ne changeait reellement pas le contenu »).
 * - journalier : la journee en cours ;
 * - hebdomadaire : les sept derniers jours ;
 * - mensuel : depuis le premier jour du mois.
 */
export function periodeParDefaut(
  periode: PeriodeRapport,
  reference: Date = new Date(),
): { debut: string; fin: string } {
  const fin = new Date(reference.getTime());
  const debut = new Date(reference.getTime());
  if (periode === "hebdomadaire") {
    debut.setDate(debut.getDate() - 6);
  } else if (periode === "mensuel") {
    debut.setDate(1);
  }
  return { debut: isoLocal(debut), fin: isoLocal(fin) };
}

const CATEGORIES_DEPENSE: Record<string, string> = {
  materiaux: "Matériaux",
  main_doeuvre: "Main-d'œuvre",
  engins: "Engins",
  sous_traitance: "Sous-traitance",
  carburant: "Carburant",
  autre: "Autre",
};

const GRAVITES_NC: Record<string, string> = {
  mineure: "Mineure",
  majeure: "Majeure",
  critique: "Critique",
};

/** Libelle francais d'une categorie de depense. */
export function libelleCategorieDepense(categorie: string | null | undefined): string {
  const cle = String(categorie ?? "").trim();
  if (!cle) return "Non précisé";
  return CATEGORIES_DEPENSE[cle] ?? cle.charAt(0).toUpperCase() + cle.slice(1);
}

/** Libelle francais d'une gravite de non-conformite. */
export function libelleGravite(gravite: string | null | undefined): string {
  const cle = String(gravite ?? "").trim();
  if (!cle) return "Non précisée";
  return GRAVITES_NC[cle] ?? cle.charAt(0).toUpperCase() + cle.slice(1);
}

/** Montant affiche en FCFA, sans decimale. */
export function formaterMontant(valeur: number | null | undefined): string {
  const n = Number(valeur ?? 0);
  const montant = Number.isFinite(n) ? Math.round(n) : 0;
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

/** Pourcentage affiche a la francaise : « 0,5 % » (virgule, pas point). */
export function formaterPourcentage(valeur: number | null | undefined): string {
  const n = Number(valeur);
  if (valeur === null || valeur === undefined || !Number.isFinite(n)) return "—";
  return `${String(Math.round(n * 10) / 10).replace(".", ",")} %`;
}

/** Valorisation poste par poste : quantite de marche, quantite realisee, montants. */
export function valorisationPostes(
  postes: PosteDqe[],
  quantites: QuantiteRealisee[],
): LigneValorisation[] {
  const realiseParPoste = new Map<string, number>();
  for (const q of quantites ?? []) {
    const valeur = Number(q.quantite);
    if (!Number.isFinite(valeur)) continue;
    realiseParPoste.set(q.poste_dqe_id, (realiseParPoste.get(q.poste_dqe_id) ?? 0) + valeur);
  }

  return (postes ?? []).map((poste) => {
    const quantiteMarche = Number(poste.quantite_marche) || 0;
    const quantiteRealisee = realiseParPoste.get(poste.id) ?? 0;
    const prixUnitaire = Number(poste.prix_unitaire) || 0;
    const avancement = quantiteMarche > 0 ? (quantiteRealisee / quantiteMarche) * 100 : 0;
    const ecart = quantiteMarche > 0 ? ((quantiteRealisee - quantiteMarche) / quantiteMarche) * 100 : 0;
    return {
      posteId: poste.id,
      code: poste.code ?? null,
      designation: poste.designation,
      unite: poste.unite,
      quantiteMarche,
      quantiteRealisee,
      prixUnitaire,
      montantMarche: quantiteMarche * prixUnitaire,
      montantRealise: quantiteRealisee * prixUnitaire,
      avancement,
      ecartQuantite: ecart,
    };
  });
}

/** Totaux de la valorisation : montant du marche et montant valorise. */
export function totalValorisation(lignes: LigneValorisation[]): {
  montantMarche: number;
  montantRealise: number;
} {
  return {
    montantMarche: Math.round((lignes ?? []).reduce((s, l) => s + l.montantMarche, 0)),
    montantRealise: Math.round((lignes ?? []).reduce((s, l) => s + l.montantRealise, 0)),
  };
}

/** Depenses reelles regroupees par categorie (montant le plus eleve en tete). */
export function depensesParCategorie(depenses: DepenseReelle[]): LigneDepense[] {
  const map = new Map<string, LigneDepense>();
  for (const depense of depenses ?? []) {
    const categorie = String(depense.categorie ?? "autre");
    const montant = Number(depense.montant_total) || 0;
    const ligne = map.get(categorie) ?? {
      categorie,
      libelle: libelleCategorieDepense(categorie),
      total: 0,
      nombre: 0,
    };
    ligne.total += montant;
    ligne.nombre += 1;
    map.set(categorie, ligne);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Total des depenses reelles. */
export function totalDepenses(depenses: DepenseReelle[]): number {
  return Math.round((depenses ?? []).reduce((s, d) => s + (Number(d.montant_total) || 0), 0));
}

/** Non-conformites : total, ouvertes, cloturees et repartition par gravite. */
export function agregatNonConformites(nonConformites: NonConformite[]): AgregatNonConformites {
  const liste = nonConformites ?? [];
  const ouvertes = liste.filter((nc) => nc.statut !== "cloturee").length;
  const parGraviteMap = new Map<string, number>();
  for (const nc of liste) {
    const gravite = String(nc.gravite ?? "mineure");
    parGraviteMap.set(gravite, (parGraviteMap.get(gravite) ?? 0) + 1);
  }
  const parGravite = ["critique", "majeure", "mineure"]
    .filter((g) => parGraviteMap.has(g))
    .map((gravite) => ({
      gravite,
      libelle: libelleGravite(gravite),
      total: parGraviteMap.get(gravite) ?? 0,
    }));
  return {
    total: liste.length,
    ouvertes,
    cloturees: liste.length - ouvertes,
    parGravite,
  };
}

/** Agregats des journaux de la periode : effectifs, engins, incidents, photos. */
export function agregatJournaux(donnees: {
  journaux: Journal[];
  effectifs?: Effectif[];
  engins?: Engin[];
  incidents?: Incident[];
  photos?: Photo[];
}): AgregatJournaux {
  const journaux = donnees.journaux ?? [];
  const effectifs = donnees.effectifs ?? [];
  const engins = donnees.engins ?? [];
  const incidents = donnees.incidents ?? [];
  const photos = donnees.photos ?? [];

  const heuresMarche = engins.reduce((s, e) => s + (Number(e.heures_marche) || 0), 0);
  const heuresPrevues = engins.reduce(
    (s, e) => s + (Number(e.heures_prevues) || 0),
    0,
  );

  return {
    nombreJournaux: journaux.length,
    nombreValides: journaux.filter((j) => j.statut === "valide").length,
    effectifsCumules: effectifs.reduce((s, e) => s + (Number(e.nombre) || 0), 0),
    heuresMarche: Math.round(heuresMarche * 100) / 100,
    heuresPrevues: Math.round(heuresPrevues * 100) / 100,
    tauxDisponibilite:
      heuresPrevues > 0 ? Math.round((heuresMarche / heuresPrevues) * 1000) / 10 : null,
    nombreIncidents: incidents.length,
    heuresIncident: Math.round(incidents.reduce((s, i) => s + (Number(i.duree_heures) || 0), 0) * 100) / 100,
    nombrePhotos: photos.length,
  };
}

/** Comparaison du delai : fin contractuelle et derniere activite du chantier. */
export function comparaisonDelai(
  dateFinContractuelle: string | null | undefined,
  dateDerniereActivite: string | null | undefined,
  termine = false,
): ComparaisonDelai {
  if (!dateFinContractuelle) {
    return { etat: "inconnu", jours: null, libelle: "Fin contractuelle non renseignée" };
  }
  if (!dateDerniereActivite) {
    return { etat: "inconnu", jours: null, libelle: "Aucune activité enregistrée" };
  }
  const fin = new Date(`${dateFinContractuelle.slice(0, 10)}T00:00:00`).getTime();
  const activite = new Date(`${dateDerniereActivite.slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(fin) || Number.isNaN(activite)) {
    return { etat: "inconnu", jours: null, libelle: "Dates illisibles" };
  }
  const jours = Math.round((fin - activite) / 86400000);

  if (termine) {
    if (jours >= 0) {
      return { etat: "a_jour", jours, libelle: `Terminé ${jours} jour(s) avant la fin contractuelle` };
    }
    return { etat: "retard", jours, libelle: `Terminé avec ${Math.abs(jours)} jour(s) de retard` };
  }
  if (jours >= 0) {
    return { etat: "en_cours", jours, libelle: `${jours} jour(s) avant la fin contractuelle` };
  }
  return { etat: "retard", jours, libelle: `Retard de ${Math.abs(jours)} jour(s) sur la fin contractuelle` };
}
