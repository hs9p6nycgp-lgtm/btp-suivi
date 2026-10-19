import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ajouterJours,
  chaineCritique,
  datesPrevues,
  detecterCycle,
  dureePlanning,
  libelleLien,
  predecesseursParTache,
  verifierLien,
  type DependancePlanning,
  type TachePlanning,
} from "../liens.ts";

const taches: TachePlanning[] = [
  { id: "a", nom: "Repérage", duree_jours: 5 },
  { id: "b", nom: "Décapage", duree_jours: 10 },
  { id: "c", nom: "Remblai", duree_jours: 15 },
  { id: "d", nom: "Base", duree_jours: 15 },
  { id: "e", nom: "Revêtement", duree_jours: 20 },
];

const chaine: DependancePlanning[] = [
  { tache_predecesseur_id: "b", tache_successeur_id: "c" },
  { tache_predecesseur_id: "c", tache_successeur_id: "d" },
  { tache_predecesseur_id: "d", tache_successeur_id: "e" },
];

describe("liaison des tâches du planning (PLA-01, PLA-02)", () => {
  it("regroupe les prédécesseurs de chaque tâche", () => {
    const parTache = predecesseursParTache(chaine);
    assert.deepEqual(parTache.get("c"), ["b"]);
    assert.deepEqual(parTache.get("e"), ["d"]);
    assert.equal(parTache.get("b"), undefined);
  });

  it("refuse un lien qui créerait un cycle", () => {
    assert.equal(detecterCycle(chaine, "e", "b"), true);
    assert.equal(detecterCycle(chaine, "b", "e"), false);
    assert.equal(detecterCycle(chaine, "b", "b"), true);
  });

  it("valide un nouveau lien", () => {
    const bon = verifierLien(taches, chaine, "a", "b");
    assert.equal(bon.ok, true);
    assert.equal(bon.raison, null);

    const doublon = verifierLien(taches, chaine, "b", "c");
    assert.equal(doublon.ok, false);
    assert.ok(doublon.raison?.includes("existe déjà"));

    const boucle = verifierLien(taches, chaine, "e", "b");
    assert.equal(boucle.ok, false);
    assert.ok(boucle.raison?.includes("cycle"));

    const soi = verifierLien(taches, chaine, "b", "b");
    assert.equal(soi.ok, false);

    const inconnu = verifierLien(taches, chaine, "b", "zzz");
    assert.equal(inconnu.ok, false);
  });

  it("enchaîne les dates prévues selon les dépendances", () => {
    const dates = datesPrevues(taches, chaine, "2026-01-05");
    assert.equal(dates.get("b")?.jourDebut, 0);
    assert.equal(dates.get("b")?.jourFin, 10);
    assert.equal(dates.get("c")?.jourDebut, 10);
    assert.equal(dates.get("d")?.jourDebut, 25);
    assert.equal(dates.get("e")?.jourDebut, 40);
    assert.equal(dates.get("e")?.jourFin, 60);

    assert.equal(dates.get("b")?.debut, "2026-01-05");
    assert.equal(dates.get("c")?.debut, "2026-01-15");
    assert.equal(dates.get("d")?.fin, "2026-02-14");
    assert.equal(dates.get("e")?.fin, "2026-03-06");
  });

  it("calcule la durée totale du planning", () => {
    assert.equal(dureePlanning(taches, chaine), 60);
  });

  it("identifie la chaîne critique et écarte les tâches avec de la marge", () => {
    const critique = chaineCritique(taches, chaine);
    assert.deepEqual(
      critique.map((t) => t.nom),
      ["Décapage", "Remblai", "Base", "Revêtement"],
    );
  });

  it("ajoute des jours à une date", () => {
    assert.equal(ajouterJours("2026-01-05", 0), "2026-01-05");
    assert.equal(ajouterJours("2026-01-05", 27), "2026-02-01");
    assert.equal(ajouterJours("2026-12-31", 1), "2027-01-01");
    assert.equal(ajouterJours(null, 3), null);
    assert.equal(ajouterJours("pas une date", 3), null);
  });

  it("étiquette un lien avec les noms des tâches", () => {
    assert.equal(libelleLien(taches, chaine[0]), "Décapage → Remblai");
    assert.equal(
      libelleLien(taches, { tache_predecesseur_id: "b", tache_successeur_id: "inconnue" }),
      "Décapage → Tâche supprimée",
    );
  });
});
