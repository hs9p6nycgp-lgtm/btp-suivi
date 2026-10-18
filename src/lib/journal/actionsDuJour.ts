// « Quoi faire aujourd'hui ? » — calcul des actions prioritaires du tableau de bord.
//
// Fonction pure : on lui donne les données déjà chargées par l'écran,
// elle retourne la liste ordonnée des choses à faire (saisie du jour manquante,
// non-conformités ouvertes, alertes ouvertes), avec un lien direct pour agir.
//
// Elle ne fait aucune requête réseau : l'interface l'appelle après avoir
// chargé les chantiers, les journaux du jour, les non-conformités et les alertes.

export type ChantierPourActions = {
  id: string;
  nom: string;
  statut: string;
};

export type DonneesDuJour = {
  chantiers: ChantierPourActions[];
  /** Ids des chantiers qui ont déjà au moins une fiche journal datée d'aujourd'hui. */
  chantiersAvecJournalAujourdhui: string[];
  /** Nombre de non-conformités ouvertes, par chantier. */
  nonConformitesOuvertes?: Record<string, number>;
  /** Nombre d'alertes ouvertes, par chantier. */
  alertesOuvertes?: Record<string, number>;
};

export type TypeActionJour = "saisie_journal" | "non_conformites" | "alertes";

export type ActionDuJour = {
  type: TypeActionJour;
  /** 1 = à faire en premier, 3 = à consulter ensuite. */
  priorite: number;
  chantierId: string;
  chantierNom: string;
  libelle: string;
  detail: string;
  /** Nombre concerné (non-conformités ou alertes). */
  nb?: number;
  /** Lien direct vers l'écran d'action. */
  lienHref: string;
};

const LIBELLE_SAISIE = "Faire la saisie du jour";
const LIBELLE_NC = "Traiter les non-conformités";
const LIBELLE_ALERTES = "Vérifier les alertes";

function pluriel(nombre: number, singulier: string, plurielMot: string): string {
  return `${nombre} ${nombre > 1 ? plurielMot : singulier}`;
}

/**
 * Calcule les actions du jour pour les chantiers en cours.
 * - Priorité 1 : fiche journal du jour pas encore créée.
 * - Priorité 2 : non-conformités ouvertes.
 * - Priorité 3 : alertes ouvertes.
 */
export function actionsDuJour(donnees: DonneesDuJour): ActionDuJour[] {
  const avecJournal = new Set(donnees.chantiersAvecJournalAujourdhui);
  const actions: ActionDuJour[] = [];

  for (const chantier of donnees.chantiers) {
    if (chantier.statut !== "en_cours") continue;

    if (!avecJournal.has(chantier.id)) {
      actions.push({
        type: "saisie_journal",
        priorite: 1,
        chantierId: chantier.id,
        chantierNom: chantier.nom,
        libelle: LIBELLE_SAISIE,
        detail: "Aucune fiche journal datée d'aujourd'hui.",
        lienHref: `/chantiers/${chantier.id}/journaux`,
      });
    }

    const nonConformites = donnees.nonConformitesOuvertes?.[chantier.id] ?? 0;
    if (nonConformites > 0) {
      actions.push({
        type: "non_conformites",
        priorite: 2,
        chantierId: chantier.id,
        chantierNom: chantier.nom,
        libelle: LIBELLE_NC,
        detail: `${pluriel(nonConformites, "non-conformité ouverte", "non-conformités ouvertes")}.`,
        nb: nonConformites,
        lienHref: `/chantiers/${chantier.id}/qualite`,
      });
    }

    const alertes = donnees.alertesOuvertes?.[chantier.id] ?? 0;
    if (alertes > 0) {
      actions.push({
        type: "alertes",
        priorite: 3,
        chantierId: chantier.id,
        chantierNom: chantier.nom,
        libelle: LIBELLE_ALERTES,
        detail: `${pluriel(alertes, "alerte ouverte", "alertes ouvertes")}.`,
        nb: alertes,
        lienHref: `/chantiers/${chantier.id}`,
      });
    }
  }

  return actions.sort(
    (a, b) => a.priorite - b.priorite || a.chantierNom.localeCompare(b.chantierNom, "fr"),
  );
}

/** Nombre de chantiers en cours sans fiche journal datée d'aujourd'hui. */
export function nombreSansSaisie(donnees: DonneesDuJour): number {
  const avecJournal = new Set(donnees.chantiersAvecJournalAujourdhui);
  return donnees.chantiers.filter((c) => c.statut === "en_cours" && !avecJournal.has(c.id)).length;
}
