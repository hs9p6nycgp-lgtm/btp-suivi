// Verification des modeles de devis contre le BPU reel de Supabase.
// Pour chaque ligne de devis qui propose des mots-cles, on verifie qu'au
// moins un poste du BPU correspond (sinon le devis n'aurait pas de prix).
//
// Utilisation :
//   node scripts/verifier-devis-bpu.mjs
// (lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local)

import fs from "node:fs";
import path from "node:path";
import { templates } from "../src/lib/devis/templates.ts";

function chargerEnvLocal() {
  const fichier = path.resolve(".env.local");
  if (!fs.existsSync(fichier)) return;
  const contenu = fs.readFileSync(fichier, "utf8");
  for (const ligne of contenu.split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
chargerEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error("Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou NEXT_PUBLIC_SUPABASE_ANON_KEY (dans .env.local).");
  process.exit(1);
}

const r = await fetch(`${URL}/rest/v1/bpu_postes?select=designation&limit=1000`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (!r.ok) {
  console.error("Lecture du BPU impossible :", r.status, await r.text());
  process.exit(1);
}
const bpu = await r.json();
const designations = bpu.map((p) => (p.designation ?? "").toLowerCase());

let erreurs = 0;
for (const t of templates) {
  for (const ligne of t.lignes) {
    if (ligne.keywords.length === 0) continue;
    const nb = designations.filter((d) => ligne.keywords.some((k) => d.includes(k.toLowerCase()))).length;
    if (nb === 0) {
      erreurs += 1;
      console.log(`PAS DE PRIX : ${t.id} / ${ligne.code} (« ${ligne.designation} ») -> ${JSON.stringify(ligne.keywords)}`);
    }
  }
}

const nbLignes = templates.reduce((n, t) => n + t.lignes.length, 0);
console.log(`${templates.length} modeles, ${nbLignes} lignes verifiees contre ${bpu.length} postes BPU.`);
console.log(erreurs === 0 ? "OK : chaque ligne a mots-cles trouve un poste du BPU." : `${erreurs} ligne(s) sans poste BPU.`);
process.exit(erreurs === 0 ? 0 : 1);
