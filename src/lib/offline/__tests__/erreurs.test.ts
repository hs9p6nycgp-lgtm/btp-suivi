// Tests de la détection d'erreurs réseau (src/lib/offline/erreurs.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estErreurReseau } from "../erreurs.ts";

describe("estErreurReseau", () => {
  it("reconnaît les erreurs de fetch des navigateurs", () => {
    assert.equal(estErreurReseau({ message: "TypeError: Failed to fetch" }), true);
    assert.equal(estErreurReseau({ message: "NetworkError when attempting to fetch resource." }), true);
    assert.equal(estErreurReseau({ message: "net::ERR_INTERNET_DISCONNECTED" }), true);
    assert.equal(estErreurReseau({ message: "Load failed" }), true);
  });

  it("reconnaît les erreurs réseau de Node / supabase-js", () => {
    assert.equal(estErreurReseau({ message: "fetch failed" }), true);
    assert.equal(estErreurReseau({ message: "connect ECONNREFUSED 127.0.0.1:54321" }), true);
    assert.equal(estErreurReseau({ message: "getaddrinfo ENOTFOUND" }), true);
    assert.equal(estErreurReseau({ message: "socket hang up" }), true);
  });

  it("reconnaît les abandons (délai dépassé)", () => {
    assert.equal(estErreurReseau({ name: "AbortError", message: "signal is aborted without reason" }), true);
    assert.equal(estErreurReseau({ message: "The operation was aborted." }), true);
  });

  it("ne confond pas les erreurs de la base avec des erreurs réseau", () => {
    assert.equal(
      estErreurReseau({ message: 'duplicate key value violates unique constraint "journaux_pkey"', code: "23505" }),
      false,
    );
    assert.equal(estErreurReseau({ message: "JWT expired", code: "PGRST301" }), false);
    assert.equal(estErreurReseau({ message: "new row violates row-level security policy" }), false);
  });

  it("supporte les valeurs vides", () => {
    assert.equal(estErreurReseau(null), false);
    assert.equal(estErreurReseau(undefined), false);
    assert.equal(estErreurReseau({}), false);
  });
});
