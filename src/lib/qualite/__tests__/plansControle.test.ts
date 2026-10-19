import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estConforme } from "../../calculs/qualite.ts";
import {
  MODELES_BATIMENT,
  MODELES_ROUTE,
  bornesPlan,
  formaterNombre,
  modelesPlanControle,
  nomParametre,
  normaliserParametre,
  parametresEquivalents,
  plansManquants,
  texteIntervalle,
  validerPlan,
  valeursPlanDepuisModele,
} from "../plansControle.ts";

describe("plan de contrôle qualité (QUA-01)", () => {
  it("lit le paramètre quelle que soit l'écriture de la colonne", () => {
    assert.equal(nomParametre({ parametre: "Épaisseur" }), "Épaisseur");
    assert.equal(nomParametre({ "paramètre": "Épaisseur" }), "Épaisseur");
    assert.equal(nomParametre({ parametre: "", "paramètre": "Dévers" }), "Dévers");
    assert.equal(nomParametre(null), "");
  });

  it("compare les paramètres sans tenir compte des accents ni de la casse", () => {
    assert.equal(normaliserParametre("Épaisseur de la chaussée"), "epaisseur de la chaussee");
    assert.ok(parametresEquivalents("Épaisseur de la chaussée", "epaisseur de la chaussee"));
    assert.ok(!parametresEquivalents("Épaisseur", "Largeur"));
    assert.ok(!parametresEquivalents("", ""));
  });

  it("propose des modèles de contrôles par type d'ouvrage", () => {
    assert.equal(modelesPlanControle("route"), MODELES_ROUTE);
    assert.equal(modelesPlanControle("batiment"), MODELES_BATIMENT);
    assert.equal(modelesPlanControle("inconnu"), MODELES_ROUTE);
    for (const modele of [...MODELES_ROUTE, ...MODELES_BATIMENT]) {
      assert.ok(modele.parametre.length > 0, "paramètre renseigné");
      assert.ok(modele.unite.length > 0, "unité renseignée");
      assert.ok(modele.valeurExigee >= 0, "valeur exigée positive ou nulle");
      assert.ok(modele.tolerancePos >= 0 && modele.toleranceNeg >= 0, "tolérances positives");
    }
  });

  it("couvre les contrôles cités par le cahier des charges", () => {
    const noms = [...MODELES_ROUTE, ...MODELES_BATIMENT].map((m) => normaliserParametre(m.parametre)).join(" ");
    for (const attendu of [
      "epaisseur",
      "devers",
      "compacite",
      "affaissement",
      "resistance",
      "implantation",
    ]) {
      assert.ok(noms.includes(attendu), `modèle « ${attendu} » présent`);
    }
  });

  it("valide la saisie d'un paramètre", () => {
    const valide = validerPlan({
      parametre: "Épaisseur",
      unite: "cm",
      valeur_exigee: "5",
      tolerance_pos: "1",
      tolerance_neg: "1",
    });
    assert.equal(valide.ok, true);
    assert.deepEqual(valide.erreurs, []);

    const vide = validerPlan({
      parametre: "  ",
      unite: "",
      valeur_exigee: "abc",
      tolerance_pos: "-1",
      tolerance_neg: "0",
    });
    assert.equal(vide.ok, false);
    assert.equal(vide.erreurs.length, 4);
  });

  it("refuse une valeur exigée nulle sans tolérance", () => {
    const resultat = validerPlan({
      parametre: "Écart d'implantation",
      unite: "m",
      valeur_exigee: "0",
      tolerance_pos: "0",
      tolerance_neg: "0",
    });
    assert.equal(resultat.ok, false);
    assert.ok(resultat.erreurs.some((e) => e.includes("tolérance")));
  });

  it("calcule les bornes et l'intervalle accepté", () => {
    const bornes = bornesPlan({ valeur_exigee: 25, tolerance_pos: 20, tolerance_neg: 0 });
    assert.deepEqual(bornes, { min: 25, max: 45 });

    assert.equal(
      texteIntervalle({ valeur_exigee: 95, tolerance_pos: 5, tolerance_neg: 0, unite: "% OPM" }),
      "≥ 95 % OPM",
    );
    assert.equal(
      texteIntervalle({ valeur_exigee: 5, tolerance_pos: 0, tolerance_neg: 5, unite: "mm" }),
      "≤ 5 mm",
    );
    assert.equal(
      texteIntervalle({ valeur_exigee: 7, tolerance_pos: 0.15, tolerance_neg: 0.15, unite: "m" }),
      "7 ± 0,15 m (6,85 à 7,15)",
    );
    assert.equal(
      texteIntervalle({ valeur_exigee: 20, tolerance_pos: 0, tolerance_neg: 0, unite: "cm" }),
      "20 cm (valeur exacte)",
    );
  });

  it("formate les nombres à la française", () => {
    assert.equal(formaterNombre(0.15), "0,15");
    // La separating francaise est une espace insecable : on la normalise.
    assert.equal(formaterNombre(2500).replace(/\s/g, " "), "2 500");
  });

  it("ne propose que les modèles absents du plan existant", () => {
    const manquants = plansManquants(MODELES_ROUTE, ["largeur de la chaussée", "Dévers en alignement"]);
    assert.ok(!manquants.some((m) => m.parametre === "Largeur de la chaussée"));
    assert.ok(!manquants.some((m) => m.parametre === "Dévers en alignement"));
    assert.equal(manquants.length, MODELES_ROUTE.length - 2);
  });

  it("prépare les colonnes d'un modèle pour l'enregistrement", () => {
    const modele = MODELES_BATIMENT[0];
    const valeurs = valeursPlanDepuisModele(modele, "batiment");
    assert.equal(valeurs.type_ouvrage, "batiment");
    assert.equal(valeurs.parametre, modele.parametre);
    assert.equal(valeurs.valeur_exigee, modele.valeurExigee);
    assert.equal(valeurs.tolerance_pos, modele.tolerancePos);
    assert.equal(valeurs.tolerance_neg, modele.toleranceNeg);
    assert.equal(valeurs.unite, modele.unite);
  });

  it("applique les tolérances du plan lors du contrôle d'un essai (RG-04)", () => {
    const resistance = valeursPlanDepuisModele(
      MODELES_BATIMENT.find((m) => m.parametre.includes("Résistance"))!,
      "batiment",
    );
    assert.equal(estConforme(25, resistance.valeur_exigee, resistance.tolerance_pos, resistance.tolerance_neg), true);
    assert.equal(estConforme(30, resistance.valeur_exigee, resistance.tolerance_pos, resistance.tolerance_neg), true);
    assert.equal(estConforme(20, resistance.valeur_exigee, resistance.tolerance_pos, resistance.tolerance_neg), false);

    const temperature = valeursPlanDepuisModele(
      MODELES_BATIMENT.find((m) => m.parametre.includes("Température"))!,
      "batiment",
    );
    assert.equal(estConforme(28, temperature.valeur_exigee, temperature.tolerance_pos, temperature.tolerance_neg), true);
    assert.equal(estConforme(33, temperature.valeur_exigee, temperature.tolerance_pos, temperature.tolerance_neg), false);
  });
});
