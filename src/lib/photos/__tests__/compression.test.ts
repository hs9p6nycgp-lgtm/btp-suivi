// Tests du redimensionnement des photos (src/lib/photos/compression.ts).
// La compression elle-même (canvas) se teste dans le navigateur ;
// ici on vérifie le calcul des dimensions, qui est la partie critique.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dimensionsReduites } from "../compression.ts";

describe("dimensionsReduites", () => {
  it("réduit une grande photo en conservant les proportions (paysage)", () => {
    assert.deepEqual(dimensionsReduites(3200, 2400, 1600), { largeur: 1600, hauteur: 1200 });
  });

  it("réduit une grande photo en conservant les proportions (portrait)", () => {
    assert.deepEqual(dimensionsReduites(800, 2000, 1600), { largeur: 640, hauteur: 1600 });
  });

  it("laisse intacte une photo déjà petite", () => {
    assert.deepEqual(dimensionsReduites(1200, 900, 1600), { largeur: 1200, hauteur: 900 });
  });

  it("arrondit sans jamais descendre sous 1 pixel", () => {
    assert.deepEqual(dimensionsReduites(1001, 500, 1000), { largeur: 1000, hauteur: 500 });
    assert.deepEqual(dimensionsReduites(4000, 3, 1000), { largeur: 1000, hauteur: 1 });
  });

  it("supporte les dimensions nulles ou invalides", () => {
    assert.deepEqual(dimensionsReduites(0, 0, 1600), { largeur: 0, hauteur: 0 });
  });
});
