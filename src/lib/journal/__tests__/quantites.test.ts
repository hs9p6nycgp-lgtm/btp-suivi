import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { etatPoste, formaterQuantite, messageEtatPoste } from "../quantites.ts";

describe("saisie des quantités réalisées (journal)", () => {
  it("calcule le cumul, le restant et l'avancement d'un poste", () => {
    const etat = etatPoste(8400, 2000, 1500);
    assert.equal(etat.quantiteTotale, 3500);
    assert.equal(etat.restant, 4900);
    assert.equal(Math.round(etat.avancementPct * 10) / 10, 41.7);
    assert.equal(etat.depasseSeuil, false);
  });

  it("signale l'écart quand le cumul dépasse le seuil paramétrable", () => {
    const etat = etatPoste(100, 100, 30, 10);
    assert.equal(etat.depasseSeuil, true);
    assert.equal(Math.round(etat.ecartPct * 10) / 10, 30);
  });

  it("reste calme si la quantité de marché n'est pas renseignée", () => {
    const etat = etatPoste(0, 100, 50);
    assert.equal(etat.avancementPct, 0);
    assert.equal(etat.depasseSeuil, false);
    assert.ok(messageEtatPoste(etat, "m²").includes("non renseignée"));
  });

  it("compose un message lisible avec le restant", () => {
    // La séparatrice de milliers française est une espace insécable.
    const message = messageEtatPoste(etatPoste(8400, 2000, 1500), "m²").replace(/\s/g, " ");
    assert.ok(message.includes("Réalisé 3 500 m² sur 8 400 m²"));
    assert.ok(message.includes("restant 4 900 m²"));
    assert.ok(message.includes("41,7 %"));
  });

  it("ajoute l'avertissement d'écart au message", () => {
    const message = messageEtatPoste(etatPoste(100, 100, 30, 10), "m³");
    assert.ok(message.includes("+30 %"));
    assert.ok(message.includes("seuil 10 %"));
  });

  it("formate les quantités à la française", () => {
    assert.equal(formaterQuantite(8400).replace(/\s/g, " "), "8 400");
    assert.equal(formaterQuantite(0.5), "0,5");
  });
});
