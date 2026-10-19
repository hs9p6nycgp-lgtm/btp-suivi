import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  colonnesDetailsOuvrage,
  descriptionOuvrage,
  detailsOuvrageDepuisChantier,
  detailsOuvrageVides,
  formaterSurface,
  hauteurTotaleBatiment,
  niveauxDepuisDetails,
  surfacesOuvrage,
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

describe("affichage et niveaux a suivre", () => {
  it("genere les niveaux dans l'ordre sous-sols, RDC puis etages", () => {
    assert.deepEqual(niveauxDepuisDetails(details({ nbSousSols: "2", nbEtages: "2" })), [
      "Sous-sol 2",
      "Sous-sol 1",
      "RDC",
      "R+1",
      "R+2",
    ]);
    assert.deepEqual(niveauxDepuisDetails(details({ nbSousSols: "1", nbEtages: "0" })), [
      "Sous-sol",
      "RDC",
    ]);
    assert.deepEqual(niveauxDepuisDetails(details({ nbSousSols: "0", nbEtages: "1" })), [
      "RDC",
      "R+1",
    ]);
  });

  it("resume un batiment pour la fiche", () => {
    const lignes = descriptionOuvrage({
      type: "batiment",
      nb_sous_sols: 1,
      nb_etages: 3,
      hauteur_niveau: 3,
      nb_travees_longueur: 4,
      nb_travees_largeur: 2,
      type_structure: "poteaux_poutres",
      type_toiture: "tole",
    });
    const valeurs = Object.fromEntries(lignes.map((l) => [l.libelle, l.valeur]));
    assert.equal(valeurs["Sous-sols"], "1");
    assert.equal(valeurs["Niveaux"], "RDC + 3 étages");
    assert.equal(valeurs["Hauteur par niveau"], "3 m");
    assert.equal(valeurs["Travées"], "4 × 2");
    assert.equal(valeurs["Structure"], "Poteaux-poutres (ossature)");
    assert.equal(valeurs["Toiture"], "Toiture tôle (2 pans)");
  });

  it("resume une route pour la fiche", () => {
    const lignes = descriptionOuvrage({
      type: "route",
      nb_voies: 4,
      largeur_accotement: 1.5,
      type_revetement: "beton",
    });
    const valeurs = Object.fromEntries(lignes.map((l) => [l.libelle, l.valeur]));
    assert.equal(valeurs["Voies"], "4 voies");
    assert.equal(valeurs["Accotements"], "1,5 m");
    assert.equal(valeurs["Revêtement"], "Béton de ciment");
  });

  it("ne renvoie rien pour un ancien chantier sans details", () => {
    assert.deepEqual(descriptionOuvrage({ type: "batiment" }), []);
    assert.deepEqual(descriptionOuvrage({ type: "route" }), []);
  });
});

describe("surfaces indicatives", () => {
  it("calcule emprise, planchers et sous-sols d'un batiment", () => {
    const lignes = surfacesOuvrage({
      type: "batiment",
      longueur: 24,
      largeur: 12,
      nb_sous_sols: 1,
      nb_etages: 3,
    });
    const valeurs = Object.fromEntries(lignes.map((l) => [l.libelle, l.valeur]));
    assert.equal(valeurs["Emprise au sol"], formaterSurface(288));
    assert.equal(valeurs["Surface planchers"], formaterSurface(1152));
    assert.equal(valeurs["Surface sous-sols"], formaterSurface(288));
  });

  it("ne calcule pas les planchers sans nombre d'etages connu", () => {
    const lignes = surfacesOuvrage({ type: "batiment", longueur: 20, largeur: 10 });
    const valeurs = Object.fromEntries(lignes.map((l) => [l.libelle, l.valeur]));
    assert.equal(valeurs["Emprise au sol"], formaterSurface(200));
    assert.equal(valeurs["Surface planchers"], undefined);
  });

  it("calcule la chaussee et les accotements d'une route", () => {
    const lignes = surfacesOuvrage({
      type: "route",
      longueur: 2500,
      largeur: 7,
      largeur_accotement: 1.5,
    });
    const valeurs = Object.fromEntries(lignes.map((l) => [l.libelle, l.valeur]));
    assert.equal(valeurs["Surface chaussée"], "1,75 ha");
    assert.equal(valeurs["Surface accotements"], formaterSurface(7500));
  });

  it("signale les accotements estimes a 20 % quand leur largeur manque", () => {
    const lignes = surfacesOuvrage({ type: "route", longueur: 1000, largeur: 10 });
    const valeurs = Object.fromEntries(lignes.map((l) => [l.libelle, l.valeur]));
    assert.equal(valeurs["Surface chaussée"], "1 ha");
    assert.equal(valeurs["Surface accotements (20 %)"], formaterSurface(4000));
  });

  it("ne renvoie rien sans longueur ou largeur", () => {
    assert.deepEqual(surfacesOuvrage({ type: "batiment" }), []);
    assert.deepEqual(surfacesOuvrage({ type: "route", longueur: 2500 }), []);
  });
});
