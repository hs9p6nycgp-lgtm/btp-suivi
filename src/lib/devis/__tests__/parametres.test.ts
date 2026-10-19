import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PARAMETRES_DEFAUT,
  appliquerParametres,
  ecrireParametres,
  lireParametres,
  normaliserParametres,
} from "../parametres.ts";

function fauxStockage(initial: Record<string, string> = {}) {
  const contenu = { ...initial };
  return {
    getItem: (cle: string) => contenu[cle] ?? null,
    setItem: (cle: string, valeur: string) => {
      contenu[cle] = valeur;
    },
    contenu,
  };
}

describe("paramètres de calcul du devis (MET-04)", () => {
  it("complète les paramètres invalides par les valeurs par défaut", () => {
    const parametres = normaliserParametres({ foisonnement: "1,25", capacite_benne: "0", pertes: "" });
    assert.equal(parametres.foisonnement, "1.25");
    assert.equal(parametres.capacite_benne, PARAMETRES_DEFAUT.capacite_benne);
    assert.equal(parametres.pertes, PARAMETRES_DEFAUT.pertes);
  });

  it("n'applique que les paramètres utilisés par le modèle", () => {
    const inputs = appliquerParametres(
      { longueur: "100", foisonnement: "1.2", capacite_benne: "15" },
      { foisonnement: "1.3", capacite_benne: "10", pertes: "8" },
    );
    assert.equal(inputs.foisonnement, "1.3");
    assert.equal(inputs.capacite_benne, "10");
    assert.equal(inputs.longueur, "100");
    // « pertes » n'est pas une entrée de ce modèle : il n'est pas ajouté.
    assert.equal("pertes" in inputs, false);
  });

  it("mémorise les paramètres sur l'appareil", () => {
    const stockage = fauxStockage();
    ecrireParametres(stockage, { foisonnement: "1.4", capacite_benne: "12", pertes: "3" });
    const relus = lireParametres(stockage);
    assert.equal(relus.foisonnement, "1.4");
    assert.equal(relus.capacite_benne, "12");
    assert.equal(relus.pertes, "3");
  });

  it("retombe sur les valeurs par défaut si rien n'est mémorisé", () => {
    const relus = lireParametres(fauxStockage());
    assert.deepEqual(relus, PARAMETRES_DEFAUT);
    assert.deepEqual(lireParametres(null), PARAMETRES_DEFAUT);
  });

  it("supporte un contenu illisible", () => {
    const stockage = fauxStockage({ "btp.devis.parametres": "{pas du json" });
    assert.deepEqual(lireParametres(stockage), PARAMETRES_DEFAUT);
  });
});
