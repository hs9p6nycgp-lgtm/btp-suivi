// Verification globale de l'etat du projet : base de donnees, securite,
// isolation des donnees et sites en ligne.
//
// Utilisation :
//   node scripts/verifier-sante.mjs
// A lancer apres toute migration, avant un deploiement, ou en cas de doute.
//
// Contenu :
//   1. Audit du schema : toutes les migrations sont-elles appliquees ?
//   2. Controle de non-fuite : une donnee visible sans etre connecte ?
//   3. Isolation a deux comptes : un compte voit-il les chantiers d'un autre ?
//   4. Sites en ligne : le site officiel et le site de secours repondent-ils ?
//
// Code de sortie : 0 = tout va bien, 1 = au moins un controle en echec.
// (lecture seule sur la base, sauf un chantier de test cree puis supprime)

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

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

const resultats = [];
function ajouter(nom, ok, detail) {
  resultats.push({ nom, ok, detail });
  console.log(`${ok ? "OK   " : "ECHEC"} ${nom}${detail ? " — " + detail : ""}`);
}

function lancerScript(fichier) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [fichier], { stdio: ["ignore", "pipe", "pipe"] });
    let sortie = "";
    p.stdout.on("data", (d) => { sortie += d; });
    p.stderr.on("data", (d) => { sortie += d; });
    p.on("close", (code) => resolve({ code, sortie }));
  });
}

const entetes = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// --- 1) Schema de la base : toutes les migrations appliquees ? ----------------

const audit = await lancerScript("scripts/audit-base.mjs");
const resumeAudit = (audit.sortie.match(/Resume : .*/) || [""])[0].trim();
ajouter(
  "Schema de la base a jour (audit)",
  audit.code === 0,
  audit.code === 0 ? resumeAudit || "toutes les migrations sont appliquees" : resumeAudit || audit.sortie.trim().split("\n").slice(-1)[0],
);

// --- 2) Non-fuite : une donnee visible sans etre connecte ? -------------------

const tables = new Set();
const dossier = "supabase/migrations";
for (const f of fs.readdirSync(dossier).filter((x) => x.endsWith(".sql"))) {
  const sql = fs.readFileSync(path.join(dossier, f), "utf8");
  for (const m of sql.matchAll(/create table\s+(?:if not exists\s+)?([a-z_]+)/gi)) {
    tables.add(m[1].toLowerCase());
  }
}
tables.delete("buckets");
tables.delete("objects");

const fuites = [];
let inaccessibles = 0;
for (const t of [...tables].sort()) {
  const r = await fetch(`${URL}/rest/v1/${t}?select=*&limit=1`, { headers: entetes });
  if (!r.ok) {
    inaccessibles += 1;
    continue;
  }
  const d = await r.json();
  if (Array.isArray(d) && d.length > 0) fuites.push(t);
}
ajouter(
  "Aucune fuite de donnees (visiteur non connecte)",
  fuites.length === 0,
  fuites.length === 0
    ? `${tables.size} tables parcourues, 0 ligne lisible sans connexion${inaccessibles ? ` (${inaccessibles} non listables)` : ""}`
    : "lignes visibles dans : " + fuites.join(", "),
);

// --- 3) Isolation : un compte voit-il les chantiers d'un autre ? --------------

const isolation = await lancerScript("scripts/verifier-isolation.mjs");
const resumeIso = isolation.sortie.includes("Isolation VERIFIEE")
  ? "chaque compte ne voit que ses propres chantiers"
  : isolation.sortie.trim().split("\n").slice(-1)[0];
ajouter("Isolation des donnees (2 comptes)", isolation.code === 0, resumeIso);

// --- 4) Sites en ligne --------------------------------------------------------

const sites = [
  ["Site officiel (connexion)", "https://btp-suivi-7w2i.vercel.app/login"],
  ["Site officiel (hors connexion)", "https://btp-suivi-7w2i.vercel.app/offline"],
  ["Site officiel (service worker)", "https://btp-suivi-7w2i.vercel.app/sw.js"],
  ["Site officiel (manifeste)", "https://btp-suivi-7w2i.vercel.app/manifest.json"],
  ["Site de secours", "https://btp-suivi-cd4w.vercel.app/login"],
];
for (const [nom, url] of sites) {
  let code = 0;
  try {
    const r = await fetch(url, { redirect: "manual" });
    code = r.status;
  } catch {
    code = 0;
  }
  ajouter(nom, code >= 200 && code < 400, `HTTP ${code}`);
}

// --- Bilan --------------------------------------------------------------------

const echecs = resultats.filter((r) => !r.ok);
console.log("\n=== BILAN ===");
console.log(`${resultats.length - echecs.length}/${resultats.length} controles OK.`);
if (echecs.length > 0) {
  console.log("A corriger : " + echecs.map((e) => e.nom).join(" ; "));
  process.exit(1);
}
console.log("Base a jour, aucune fuite, isolation verifiee, sites en ligne.");
