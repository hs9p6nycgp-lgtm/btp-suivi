// Tests de la création robuste de fiche journal (src/lib/journal/creation.ts).
// Couvrent : insertion normale, erreur métier, réponse perdue (réseau faible),
// délai dépassé, mise en file hors ligne, stockage indisponible.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  creerJournal,
  estHorsLigne,
  payloadJournal,
  type ClientJournal,
  type EntreeJournal,
  type ErreurJournal,
} from "../creation.ts";

type Reponse = { data: { id?: string } | null; error: ErreurJournal | null };

// Faux client Supabase : ne reproduit que le chaînage utilisé par creerJournal.
function clientFactice(options: {
  insert: (payload: Record<string, unknown>) => Promise<Reponse>;
  recherche: () => Promise<Reponse>;
}): ClientJournal {
  return {
    from: () => ({
      insert: (payload: Record<string, unknown>) => ({
        select: () => ({ single: () => options.insert(payload) }),
      }),
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: options.recherche,
            }),
          }),
        }),
      }),
    }),
  } as unknown as ClientJournal;
}

const entree: EntreeJournal = {
  chantierId: "chantier-1",
  date: "2026-10-18",
  meteo: "Ensoleillé",
  observations: "Coulage du radier",
};

const erreurReseau = { message: "TypeError: Failed to fetch" };
const jamaisRepondre = () => new Promise<Reponse>(() => {});

describe("payloadJournal", () => {
  it("inclut la météo et les observations, et nettoie les espaces", () => {
    assert.deepEqual(
      payloadJournal({ chantierId: "c1", date: "2026-10-18", meteo: " Pluvieux ", observations: "  Coulage  " }),
      {
        chantier_id: "c1",
        date_journal: "2026-10-18",
        meteo: "Pluvieux",
        observations: "Coulage",
        statut: "brouillon",
      },
    );
  });

  it("transforme les champs vides en null", () => {
    assert.deepEqual(payloadJournal({ chantierId: "c1", date: "2026-10-18", meteo: "  ", observations: "" }), {
      chantier_id: "c1",
      date_journal: "2026-10-18",
      meteo: null,
      observations: null,
      statut: "brouillon",
    });
  });
});

describe("estHorsLigne", () => {
  it("détecte l'état hors ligne du navigateur", () => {
    assert.equal(estHorsLigne(false), true);
    assert.equal(estHorsLigne(true), false);
    assert.equal(estHorsLigne(undefined), false);
  });
});

describe("creerJournal", () => {
  it("insère la fiche et renvoie son id quand tout va bien", async () => {
    let payloadRecu: Record<string, unknown> | null = null;
    let fileAppelee = false;
    const resultat = await creerJournal(entree, {
      client: clientFactice({
        insert: async (payload) => {
          payloadRecu = payload;
          return { data: { id: "journal-42" }, error: null };
        },
        recherche: async () => ({ data: null, error: null }),
      }),
      mettreEnFile: async () => {
        fileAppelee = true;
        return true;
      },
    });

    assert.deepEqual(resultat, { statut: "cree", id: "journal-42" });
    assert.equal(fileAppelee, false);
    assert.deepEqual(payloadRecu, payloadJournal(entree));
  });

  it("ne met pas en file une erreur métier de la base (doublon, droits...)", async () => {
    let fileAppelee = false;
    const resultat = await creerJournal(entree, {
      client: clientFactice({
        insert: async () => ({
          data: null,
          error: { message: 'duplicate key value violates unique constraint', code: "23505" },
        }),
        recherche: async () => ({ data: null, error: null }),
      }),
      mettreEnFile: async () => {
        fileAppelee = true;
        return true;
      },
    });

    assert.equal(resultat.statut, "erreur");
    assert.equal(resultat.raison, "base");
    assert.equal(fileAppelee, false);
  });

  it("retrouve la fiche créée malgré une réponse perdue (réseau faible)", async () => {
    let fileAppelee = false;
    const resultat = await creerJournal(entree, {
      client: clientFactice({
        insert: async () => ({ data: null, error: erreurReseau }),
        recherche: async () => ({ data: { id: "journal-99" }, error: null }),
      }),
      mettreEnFile: async () => {
        fileAppelee = true;
        return true;
      },
    });

    assert.deepEqual(resultat, { statut: "cree", id: "journal-99", recupereeApresAttente: true });
    assert.equal(fileAppelee, false);
  });

  it("met en file quand le réseau ne répond pas et que la fiche n'existe pas", async () => {
    const fichier: { table?: string; payload?: Record<string, unknown> } = {};
    const resultat = await creerJournal(entree, {
      client: clientFactice({
        insert: async () => ({ data: null, error: erreurReseau }),
        recherche: async () => ({ data: null, error: null }),
      }),
      mettreEnFile: async (table, payload) => {
        fichier.table = table;
        fichier.payload = payload;
        return true;
      },
    });

    assert.deepEqual(resultat, { statut: "en_attente" });
    assert.equal(fichier.table, "journaux");
    assert.equal(fichier.payload?.observations, "Coulage du radier");
  });

  it("signale une erreur si la mise en file est impossible (stockage plein)", async () => {
    const resultat = await creerJournal(entree, {
      client: clientFactice({
        insert: async () => ({ data: null, error: erreurReseau }),
        recherche: async () => ({ data: null, error: null }),
      }),
      mettreEnFile: async () => false,
    });

    assert.equal(resultat.statut, "erreur");
    assert.equal(resultat.raison, "stockage_indisponible");
  });

  it("hors ligne : met en file sans tenter l'insertion", async () => {
    let insertionTentee = false;
    let fileAppelee = false;
    const resultat = await creerJournal(entree, {
      client: clientFactice({
        insert: async () => {
          insertionTentee = true;
          return { data: null, error: null };
        },
        recherche: async () => ({ data: null, error: null }),
      }),
      mettreEnFile: async () => {
        fileAppelee = true;
        return true;
      },
      horsLigne: true,
    });

    assert.deepEqual(resultat, { statut: "en_attente" });
    assert.equal(insertionTentee, false);
    assert.equal(fileAppelee, true);
  });

  it("délai dépassé : vérifie puis récupère la fiche créée en arrière-plan", async () => {
    const resultat = await creerJournal(entree, {
      client: clientFactice({
        insert: jamaisRepondre,
        recherche: async () => ({ data: { id: "journal-lent" }, error: null }),
      }),
      mettreEnFile: async () => true,
      delaiMs: 20,
      delaiVerificationMs: 50,
    });

    assert.deepEqual(resultat, { statut: "cree", id: "journal-lent", recupereeApresAttente: true });
  });

  it("délai dépassé et fiche introuvable : met en file", async () => {
    const resultat = await creerJournal(entree, {
      client: clientFactice({
        insert: jamaisRepondre,
        recherche: async () => ({ data: null, error: null }),
      }),
      mettreEnFile: async () => true,
      delaiMs: 20,
      delaiVerificationMs: 20,
    });

    assert.deepEqual(resultat, { statut: "en_attente" });
  });
});
