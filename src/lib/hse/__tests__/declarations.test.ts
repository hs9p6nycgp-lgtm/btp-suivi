import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  actionRequise,
  accidentLePlusRecent,
  calculIndicateursHse,
  classerGravite,
  heuresTravailleesDepuisJournaux,
  resumeParType,
  type IncidentHse,
} from "../declarations.ts";

function incident(partial: Partial<IncidentHse> = {}): IncidentHse {
  return {
    id: "i1",
    chantier_id: "c1",
    type: "incident",
    date_occurrence: "2026-10-01",
    lieu: "Emprise",
    description: "Fuite d'huile",
    personnes_concernees: 0,
    accident_avec_arret: false,
    duree_arret_heures: null,
    action_immediate: "Bac de rétention posé",
    responsable: "Chef de chantier",
    photos: null,
    created_at: "2026-10-01T08:00:00Z",
    ...partial,
  };
}

describe("HSE — déclarations et indicateurs (HSE-01, HSE-03)", () => {
  describe("gravité", () => {
    it("classe un accident avec arrêt en critique", () => {
      assert.strictEqual(
        classerGravite(incident({ type: "accident_travail", accident_avec_arret: true })),
        "critique",
      );
    });

    it("classe un accident sans arrêt en moyen", () => {
      assert.strictEqual(
        classerGravite(incident({ type: "accident_travail", accident_avec_arret: false })),
        "moyen",
      );
    });

    it("classe un incident isolé en faible", () => {
      assert.strictEqual(classerGravite(incident({ type: "incident" })), "faible");
    });
  });

  describe("heures travaillées", () => {
    it("additionne les effectifs des journaux (8 h par personne et par jour)", () => {
      const heures = heuresTravailleesDepuisJournaux([
        { nombre: 10 },
        { nombre: 12 },
        { nombre: 8 },
      ]);
      assert.strictEqual(heures, 240);
    });

    it("accepte une durée de journée différente", () => {
      assert.strictEqual(heuresTravailleesDepuisJournaux([{ nombre: 10 }], 7), 70);
    });
  });

  describe("indicateurs", () => {
    const incidents = [
      incident({ id: "1", type: "accident_travail", accident_avec_arret: true, date_occurrence: "2026-09-01", duree_arret_heures: 72 }),
      incident({ id: "2", type: "incident", date_occurrence: "2026-09-20" }),
      incident({ id: "3", type: "presqu_accident", date_occurrence: "2026-10-10" }),
    ];

    it("compte les accidents, incidents et presqu'accidents", () => {
      const ind = calculIndicateursHse(incidents, 100000, new Date("2026-10-19T00:00:00"));
      assert.strictEqual(ind.accidents, 1);
      assert.strictEqual(ind.accidentsAvecArret, 1);
      assert.strictEqual(ind.incidents, 2);
      assert.strictEqual(ind.presquAccidents, 1);
    });

    it("calcule le taux de fréquence (1 accident pour 1 000 000 d'heures)", () => {
      const ind = calculIndicateursHse(incidents, 100000, new Date("2026-10-19T00:00:00"));
      assert.strictEqual(ind.tauxFrequence, 10);
      assert.strictEqual(ind.tauxEleve, true);
    });

    it("compte les jours depuis le dernier accident", () => {
      const ind = calculIndicateursHse(incidents, 100000, new Date("2026-10-19T00:00:00"));
      assert.strictEqual(ind.joursSansAccident, 48);
    });

    it("remonte un taux élevé au-delà du seuil", () => {
      const calme = calculIndicateursHse([], 100000, new Date("2026-10-19T00:00:00"));
      assert.strictEqual(calme.tauxFrequence, 0);
      assert.strictEqual(calme.tauxEleve, false);
    });

    it("trouve l'accident le plus récent", () => {
      const plusRecent = accidentLePlusRecent([
        incident({ id: "a", type: "accident_travail", date_occurrence: "2026-05-01" }),
        incident({ id: "b", type: "accident_route", date_occurrence: "2026-08-01" }),
        incident({ id: "c", type: "incident", date_occurrence: "2026-10-01" }),
      ]);
      assert.strictEqual(plusRecent?.id, "b");
    });
  });

  describe("suivi des actions", () => {
    it("exige une action après un accident avec arrêt", () => {
      assert.strictEqual(actionRequise(incident({ accident_avec_arret: true })), true);
    });

    it("exige une action si aucune action immédiate n'est notée", () => {
      assert.strictEqual(actionRequise(incident({ action_immediate: null })), true);
      assert.strictEqual(actionRequise(incident({ action_immediate: "  " })), true);
    });

    it("est satisfaite quand l'action est notée", () => {
      assert.strictEqual(actionRequise(incident({ action_immediate: "Balisage" })), false);
    });
  });

  describe("résumé par type", () => {
    it("donne le nombre de chaque type", () => {
      const resume = resumeParType([
        incident({ type: "incident" }),
        incident({ type: "incident" }),
        incident({ type: "presqu_accident" }),
      ]);
      const incidentType = resume.find((r) => r.type === "incident");
      assert.strictEqual(incidentType?.nombre, 2);
      assert.strictEqual(resume.find((r) => r.type === "presqu_accident")?.nombre, 1);
    });
  });
});
