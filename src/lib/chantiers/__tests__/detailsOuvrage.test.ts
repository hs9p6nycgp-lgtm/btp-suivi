import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  colonnesDetailsOuvrage,
  detailsOuvrageDepuisChantier,
  detailsOuvrageVides,
  hauteurTotaleBatiment,
  type DetailsOuvrage,
} from "../detailsOuvrage.ts";

function details(partiel: Partial<DetailsOuvrage>): DetailsOuvrage {
  return { ...detailsOuvrageVides(), ...partiel };
}

describe("description de l'ouvrage (modele 3D)", () => {
  it("calcule la hauteur totale d'un batiment avec sous-sols", () => {
    assert.equal(
      hauteurTotaleBatiment(details({ nbSousSols: "2", nbEtages: "3", hauteurNiveau: "3.5" })),
      21,
    );
  });

  it("garde la hauteur nulle si la hauteur par niveau est absente", () => {
    assert.equal(hauteurTotaleBatiment(details({ hauteurNiveau: "" })), null);
  });

  it("convertit les champs batiment et remet la route a null", () => {
    const colonnes = colonnesDetailsOuvrage(
      "batiment",
      details({
        longueur: "24",
        largeur: "12",
        nbSousSols: "1",
        nbEtages: "2",
        hauteurNiveau: "3",
        nbTraveesLongueur: "4",
        nbTraveesLargeur: "2",
        typeStructure: "voiles",
        typeToiture: "tole",
      }),
    );
    assert.equal(colonnes.longueur, 24);
    assert.equal(colonnes.largeur, 12);
    assert.equal(colonnes.hauteur, 12); // (1 sous-sol + RDC + 2 etages) x 3 m
    assert.equal(colonnes.nb_sous_sols, 1);
    assert.equal(colonnes.nb_etages, 2);
    assert.equal(colonnes.hauteur_niveau, 3);
    assert.equal(colonnes.nb_travees_longueur, 4);
    assert.equal(colonnes.nb_travees_largeur, 2);
    assert.equal(colonnes.type_structure, "voiles");
    assert.equal(colonnes.type_toiture, "tole");
    assert.equal(colonnes.nb_voies, null);
    assert.equal(colonnes.largeur_accotement, null);
    assert.equal(colonnes.type_revetement, null);
  });

  it("convertit les champs route et remet le batiment a null", () => {
    const colonnes = colonnesDetailsOuvrage(
      "route",
      details({
        longueur: "2500",
        largeur: "7",
        nbVoies: "4",
        largeurAccotement: "1.5",
        typeRevetement: "beton",
      }),
    );
    assert.equal(colonnes.longueur, 2500);
    assert.equal(colonnes.largeur, 7);
    assert.equal(colonnes.nb_voies, 4);
    assert.equal(colonnes.largeur_accotement, 1.5);
    assert.equal(colonnes.type_revetement, "beton");
    assert.equal(colonnes.hauteur, null);
    assert.equal(colonnes.nb_etages, null);
    assert.equal(colonnes.type_toiture, null);
  });

  it("borne les valeurs extremes", () => {
    const route = colonnesDetailsOuvrage(
      "route",
      details({ nbVoies: "99", largeurAccotement: "50" }),
    );
    assert.equal(route.nb_voies, 6);
    assert.equal(route.largeur_accotement, 20);

    const batiment = colonnesDetailsOuvrage(
      "batiment",
      details({ hauteurNiveau: "1", nbEtages: "80" }),
    );
    assert.equal(batiment.hauteur_niveau, 2);
    assert.equal(batiment.nb_etages, 50);

    const vide = colonnesDetailsOuvrage("batiment", details({ nbSousSols: "", nbEtages: "" }));
    assert.equal(vide.nb_sous_sols, 0);
    assert.equal(vide.nb_etages, 0);
  });

  it("deduit les etages d'un ancien chantier depuis la hauteur", () => {
    const d = detailsOuvrageDepuisChantier("batiment", { longueur: 20, largeur: 10, hauteur: 9 });
    assert.equal(d.nbEtages, "2");
    assert.equal(d.hauteurNiveau, "3");
    assert.equal(d.longueur, "20");
    assert.equal(d.nbSousSols, "0");
  });

  it("relit les champs deja enregistres", () => {
    const d = detailsOuvrageDepuisChantier("batiment", {
      nb_sous_sols: 1,
      nb_etages: 3,
      hauteur_niveau: 3.5,
      type_toiture: "tole",
    });
    assert.equal(d.nbSousSols, "1");
    assert.equal(d.nbEtages, "3");
    assert.equal(d.hauteurNiveau, "3.5");
    assert.equal(d.typeToiture, "tole");
  });
});
