import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

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

// --- Cohérence du dictionnaire avec l'interface -------------------------
// Depuis le test PC du 18/10/2026 (BUG-018) : la barre latérale affichait
// « detail.quality » en clair car la clé manquait au dictionnaire.
// Ce test parcourt src/ et vérifie que chaque clé appelée via t("...") ou
// « cle: "..." » (dans les fichiers qui importent `t` depuis @/lib/i18n)
// existe bien dans le dictionnaire, en français ET en anglais.

const SRC = fileURLToPath(new URL("../../", import.meta.url));

function fichiersSource(): string[] {
  return (fs.readdirSync(SRC, { recursive: true }) as string[])
    .filter((entree) => entree.endsWith(".ts") || entree.endsWith(".tsx"))
    .filter(
      (entree) =>
        !entree.endsWith(".test.ts") && !entree.endsWith(".test.tsx") && !entree.endsWith(".d.ts"),
    );
}

// Un fichier « consomme » le dictionnaire s'il importe `t` depuis @/lib/i18n.
// (Les pages qui ont leur propre fonction t locale, comme /login, sont ignorées.)
function utiliseLeDictionnaire(contenu: string): boolean {
  for (const m of contenu.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/i18n["']/g)) {
    const noms = m[1].split(",").map((n) => n.trim().replace(/^type\s+/, ""));
    if (noms.includes("t")) return true;
  }
  return false;
}

function clesUtilisees(contenu: string): string[] {
  const cles = new Set<string>();
  for (const m of contenu.matchAll(/\bt\(\s*"([^"]+)"\s*[,)]/g)) cles.add(m[1]);
  for (const m of contenu.matchAll(/\bcle\s*:\s*"([^"]+)"/g)) cles.add(m[1]);
  return [...cles];
}

describe("cohérence du dictionnaire avec l'interface", () => {
  it("chaque clé a un texte français et un texte anglais", () => {
    const incompletes: string[] = [];
    for (const [cle, textes] of Object.entries(DICTIONNAIRE)) {
      if (!textes.fr.trim() || !textes.en.trim()) incompletes.push(cle);
    }
    assert.deepStrictEqual(incompletes, [], `Clés incomplètes : ${incompletes.join(", ")}`);
  });

  it("aucune clé utilisée dans l'interface ne manque au dictionnaire", () => {
    const manquantes: string[] = [];
    for (const rel of fichiersSource()) {
      const contenu = fs.readFileSync(path.join(SRC, rel), "utf8");
      if (!utiliseLeDictionnaire(contenu)) continue;
      for (const cle of clesUtilisees(contenu)) {
        if (!(cle in DICTIONNAIRE)) manquantes.push(`${rel} : « ${cle} »`);
      }
    }
    assert.deepStrictEqual(
      manquantes,
      [],
      `Clés affichées en clair (absentes du dictionnaire) :\n  ${manquantes.join("\n  ")}`,
    );
  });
});
