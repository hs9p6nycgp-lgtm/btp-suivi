// Tests de la mémoire du dernier chantier (src/lib/chantiers/dernier.ts).

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  CLE_DERNIER_CHANTIER,
  lireDernierChantier,
  memoriserDernierChantier,
  oublierDernierChantier,
} from "../dernier.ts";

const donnees = new Map<string, string>();
let precedent: PropertyDescriptor | undefined;

function stubLocalStorage(): PropertyDescriptor {
  return {
    configurable: true,
    writable: true,
    value: {
      getItem: (cle: string) => donnees.get(cle) ?? null,
      setItem: (cle: string, valeur: string) => {
        donnees.set(cle, String(valeur));
      },
      removeItem: (cle: string) => {
        donnees.delete(cle);
      },
    },
  };
}

beforeEach(() => {
  donnees.clear();
  precedent = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", stubLocalStorage());
});

afterEach(() => {
  if (precedent) {
    Object.defineProperty(globalThis, "localStorage", precedent);
  } else {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});

describe("dernier chantier", () => {
  it("mémorise puis relit le dernier chantier", () => {
    assert.equal(lireDernierChantier(), null);
    memoriserDernierChantier("chantier-7");
    assert.equal(lireDernierChantier(), "chantier-7");
    assert.equal(donnees.get(CLE_DERNIER_CHANTIER), "chantier-7");
  });

  it("oublie le dernier chantier", () => {
    memoriserDernierChantier("chantier-7");
    oublierDernierChantier();
    assert.equal(lireDernierChantier(), null);
  });

  it("ignore un identifiant vide", () => {
    memoriserDernierChantier("");
    assert.equal(lireDernierChantier(), null);
  });

  it("ne plante pas si le stockage local est bloqué (navigation privée)", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("stockage bloqué");
      },
    });
    assert.doesNotThrow(() => memoriserDernierChantier("chantier-7"));
    assert.equal(lireDernierChantier(), null);
  });
});
