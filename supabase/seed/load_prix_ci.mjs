// Charge le fichier de donnees de depart (supabase/seed/prix_ci.csv) dans la
// table des prix unitaires (bpu_postes).
//
// Le script est idempotent : si une ligne existe deja (meme code), elle est
// ignoree et jamais dupliquée. Pour mettre a jour une ligne existante, la
// modifier directement dans la base avant de relancer ce script.
//
// Utilisation : node supabase/seed/load_prix_ci.mjs [chemin-du-csv]

import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validerBasePrix } from "./basePrix";

const repertoireScript = path.dirname(fileURLToPath(import.meta.url));

/** Découpe une ligne en champs, en tenant compte des champs entre guillemets. */
function decouper(ligne) {
  const champs = [];
  let champ = "";
  let entreGuillemets = false;
  for (const caractere of ligne) {
    if (caractere === '"') {
      entreGuillemets = !entreGuillemets;
      continue;
    }
    if (caractere === ";" && !entreGuillemets) {
      champs.push(champ.trim());
      champ = "";
      continue;
    }
    champ += caractere;
  }
  champs.push(champ.trim());
  return champs;
}

/** Convertit le texte du fichier en lignes de champs, en ignorant les lignes vides. */
function lireLignes(texte) {
  const lignes = texte.split(/\r?\n/).filter((ligne) => ligne.trim() !== "");
  const donnees = [];
  for (const ligne of lignes) {
    if (ligne.startsWith("#")) continue; // commentaire
    donnees.push(decouper(ligne));
  }
  return donnees;
}

/** Convertit une ligne de CSV en objet, et retourne null pour la ligne d'en-tête. */
function ligneEnObjet(ligneDonnee) {
  // La premiere ligne contient les noms des colonnes.
  if (ligneDonnee[0] && ligneDonnee[0].toLowerCase() === "code") return null;
  if (ligneDonnee.length < 8) return null;
  const prix = Number(ligneDonnee[3]);
  return {
    code: ligneDonnee[0],
    designation: ligneDonnee[1],
    unite: ligneDonnee[2],
    prix_unitaire: Number.isFinite(prix) ? prix : 0,
    source: ligneDonnee[4] || null,
    date_source: ligneDonnee[5] || null,
    date_validite: ligneDonnee[6] || null,
    statut: ligneDonnee[7] || "a_verifier",
  };
}

async function main() {
  const nomFichier = process.argv[2] ?? "prix_ci.csv";
  const cheminFichier = path.isAbsolute(nomFichier)
    ? nomFichier
    : path.join(repertoireScript, nomFichier);
  const texte = fs.readFileSync(cheminFichier, "utf8");
  const lignes = lireLignes(texte);

  const client = new Client({
    host: process.env.PGHOST || "db.lomxkkqhurimmxmtgckm.supabase.co",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "postgres",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connecte a PostgreSQL.");

  await client.query("begin");
  let inserees = 0;
  let ignorees = 0;
  for (const champs of lignes) {
    const objet = ligneEnObjet(champs);
    if (!objet) continue;
    const refusee = validerBasePrix(objet);
    if (refusee) {
      ignorees += 1;
      console.log(`Ligne refusee (REF-04) : ${objet.code} (${refusee})`);
      continue;
    }
    const dejaPresente = await client.query(
      "select 1 from bpu_postes where code = $1 limit 1",
      [objet.code],
    );
    if (dejaPresente.rowCount > 0) {
      ignorees += 1;
      console.log(`Doublon ignore : ${objet.code}`);
      continue;
    }
    await client.query(
      `insert into bpu_postes
        (code, designation, unite, prix_unitaire, source, date_source, date_validite, statut)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        objet.code,
        objet.designation,
        objet.unite,
        objet.prix_unitaire,
        objet.source,
        objet.date_source,
        objet.date_validite,
        objet.statut,
      ],
    );
    inserees += 1;
    console.log(`Ligne ajoutee : ${objet.code}`);
  }
  await client.query("commit");
  console.log(`Base de prix chargee : ${inserees} lignes, ${ignorees} doublons ignores.`);
  await client.end();
}

main().catch((erreur) => {
  console.error("Erreur :", erreur.message);
  process.exit(1);
});
