import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { suiviPointsControle } from "../pointsControle.ts";

const plan = [
  { parametre: "Largeur de la chaussée", unite: "m" },
  { parametre: "Dévers en alignement", unite: "%" },
  { parametre: "Compacité de la couche de fondation", unite: "% OPM" },
];

describe("suivi des points de contrôle (QUA-01, QUA-02)", () => {
  it("signale les paramètres jamais contrôlés", () => {
    const suivi = suiviPointsControle(plan, []);
    assert.equal(suivi.nbParametres, 3);
    assert.equal(suivi.jamaisControls, 3);
    assert.equal(suivi.tauxConformiteGlobalPct, null);
    assert.equal(suivi.parametres[0].etat, "jamais_controle");
  });

  it("indique un paramètre conforme quand tous les essais le sont", () => {
    const suivi = suiviPointsControle(plan, [
      { type_controle: "Largeur de la chaussée", conforme: true, date_controle: "2026-10-19" },
      { type_controle: "Largeur de la chaussée", conforme: true, date_controle: "2026-10-18" },
    ]);
    assert.equal(suivi.parametres[0].etat, "conforme");
    assert.equal(suivi.parametres[0].nbEssais, 2);
    assert.equal(suivi.parametres[0].tauxConformitePct, 100);
    assert.equal(suivi.parametres[0].dernierEssai, "2026-10-19");
    assert.equal(suivi.conformes, 1);
  });

  it("détecte un paramètre non conforme sur le dernier essai", () => {
    const suivi = suiviPointsControle(plan, [
      { type_controle: "Dévers en alignement", conforme: true, date_controle: "2026-10-18" },
      { type_controle: "Dévers en alignement", conforme: false, date_controle: "2026-10-19" },
    ]);
    assert.equal(suivi.parametres[1].etat, "non_conforme");
    assert.equal(suivi.parametres[1].tauxConformitePct, 50);
    assert.equal(suivi.nonConformes, 1);
  });

  it("reconnaît le paramètre malgré les accents et la casse", () => {
    const suivi = suiviPointsControle(
      [{ parametre: "Épaisseur de la chaussée", unite: "cm" }],
      [{ type_controle: "epaisseur de la chaussee", conforme: true, date_controle: "2026-10-19" }],
    );
    assert.equal(suivi.parametres[0].etat, "conforme");
    assert.equal(suivi.jamaisControls, 0);
  });

  it("calcule le taux de conformité global", () => {
    const suivi = suiviPointsControle(plan, [
      { type_controle: "Largeur de la chaussée", conforme: true, date_controle: "2026-10-19" },
      { type_controlle: "", conforme: true, date_controle: "2026-10-19" } as any,
      { type_controle: "Dévers en alignement", conforme: false, date_controle: "2026-10-19" },
    ]);
    assert.equal(suivi.tauxConformiteGlobalPct, 50);
    assert.equal(suivi.parametres[2].etat, "jamais_controle");
  });
});
