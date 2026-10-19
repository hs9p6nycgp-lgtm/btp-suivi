// Synchronisation de la base de prix (BPU) vers le referentiel centralise.
//
// Exigences REF-01 (referentiel unique), REF-03 (historique) et REF-04
// (chaque prix porte une source et une date).
//
// Le script utilise le meme module que l'application (`src/lib/referentiel/
// alignement.ts`) : il prepare le plan d'alignement, cree les prix
// manquants, met a jour les prix modifies (avec une trace dans
// l'historique) et laisse de cote les prix sans source ni date.
//
// Utilisation :
//   node scripts/synchroniser-referentiel.mjs            (simulation seule)
//   node scripts/synchroniser-referentiel.mjs --appliquer (ecrit en base)
//
// Code de sortie : 0 = tout va bien, 1 = probleme.

import fs from "node:fs";
import path from "node:path";

import { planifierAlignement } from "../src/lib/referentiel/alignement.ts";

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

const COMPTE = {
  email: process.env.BTP_COMPTE_EMAIL || "test.btp01@example.com",
  motDePasse: process.env.BTP_COMPTE_MOT_DE_PASSE || "Test1234!",
};
const APPLIQUER = process.argv.includes("--appliquer");

function headers(token) {
  return { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function lireJson(r) {
  const texte = await r.text();
  if (!texte) return null;
  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

const session = await (await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: COMPTE.email, password: COMPTE.motDePasse }),
})).json();
if (!session?.access_token) {
  console.error("Connexion impossible.");
  process.exit(1);
}
const token = session.access_token;

const bpu = (await (await fetch(`${URL}/rest/v1/bpu_postes?select=*`, { headers: headers(token) })).json()) ?? [];
const referentiel = (await (await fetch(`${URL}/rest/v1/referentiel_prix?select=*`, { headers: headers(token) })).json()) ?? [];

console.log(`Base de prix : ${bpu.length} poste(s) — Referentiel : ${referentiel.length} prix`);

const plan = planifierAlignement(bpu, referentiel);
console.log("");
console.log("=== PLAN D'ALIGNEMENT ===");
console.log(`A creer      : ${plan.aCreer.length}`);
console.log(`A mettre a jour : ${plan.aMettreAJour.length}`);
console.log(`Deja alignes : ${plan.inchanges}`);
console.log(`Non repris (sans source ni date) : ${plan.nonSynchronisables.length}`);

if (!APPLIQUER) {
  console.log("");
  console.log("Simulation seulement (ajoutez --appliquer pour ecrire en base).");
  process.exit(0);
}

if (plan.aCreer.length > 0) {
  const r = await fetch(`${URL}/rest/v1/referentiel_prix`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(
      plan.aCreer.map((l) => ({
        code: l.code,
        designation: l.designation,
        categorie: null,
        unite: l.unite,
        prix_unitaire: l.prix_unitaire,
        source: l.source,
        date_source: l.date_source,
        date_validite: l.date_validite,
        statut: l.statut,
        zone: null,
      })),
    ),
  });
  const data = await lireJson(r);
  if (!r.ok) {
    console.error("Erreur a la creation :", data?.message || data?.error || r.status);
    process.exit(1);
  }
  console.log(`Crees : ${plan.aCreer.length}`);
}

for (const maj of plan.aMettreAJour) {
  const r = await fetch(`${URL}/rest/v1/referentiel_prix?id=eq.${maj.referentielId}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({
      designation: maj.ligne.designation,
      unite: maj.ligne.unite,
      prix_unitaire: maj.ligne.prix_unitaire,
      source: maj.ligne.source,
      date_source: maj.ligne.date_source,
      date_validite: maj.ligne.date_validite,
      statut: maj.ligne.statut,
    }),
  });
  if (!r.ok) {
    const data = await lireJson(r);
    console.error("Erreur a la mise a jour :", data?.message || data?.error || r.status);
    process.exit(1);
  }
  // Historique du prix (REF-03)
  await fetch(`${URL}/rest/v1/historique_prix`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      referentiel_prix_id: maj.referentielId,
      ancien_prix: maj.ancienPrix,
      nouveau_prix: maj.ligne.prix_unitaire,
      auteur: COMPTE.email,
      motif: "Mise a jour depuis la base de prix (BPU)",
    }),
  });
}
console.log(`Mis a jour : ${plan.aMettreAJour.length}`);

const apres = (await (await fetch(`${URL}/rest/v1/referentiel_prix?select=id`, { headers: headers(token) })).json()) ?? [];
console.log("");
console.log(`Referentiel : ${apres.length} prix.`);
