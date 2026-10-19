import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cheminPhotoNonConformite,
  etatEcheanceNC,
  formaterDateNC,
  libelleGraviteNC,
  libelleStatutNC,
  validerSuiviNC,
} from "../nonConformites.ts";

describe("fiches de non-conformité (QUA-03, RG-04)", () => {
  it("traduit les statuts et gravités en français", () => {
    assert.equal(libelleStatutNC("ouverte"), "Ouverte");
    assert.equal(libelleStatutNC("cloturee"), "Clôturée");
    assert.equal(libelleStatutNC("rejetee"), "Rejetée");
    assert.equal(libelleGraviteNC("critique"), "Critique");
    assert.equal(libelleGraviteNC("inconnue"), "Inconnue");
  });

  it("formate les dates en JJ/MM/AAAA", () => {
    assert.equal(formaterDateNC("2026-10-30"), "30/10/2026");
    assert.equal(formaterDateNC(null), "");
  });

  it("signale une fiche en retard", () => {
    const etat = etatEcheanceNC(
      { statut: "ouverte", echeance: "2026-10-15" },
      new Date(2026, 9, 19),
    );
    assert.equal(etat.enRetard, true);
    assert.equal(etat.clos, false);
    assert.equal(etat.libelle, "En retard de 4 jour(s)");
  });

  it("annonce les jours restants", () => {
    const etat = etatEcheanceNC(
      { statut: "ouverte", echeance: "2026-10-25" },
      new Date(2026, 9, 19),
    );
    assert.equal(etat.enRetard, false);
    assert.equal(etat.joursRestants, 6);
    assert.equal(etat.libelle, "Dans 6 jour(s)");
  });

  it("considère une fiche clôturée comme terminée", () => {
    const etat = etatEcheanceNC(
      { statut: "cloturee", echeance: "2026-10-15", date_cloture: "2026-10-18" },
      new Date(2026, 9, 19),
    );
    assert.equal(etat.clos, true);
    assert.equal(etat.enRetard, false);
    assert.equal(etat.libelle, "Clôturée le 18/10/2026");
  });

  it("gère l'absence d'échéance", () => {
    const etat = etatEcheanceNC({ statut: "ouverte" }, new Date(2026, 9, 19));
    assert.equal(etat.libelle, "Sans échéance");
    assert.equal(etat.joursRestants, null);
  });

  it("exige un responsable et une action corrective", () => {
    const vide = validerSuiviNC({ responsable: " ", action_corrective: "", echeance: "" });
    assert.equal(vide.ok, false);
    assert.equal(vide.erreurs.length, 2);

    const complet = validerSuiviNC({
      responsable: "Chef de chantier",
      action_corrective: "Reprise de la couche de fondation",
      echeance: "2026-10-30",
    });
    assert.equal(complet.ok, true);
  });

  it("rend l'action corrective obligatoire pour clôturer", () => {
    const resultat = validerSuiviNC(
      { responsable: "Chef de chantier", action_corrective: "", echeance: "" },
      { cloture: true },
    );
    assert.equal(resultat.ok, false);
    assert.ok(resultat.erreurs.some((e) => e.includes("clôturer")));
  });

  it("range la photo d'une non-conformité dans son propre dossier", () => {
    // Le nom est nettoyé (accents et espaces remplacés) pour un stockage sûr.
    assert.equal(
      cheminPhotoNonConformite("nc-1", "Défaut enrobé.jpg", 1729400000000),
      "non-conformites/nc-1/1729400000000-D-faut-enrob-.jpg",
    );
    assert.equal(
      cheminPhotoNonConformite("nc-1", "photo.JPG", 1),
      "non-conformites/nc-1/1-photo.JPG",
    );
  });
});
