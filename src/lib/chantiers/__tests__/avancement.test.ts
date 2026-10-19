import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cadenceHebdo,
  dateFinEstimee,
  datePoint,
  dernierPoint,
  joursEstimesRestants,
  normaliserPoints,
  premierPoint,
  resumerProgression,
  type PointAvancement,
} from "../avancement.ts";

function point(date: string, pct: number, extra: Partial<PointAvancement> = {}): PointAvancement {
  return {
    id: extra.id ?? `${date}-${pct}`,
    date_point: date,
    avancement_pct: pct,
    commentaire: extra.commentaire ?? null,
    created_at: extra.created_at ?? null,
    ...extra,
  };
}

const REF = new Date("2026-01-15T00:00:00Z");

describe("datePoint", () => {
  it("lit une date simple ou rejette une date invalide", () => {
    assert.equal(datePoint("2026-01-15")?.toISOString().slice(0, 10), "2026-01-15");
    assert.equal(datePoint("2026-13-45"), null);
    assert.equal(datePoint(null), null);
  });
});

describe("normaliserPoints", () => {
  it("trie les points par date croissante", () => {
    const liste = normaliserPoints([point("2026-03-01", 70), point("2026-01-01", 10), point("2026-02-01", 40)]);
    assert.deepEqual(
      liste.map((p) => p.date_point),
      ["2026-01-01", "2026-02-01", "2026-03-01"],
    );
  });

  it("fusionne les doublons de date en gardant le plus recent", () => {
    const liste = normaliserPoints([
      point("2026-01-01", 10, { id: "a", created_at: "2026-01-01T08:00:00Z" }),
      point("2026-01-01", 30, { id: "b", created_at: "2026-01-02T09:00:00Z" }),
      point("2026-01-08", 50),
    ]);
    assert.equal(liste.length, 2);
    assert.equal(liste[0].avancement_pct, 30);
    assert.equal(liste[1].avancement_pct, 50);
  });

  it("ignore les dates invalides", () => {
    const liste = normaliserPoints([point("pas une date", 10), point("2026-01-01", 20)]);
    assert.equal(liste.length, 1);
    assert.equal(liste[0].avancement_pct, 20);
  });

  it("renvoie un tableau vide sans point", () => {
    assert.deepEqual(normaliserPoints(null), []);
    assert.deepEqual(normaliserPoints([]), []);
  });
});

describe("premierPoint / dernierPoint", () => {
  it("donne les bornes de la serie", () => {
    const points = [point("2026-03-01", 70), point("2026-01-01", 10), point("2026-02-01", 40)];
    assert.equal(premierPoint(points)?.avancement_pct, 10);
    assert.equal(dernierPoint(points)?.avancement_pct, 70);
    assert.equal(premierPoint([]), null);
    assert.equal(dernierPoint(null), null);
  });
});

describe("cadenceHebdo", () => {
  it("calcule la cadence en points par semaine", () => {
    // 28 points de % en 28 jours -> 7 points par semaine
    assert.equal(cadenceHebdo([point("2026-01-01", 0), point("2026-01-29", 28)]), 7);
    // 20 points en 14 jours -> 10 points par semaine
    assert.equal(cadenceHebdo([point("2026-01-01", 40), point("2026-01-15", 60)]), 10);
  });

  it("renvoie null si non calculable et garde le signe si l'avancement recule", () => {
    assert.equal(cadenceHebdo([point("2026-01-01", 40)]), null);
    assert.equal(cadenceHebdo(null), null);
    assert.equal(cadenceHebdo([point("2026-01-01", 50), point("2026-01-08", 40)]), -10);
  });
});

describe("joursEstimesRestants", () => {
  it("projette les jours restants au rythme constate", () => {
    // 60 % au 15/01, cadence 10 %/semaine -> 28 jours (4 semaines)
    assert.equal(joursEstimesRestants([point("2026-01-01", 40), point("2026-01-15", 60)]), 28);
  });

  it("renvoie 0 quand l'objectif est atteint", () => {
    assert.equal(joursEstimesRestants([point("2026-01-01", 0), point("2026-01-15", 100)]), 0);
  });

  it("renvoie null si la cadence est nulle ou negative", () => {
    assert.equal(joursEstimesRestants([point("2026-01-01", 50), point("2026-01-08", 40)]), null);
    assert.equal(joursEstimesRestants([point("2026-01-08", 50)]), null);
  });
});

describe("dateFinEstimee", () => {
  it("projette depuis le dernier point", () => {
    const points = [point("2026-01-01", 40), point("2026-01-15", 60)];
    assert.equal(dateFinEstimee(points, REF), "2026-02-12");
  });

  it("projette depuis la reference quand elle est plus recente que le dernier point", () => {
    const points = [point("2026-01-01", 40), point("2026-01-15", 60)];
    assert.equal(dateFinEstimee(points, new Date("2026-03-01T00:00:00Z")), "2026-03-29");
  });

  it("renvoie null sans cadence exploitable", () => {
    assert.equal(dateFinEstimee([point("2026-01-15", 60)], REF), null);
  });
});

describe("resumerProgression", () => {
  it("rassemble ecart, cadence et projection", () => {
    const resume = resumerProgression(
      [point("2026-01-01", 40, { id: "a" }), point("2026-01-15", 60, { id: "b" })],
      REF,
    );
    assert.equal(resume.nbPoints, 2);
    assert.equal(resume.ecart, 20);
    assert.equal(resume.cadenceHebdo, 10);
    assert.equal(resume.joursEstimes, 28);
    assert.equal(resume.dateFinEstimee, "2026-02-12");
    assert.equal(resume.dernier?.avancement_pct, 60);
  });

  it("reste vide sans point", () => {
    const resume = resumerProgression([], REF);
    assert.equal(resume.nbPoints, 0);
    assert.equal(resume.premier, null);
    assert.equal(resume.ecart, null);
    assert.equal(resume.cadenceHebdo, null);
    assert.equal(resume.dateFinEstimee, null);
  });
});
