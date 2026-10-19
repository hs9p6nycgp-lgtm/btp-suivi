// Fusion des doublons de la base de prix (bpu_postes).
//
// Regle de securite : une ligne n'est supprimee que si l'information est
// preservee. En particulier :
//   - les groupes dont les prix sont IDENTIQUES sont fusionnes
//     automatiquement (aucune perte d'information) ;
//   - les groupes dont les prix DIFFERENT ne sont jamais fusionnes par la
//     machine : le script affiche le plan et attend une decision explicite
//     (--garder=CODE) — seul l'utilisateur peut dire quel prix est le bon.
//
// Une sauvegarde JSON complete de la table est ecrite avant toute ecriture.
//
// Utilisation :
//   node scripts/fusionner-doublons-bpu.mjs                    (analyse seule)
//   node scripts/fusionner-doublons-bpu.mjs --appliquer         (fusion des prix identiques)
//   node scripts/fusionner-doublons-bpu.mjs --appliquer --garder=MB-02
//                                                                   (fusion d'un groupe a prix differents : on garde le code MB-02)
//
// Les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
// sont lues depuis .env.local.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { detecterDoublons } from "../src/lib/bpu/qualite.ts";

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
  console.error("Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const APPLIQUER = process.argv.includes("--appliquer");
const GARDER = process.argv
  .filter((a) => a.startsWith("--garder="))
  .map((a) => a.slice("--garder=".length).trim().toUpperCase());

const COMPTE = {
  email: process.env.BTP_COMPTE_EMAIL || "test.btp01@example.com",
  motDePasse: process.env.BTP_COMPTE_MOT_DE_PASSE || "Test1234!",
};

const session = await (
  await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: COMPTE.email, password: COMPTE.motDePasse }),
  })
).json();
if (!session?.access_token) {
  console.error("Connexion impossible :", session?.error_description || session?.msg || "?");
  process.exit(1);
}
const token = session.access_token;
const entetes = { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const bpu = await (
  await fetch(`${URL}/rest/v1/bpu_postes?select=*&limit=5000`, { headers: entetes })
).json();
if (!Array.isArray(bpu) || bpu.length === 0) {
  console.error("Lecture du BPU impossible ou vide.");
  process.exit(1);
}

// --- 1. Sauvegarde complete (avant toute ecriture) ---------------------------
const dossier = process.env.BPU_SAUVEGARDE_DIR ?? os.tmpdir();
const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const fichierSauvegarde = path.join(dossier, `bpu_postes_sauvegarde_${horodatage}.json`);
fs.writeFileSync(fichierSauvegarde, JSON.stringify(bpu, null, 1));
console.log(`Sauvegarde complete : ${fichierSauvegarde} (${bpu.length} lignes)`);

// --- 2. Detection -------------------------------------------------------------
const groupes = detecterDoublons(bpu);
console.log("");
console.log(`=== ${groupes.length} groupe(s) de doublons detecte(s) ===`);

const aSupprimer = [];
const aConserver = [];
const enAttente = [];

for (const groupe of groupes) {
  const prix = new Set(groupe.lignes.map((l) => Number(l.prix_unitaire) || 0));
  const memePrix = prix.size === 1;
  const garde = groupe.ligneRetenue;
  console.log("");
  console.log(`${groupe.lignes[0].designation} (${groupe.lignes[0].unite})`);
  for (const l of groupe.lignes) {
    console.log(
      `  - ${l.code ?? "(sans code)"} | ${l.designation} | ${l.prix_unitaire} FCFA | ${l.statut} | ${l.source ?? "sans source"}${l.date_source ? ` (${l.date_source})` : ""}`,
    );
  }

  if (!garde) continue;
  const codes = groupe.lignes.map((l) => (l.code ?? "").toUpperCase());
  const decision = GARDER.find((c) => codes.includes(c));

  if (memePrix) {
    // Prix identiques : la fusion ne perd rien.
    console.log(`  => fusion automatique : on garde ${garde.code ?? "(sans code)"} (source + date + statut)`);
    aSupprimer.push(...groupe.lignes.filter((l) => l.id !== garde.id).map((l) => ({ id: l.id, designation: l.designation })));
    aConserver.push(garde.code ?? garde.designation);
    continue;
  }

  if (decision) {
    const ligneGardee = groupe.lignes.find((l) => (l.code ?? "").toUpperCase() === decision);
    if (ligneGardee) {
      console.log(`  => fusion demandee : on garde ${decision} (ecart de prix conserve tel quel)`);
      aSupprimer.push(...groupe.lignes.filter((l) => l.id !== ligneGardee.id).map((l) => ({ id: l.id, designation: l.designation })));
      aConserver.push(decision);
      continue;
    }
  }

  console.log("  => PRIX DIFFERENTS : decision attendue de l'utilisateur (--garder=CODE). Aucune ecriture.");
  enAttente.push(groupe.lignes[0].designation);
}

// --- 3. Ecriture --------------------------------------------------------------
console.log("");
if (!APPLIQUER) {
  console.log("Analyse seule (ajoutez --appliquer pour ecrire).");
  if (enAttente.length > 0) {
    console.log("");
    console.log("Groupes en attente de decision :");
    for (const d of enAttente) console.log(`  - ${d}`);
  }
  process.exit(0);
}

if (aSupprimer.length === 0) {
  console.log("Aucune ligne a supprimer.");
  process.exit(0);
}

let supprimees = 0;
for (const ligne of aSupprimer) {
  const r = await fetch(`${URL}/rest/v1/bpu_postes?id=eq.${ligne.id}`, {
    method: "DELETE",
    headers: entetes,
  });
  if (r.ok) {
    supprimees += 1;
    console.log(`Supprimee : ${ligne.designation}`);
  } else {
    console.error(`Echec de la suppression (${ligne.designation}) :`, r.status, await r.text());
  }
}

const apres = await (await fetch(`${URL}/rest/v1/bpu_postes?select=id&limit=5000`, { headers: entetes })).json();
console.log("");
console.log(`Lignes supprimees : ${supprimees} — table : ${apres.length} lignes (avant : ${bpu.length}).`);
if (enAttente.length > 0) {
  console.log(`Groupes non fusionnes (prix differents, en attente de decision) : ${enAttente.length}`);
}
console.log(`Restauration possible depuis ${fichierSauvegarde}.`);
