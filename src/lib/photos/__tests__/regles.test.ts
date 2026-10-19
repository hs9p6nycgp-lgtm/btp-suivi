// Tests des règles de mise en file des photos (src/lib/photos/regles.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cheminPhoto, doitMettreEnFile } from "../regles.ts";

describe("cheminPhoto", () => {
  it("range la photo dans le dossier du journal", () => {
    assert.equal(cheminPhoto("abc", "IMG_1234.jpg", 1720000000000), "journaux/abc/1720000000000-IMG_1234.jpg");
  });

  it("nettoie les noms de fichiers complexes", () => {
    const chemin = cheminPhoto("abc", "photo chantier (1).jpg", 1720000000000);
    assert.equal(chemin, "journaux/abc/1720000000000-photo-chantier-1-.jpg");
    assert.equal(chemin.includes(" "), false);
    assert.equal(chemin.includes("("), false);
  });

  it("ne produit jamais de chemin vide", () => {
    assert.equal(cheminPhoto("abc", "???", 1720000000000), "journaux/abc/1720000000000-photo.jpg");
  });
});

describe("doitMettreEnFile", () => {
  it("met en file quand le réseau est coupé", () => {
    assert.equal(doitMettreEnFile({ message: "Bucket not found" }, false), true);
  });

  it("met en file quand l'échoc vient du réseau", () => {
    assert.equal(doitMettreEnFile({ message: "Failed to fetch" }, true), true);
    assert.equal(doitMettreEnFile({ message: "TypeError: Failed to fetch" }, true), true);
    assert.equal(doitMettreEnFile({ message: "NetworkError when attempting to fetch resource" }, true), true);
    assert.equal(doitMettreEnFile({ name: "TimeoutError" }, true), true);
  });

  it("montre l'erreur quand c'est une erreur métier", () => {
    assert.equal(doitMettreEnFile({ message: "Bucket not found" }, true), false);
    assert.equal(doitMettreEnFile({ message: "row-level security violation" }, true), false);
    assert.equal(doitMettreEnFile(null, true), false);
  });
});
