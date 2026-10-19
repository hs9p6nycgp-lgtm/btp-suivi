// Rapport qualite de la base de prix (T-LOG-40) : doublons, ecarts de prix
// et ambiguites de devis.
//
// Lecture seule : aucune donnee n'est modifiee. L'arbitrage des prix
// (par exemple l'enrobe a 35 000 ou 95 000 FCFA/t) revient a l'utilisateur.
//
// Utilisation :
//   node scripts/rapport-qualite-bpu.mjs
//
// Code de sortie : 0 = rapport produit, 1 = probleme de lecture.

import fs from "node:fs";
import path from "node:path";

import { detecterDoublons, detecterEcarts, detecterQuasiDoublons, detecterAmbiguitesDevis, resumeQualite } from "../src/lib/bpu/qualite.ts";
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

const bpu = await (
  await fetch(`${URL}/rest/v1/bpu_postes?select=id,code,designation,unite,prix_unitaire,source,date_source,statut`, {
    headers: { apikey: KEY, Authorization: `Bearer ${session.access_token}` },
  })
).json();
if (!Array.isArray(bpu) || bpu.length === 0) {
  console.error("Lecture du BPU impossible ou vide.");
  process.exit(1);
}

const doublons = detecterDoublons(bpu);
const ecarts = detecterEcarts(bpu, 25);
const quasi = detecterQuasiDoublons(bpu, 10);
const resume = resumeQualite(doublons, ecarts);

console.log(`Base de prix : ${bpu.length} postes`);
console.log("");
console.log("=== DOUBLONS (meme produit, meme unite) ===");
if (doublons.length === 0) console.log("(aucun)");
for (const groupe of doublons) {
  console.log(`\n${groupe.lignes[0].designation} — ecart ${groupe.ecartPct.toFixed(1)} %`);
  for (const l of groupe.lignes) {
    console.log(
      `  - ${l.code ?? "(sans code)"} | ${l.designation} | ${l.prix_unitaire} FCFA / ${l.unite} | ${l.statut} | ${l.source ?? "sans source"}${l.date_source ? ` (${l.date_source})` : ""}`,
    );
  }
  console.log(`  => ligne a conserver : ${groupe.ligneRetenue?.code ?? "(sans code)"} — ${groupe.ligneRetenue?.designation}`);
}

console.log("");
console.log("=== MEME PRODUIT, UNITES ECRITES DIFFEREMMENT ===");
if (quasi.length === 0) console.log("(aucun)");
for (const groupe of quasi) {
  console.log(`\n${groupe.designation}`);
  for (const l of groupe.lignes) {
    console.log(`  - ${l.code ?? "(sans code)"} | ${l.designation} | ${l.prix_unitaire} FCFA / ${l.unite}`);
  }
}

console.log("");
console.log("=== FAMILLES DE PRODUITS A VERIFIER (meme famille, meme unite, ecart > 25 %) ===");
console.log("Ces lignes portent le meme premier mot (« enrobe »...) : verifiez si c'est le meme produit.");
if (ecarts.length === 0) console.log("(aucune)");
for (const ecart of ecarts) {
  console.log(`\n${ecart.designation} — ecart ${ecart.ecartPct.toFixed(1)} % (${ecart.prixMin} -> ${ecart.prixMax} FCFA)`);
  for (const l of ecart.lignes) {
    console.log(
      `  - ${l.code ?? "(sans code)"} | ${l.designation} | ${l.prix_unitaire} FCFA / ${l.unite} | ${l.statut} | ${l.source ?? "sans source"}${l.date_source ? ` (${l.date_source})` : ""}`,
    );
  }
}

const ambiguites = detecterAmbiguitesDevis(templates, bpu);
const concurrentes = ambiguites.filter((a) => a.prixConcurrents);
console.log("");
console.log("=== AMBIGUITES DE DEVIS ===");
console.log(`${ambiguites.length} ligne(s) de devis trouve(nt) plusieurs postes du BPU, dont ${concurrentes.length} avec des prix differents.`);
for (const a of concurrentes) {
  console.log(`\n${a.modele} / ${a.code} — ${a.designation}`);
  for (const c of a.correspondances) {
    console.log(`  - ${c.designation} | ${c.prix} FCFA / ${c.unite}`);
  }
}

console.log("");
console.log(
  `Resume : ${resume.doublons} doublon(s), ${resume.ecarts} ecart(s) a arbitrer, ${resume.lignesConcernees} poste(s) concerne(s) sur ${bpu.length}.`,
);
console.log("Aucune donnee n'a ete modifiee : l'arbitrage des prix revient a l'utilisateur.");
