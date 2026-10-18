import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DICTIONNAIRE, traduireErreur } from "../i18n.ts";

describe("traduireErreur", () => {
  it("traduit les erreurs connues", () => {
    assert.strictEqual(
      traduireErreur({ message: "Invalid login credentials" }),
      DICTIONNAIRE["err.invalid_credentials"].fr,
    );
  });

  it("detecte une colonne manquante (PGRST204) et garde le detail", () => {
    const r = traduireErreur({
      code: "PGRST204",
      message: "Could not find the 'hauteur' column of 'chantiers' in the schema cache",
    });
    assert.ok(r.includes("n'est pas à jour"));
    assert.ok(r.includes("hauteur"));
  });

  it("detecte une table manquante", () => {
    const r = traduireErreur({
      code: "42P01",
      message: 'relation "public.livraisons_suivi" does not exist',
    });
    assert.ok(r.includes("table"));
  });

  it("detecte une violation de securite RLS", () => {
    assert.strictEqual(
      traduireErreur({
        code: "42501",
        message: 'new row violates row-level security policy for table "chantiers"',
      }),
      DICTIONNAIRE["err.rls"].fr,
    );
  });

  it("detecte une violation de cle etrangere", () => {
    assert.strictEqual(
      traduireErreur({
        code: "23503",
        message: 'insert or update on table "chantiers" violates foreign key constraint',
      }),
      DICTIONNAIRE["err.fk"].fr,
    );
  });

  it("garde le message d'origine pour les erreurs inconnues", () => {
    const r = traduireErreur({ message: "Erreur bizarre XYZ" });
    assert.ok(r.includes("Erreur bizarre XYZ"));
  });
});
