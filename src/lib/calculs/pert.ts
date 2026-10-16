// Calcul du chemin critique PERT (section 4.6, exigence PLA-02).
// Logique pure : a partir d'un graphe de taches avec dependances,
// calcule les dates au plus tot, au plus tard, et les marges totales.
// Une marge totale = 0 identifie une tache critique.

export type TachePert = {
  id: string;
  duree: number; // en jours
  predecesseurs: string[]; // ids des taches precedentes
};

export type ResultatPert = {
  id: string;
  dateAuPlusTot: number;   // en jours depuis le debut du projet
  dateAuPlusTard: number;  // en jours depuis le debut du projet (date de debut au plus tard)
  margeTotale: number;     // en jours
  estCritique: boolean;
};

/** Trie topologiquement les taches (ordre de dependances). */
function triTopologique(taches: TachePert[]): string[] {
  const parId = new Map(taches.map((t) => [t.id, t]));
  const visite = new Set<string>();
  const ordre: string[] = [];

  function visiter(id: string) {
    if (visite.has(id)) return;
    visite.add(id);
    const t = parId.get(id);
    if (t) {
      for (const pred of t.predecesseurs) visiter(pred);
    }
    ordre.push(id);
  }

  for (const t of taches) visiter(t.id);
  return ordre;
}

/** Calcule le planning PERT : dates au plus tot, au plus tard, marges. */
export function calculPert(
  taches: TachePert[],
  dureeProjet: number,
): ResultatPert[] {
  const parId = new Map(taches.map((t) => [t.id, t]));
  const ordre = triTopologique(taches);

  // ---------- Passe avant : dates au plus tot (ES) ----------
  const auPlusTot = new Map<string, number>();
  for (const id of ordre) {
    const t = parId.get(id)!;
    let debut = 0;
    for (const pred of t.predecesseurs) {
      const finPred = (auPlusTot.get(pred) ?? 0) + (parId.get(pred)!.duree ?? 0);
      if (finPred > debut) debut = finPred;
    }
    auPlusTot.set(id, debut);
  }

  // ---------- Passe arriere : dates au plus tard (LS) ----------
  // LF (date de fin au plus tard) = min(LS des successeurs) ou dureeProjet.
  // LS (date de debut au plus tard) = LF - duree.
  const auPlusTard = new Map<string, number>();
  for (let i = ordre.length - 1; i >= 0; i--) {
    const id = ordre[i];
    const t = parId.get(id)!;
    let latestFinish = dureeProjet;
    for (const other of taches) {
      if (other.predecesseurs.includes(id)) {
        const succLatestStart = auPlusTard.get(other.id);
        if (succLatestStart !== undefined && succLatestStart < latestFinish) {
          latestFinish = succLatestStart;
        }
      }
    }
    auPlusTard.set(id, latestFinish - t.duree);
  }

  // ---------- Marges totales et taches critiques ----------
  return taches.map((t) => {
    const es = auPlusTot.get(t.id) ?? 0;
    const ls = auPlusTard.get(t.id) ?? es;
    const marge = ls - es;
    return {
      id: t.id,
      dateAuPlusTot: es,
      dateAuPlusTard: ls,
      margeTotale: marge,
      estCritique: marge === 0,
    };
  });
}

/** Renvoie les ids des taches critiques (marge totale = 0). */
export function tachesCritiques(resultat: ResultatPert[]): string[] {
  return resultat.filter((r) => r.estCritique).map((r) => r.id);
}

/** Calcule la date prevue de fin d'une tache (date debut + duree). */
export function datePrevueFin(
  dateDebut: string | null,
  dureeJours: number,
): string | null {
  if (!dateDebut) return null;
  const d = new Date(`${dateDebut}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + dureeJours);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}