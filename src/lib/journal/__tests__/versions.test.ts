import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  construireVersion,
  prochaineVersion,
  resumeVersion,
  versionsTriees,
} from "../versions.ts";

describe("versions tracées du journal (RG-02)", () => {
  it("calcule le numéro de la prochaine version", () => {
    assert.equal(prochaineVersion([]), 1);
    assert.equal(prochaineVersion([{ version: 1 }, { version: 3 }]), 4);
  });

  it("construit l'instantané du journal avec son motif", () => {
    const version = construireVersion(
      {
        meteo: "Soleil",
        observations: "Couche de base terminée",
        effectif: [{ corps_metier: "Terrassiers", nombre: 5 }],
        engins: [{ type_engin: "Pelleteuse", heures_marche: 8 }],
        incidents: [{ type: "panne", duree_heures: 2 }],
        quantites: [{ poste_dqe_id: "p1", quantite: 2000 }],
        photos: [{ chemin: "a.jpg" }],
      },
      "  Météo erronée  ",
      2,
    );
    assert.equal(version.version, 2);
    assert.equal(version.motif, "Météo erronée");
    assert.equal(version.meteo, "Soleil");
    assert.equal(version.effectif.length, 1);
    assert.equal(version.photos.length, 1);
  });

  it("résume le contenu d'une version", () => {
    const version = construireVersion(
      {
        effectif: [{ corps_metier: "Terrassiers", nombre: 5 }, { corps_metier: "Maçons", nombre: 3 }],
        engins: [{ type_engin: "Pelleteuse", heures_marche: 8.5 }],
        incidents: [{ type: "panne" }],
        quantites: [{ poste_dqe_id: "p1", quantite: 2000 }],
        photos: [{ chemin: "a.jpg" }],
      },
      null,
      1,
    );
    const resume = resumeVersion(version);
    assert.ok(resume.includes("8 personne(s)"));
    assert.ok(resume.includes("8,5 h de marche"));
    assert.ok(resume.includes("1 incident(s)"));
    assert.ok(resume.includes("1 quantité(s)"));
    assert.ok(resume.includes("1 photo(s)"));
  });

  it("indique un journal sans saisie", () => {
    assert.equal(resumeVersion(construireVersion({}, null, 1)), "Journal sans saisie.");
  });

  it("trie les versions de la plus récente à la plus ancienne", () => {
    const triees = versionsTriees([
      { version: 1, motif: null, meteo: null, observations: null, effectif: [], engins: [], incidents: [], quantites: [], photos: [], created_at: "2026-10-19" },
      { version: 3, motif: null, meteo: null, observations: null, effectif: [], engins: [], incidents: [], quantites: [], photos: [], created_at: "2026-10-21" },
      { version: 2, motif: null, meteo: null, observations: null, effectif: [], engins: [], incidents: [], quantites: [], photos: [], created_at: "2026-10-20" },
    ]);
    assert.deepEqual(triees.map((v) => v.version), [3, 2, 1]);
  });
});
