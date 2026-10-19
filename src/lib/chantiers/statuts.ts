// Regle de gestion RG-05 du cahier des charges : « un chantier ne peut
// passer au statut "receptionne" que si toutes les non-conformites sont
// cloturees ».
//
// Logique pure, testable : le controle est appele par la fiche chantier
// avant tout changement de statut.

export const STATUTS_CHANTIER = [
  "en_preparation",
  "en_cours",
  "suspendu",
  "receptionne_provisoirement",
  "cloture",
] as const;

export type StatutChantier = (typeof STATUTS_CHANTIER)[number];

/** Statuts qui signifient une reception (partielle ou definitive). */
export const STATUTS_RECEPTION: StatutChantier[] = [
  "receptionne_provisoirement",
  "cloture",
];

const LIBELLES: Record<string, string> = {
  en_preparation: "En préparation",
  en_cours: "En cours",
  suspendu: "Suspendu",
  receptionne_provisoirement: "Réceptionné provisoirement",
  cloture: "Clôturé",
};

/** Libelle francais d'un statut. */
export function libelleStatutChantier(statut: string | null | undefined): string {
  const cle = String(statut ?? "").trim();
  if (!cle) return "—";
  return LIBELLES[cle] ?? cle.charAt(0).toUpperCase() + cle.slice(1);
}

/** Le statut est-il un statut de reception ? */
export function estStatutReception(statut: string | null | undefined): boolean {
  return STATUTS_RECEPTION.includes(String(statut ?? "") as StatutChantier);
}

/**
 * RG-05 : le passage en reception est refuse tant que des
 * non-conformites sont ouvertes.
 */
export function receptionAutorisee(
  nouvelleStatut: string | null | undefined,
  nonConformitesOuvertes: number,
): { ok: boolean; raison: string | null } {
  if (!estStatutReception(nouvelleStatut)) {
    return { ok: true, raison: null };
  }
  const ouvertes = Math.max(0, Math.round(Number(nonConformitesOuvertes) || 0));
  if (ouvertes === 0) {
    return { ok: true, raison: null };
  }
  return {
    ok: false,
    raison:
      ouvertes === 1
        ? "1 non-conformité est encore ouverte : clôturez-la avant la réception."
        : `${ouvertes} non-conformités sont encore ouvertes : clôturez-les avant la réception.`,
  };
}
