import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { creerId } from "../identifiant.ts";

describe("identifiant de ligne creee cote navigateur", () => {
  it("produit un identifiant au format UUID v4", () => {
    const id = creerId();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("produit des identifiants differents a chaque appel", () => {
    const ids = new Set(Array.from({ length: 200 }, () => creerId()));
    assert.strictEqual(ids.size, 200);
  });
});
