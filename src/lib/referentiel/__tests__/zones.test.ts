import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prixPourZone, prixAvecZone } from "../zones";

describe("prix par zone geographique (REF-08)", () => {
  const zones = [
    { zone: "Abidjan", coefficientTransport: 1.0 },
    { zone: "Yamoussoukro", coefficientTransport: 1.15 },
    { zone: "San-Pedro", coefficientTransport: 1.20 },
  ];

  it("applique le coefficient de transport", () => {
    assert.strictEqual(prixAvecZone(100000, 1.15), 115000);
  });

  it("retourne le prix de base si pas de zone", () => {
    assert.strictEqual(prixPourZone(100000, zones, null), 100000);
  });

  it("applique le coefficient de la zone", () => {
    assert.strictEqual(prixPourZone(100000, zones, "Yamoussoukro"), 115000);
    assert.strictEqual(prixPourZone(100000, zones, "San-Pedro"), 120000);
  });

  it("retourne le prix de base si zone inconnue", () => {
    assert.strictEqual(prixPourZone(100000, zones, "Inconnue"), 100000);
  });
});