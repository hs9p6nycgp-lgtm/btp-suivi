// Rejoue dans l'application les donnees du chantier routier suivi par
// l'entreprise (chapitre 4 du memoire), afin de pouvoir capturer les six
// ecrans qui montrent un chantier en cours.
//
// Le script cree un compte d'essai isole (une entreprise, un chantier), puis
// saisit :
//   - le chantier de voirie 1,2 km (250 000 000 FCFA) ;
//   - les trois postes du DQE (196 492 800 FCFA) ;
//   - la quantite de 2 000 m2 de decapage ;
//   - un journal valide ;
//   - le planning : Decapage 10 j > Remblai 12 j > Couche de base 15 j >
//     Revetement 20 j (chaine critique, 57 jours) ;
//   - le plan de controle "route" a 8 parametres ;
//   - l'essai hors tolerance a 999 m, qui declenche la fiche de non-conformite.
//
// Usage :  node scripts/ prepareser-chantier-demo.mjs
//
// Les identifiants sont lus dans l'environnement :
//   BTP_COMPTE_EMAIL  (defaut : capture.memoire@example.com)
//   BTP_COMPTE_MDP    (defaut : Test1234!)

import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const env = (k, d) => {
  const f = path.join(REPO, ".env.local");
  if (fs.existsSync(f)) {
    for (const l of fs.readFileSync(f, "utf8").split("\n")) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] === k && !process.env[k]) process.env[k] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return process.env[k] ?? d;
};

const URL_BASE = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const EMAIL = env("BTP_COMPTE_EMAIL", "capture.memoire@example.com");
const MDP = env("BTP_COMPTE_MDP", "Test1234!");

let token = null;

async function api(table, body, method = "POST", extra = "") {
  const r = await fetch(`${URL_BASE}/rest/v1/${table}${extra}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${method} ${table} -> ${r.status} ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

const D = (n) => {
  const d = new Date("2026-10-19T08:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const run = async () => {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: MDP }),
  });
  if (!r.ok) throw new Error(`connexion impossible : ${r.status}`);
  token = (await r.json()).access_token;
  console.log("connecte :", EMAIL);

  // --- chantier deja present ?
  const existants = await api("chantiers", null, "GET", "?select=id,nom&limit=5");
  let chantier;
  if (existants && existants.length) {
    chantier = existants[0];
    console.log("chantier deja present :", chantier.id, "-", chantier.nom, "(reprise)");
  } else {
  // --- chantier
  [chantier] = await api("chantiers", {
    nom: "Voirie 1,2 km + assainissement",
    type: "route",
    maitre_ouvrage: "AGEROUTE",
    montant_marche: 250000000,
    date_debut: "2026-11-02",
    date_fin_prevue: "2027-04-30",
    seuil_ecart_pct: 10,
    statut: "en_cours",
  });
  console.log("chantier cree :", chantier.id);
  }

  // --- entreprise qui suit le chantier : reprise des parametres d'entreprise
  const [parametres] = await api("parametres_entreprise", null, "GET", "?select=nom,sigle&limit=1");
  const entreprise = parametres?.nom || parametres?.sigle || null;
  if (entreprise && chantier.entreprise !== entreprise) {
    await api("chantiers", { entreprise }, "PATCH", `?id=eq.${chantier.id}`);
    chantier = { ...chantier, entreprise };
    console.log("entreprise du chantier :", entreprise);
  }

  // --- DQE : 3 postes, total 196 492 800 FCFA
  const postesExistants = await api("postes_dqe", null, "GET", `?chantier_id=eq.${chantier.id}&select=*`);
  const postes = postesExistants && postesExistants.length ? postesExistants : await api("postes_dqe", [
    { chantier_id: chantier.id, code: "TER-04", designation: "Décapage de terre végétale", unite: "m²", quantite_marche: 8400, prix_unitaire: 467 },
    { chantier_id: chantier.id, code: "BIT-03", designation: "Couche de base — grave bitume GB 0/20", unite: "m³", quantite_marche: 2100, prix_unitaire: 48000 },
    { chantier_id: chantier.id, code: "BIT-02", designation: "Revêtement bitumineux à chaud (EB)", unite: "t", quantite_marche: 966, prix_unitaire: 95000 },
  ]);
  console.log("DQE cree :", postes.length, "postes, total",
    postes.reduce((s, p) => s + Number(p.quantite_marche) * p.prix_unitaire, 0).toLocaleString("fr-FR"), "FCFA");

  // --- quantite realisee : 2 000 m2 de decapage
  const qEx = await api("quantites_realisees", null, "GET", `?chantier_id=eq.${chantier.id}&select=id&limit=1`);
  if (!qEx || !qEx.length) {
    await api("quantites_realisees", {
      chantier_id: chantier.id,
      poste_dqe_id: postes[0].id,
      quantite: 2000,
      date_saisie: "2026-10-19",
    });
    console.log("quantite : 2 000 m2 de decapage");
  }

  // --- journal valide
  const jEx = await api("journaux", null, "GET", `?chantier_id=eq.${chantier.id}&select=id&limit=1`);
  const [journal] = jEx && jEx.length ? jEx : await api("journaux", {
    chantier_id: chantier.id,
    date_journal: "2026-10-19",
    meteo: "Soleil",
    observations: "Décapage de la terre végétale sur 2 000 m². Engins en bon état, aucune interruption.",
    statut: "valide",
    validated_at: "2026-10-19T17:00:00Z",
  });
  await api("journal_effectifs", { journal_id: journal.id, corps_metier: "Équipe terrassement", nombre: 24 });
  await api("journal_engins", { journal_id: journal.id, type_engin: "Pelle hydraulique", heures_marche: 8, quantite_produite: 8400 });
  await api("journal_engins", { journal_id: journal.id, type_engin: "Compacteur", heures_marche: 7 });
  await api("journal_engins", { journal_id: journal.id, type_engin: "Camion benne", heures_marche: 8 });
  console.log("journal cree et valide");

  // --- planning : chaine critique de 4 taches, 57 jours
  const t = async (nom, duree, debut) => {
    const [x] = await api("taches_planning", {
      chantier_id: chantier.id,
      nom,
      duree_jours: duree,
      date_prevue_debut: D(debut),
      date_prevue_fin: D(debut + duree),
      avancement_pct: 0,
      statut: "a_faire",
    });
    return x;
  };
  const tEx = await api("taches_planning", null, "GET", `?chantier_id=eq.${chantier.id}&select=*`);
  let dec, rem, base, rev;
  if (tEx && tEx.length === 4) {
    [dec, rem, base, rev] = tEx;
    console.log("planning deja present");
  } else {
  dec = await t("Décapage", 10, 0);
  rem = await t("Remblai", 12, 10);
  base = await t("Couche de base", 15, 22);
  rev = await t("Revêtement", 20, 37);
  await api("dependances_planning", [
    { chantier_id: chantier.id, tache_predecesseur_id: dec.id, tache_successeur_id: rem.id, type_dependance: "fin_debut" },
    { chantier_id: chantier.id, tache_predecesseur_id: rem.id, tache_successeur_id: base.id, type_dependance: "fin_debut" },
    { chantier_id: chantier.id, tache_predecesseur_id: base.id, tache_successeur_id: rev.id, type_dependance: "fin_debut" },
  ]);
  }
  console.log("planning cree : chaine critique 10 + 12 + 15 + 20 = 57 jours");

  // --- plan de controle "route" : 8 parametres
  const params = [
    ["Largeur de la chaussée", 7, 0.15, -0.15, "m"],
    ["Dévers en alignement", 2.5, 0.5, -0.5, "%"],
    ["Compacité de la couche de fondation (Proctor)", 95, 0, 0, "% OPM"],
    ["Épaisseur de la couche de roulement", 5, 1, -1, "cm"],
    ["Épaisseur de la couche de fondation", 25, 2, -2, "cm"],
    ["Planéité (écart maximal)", 5, 0, 0, "mm"],
    ["Écart d'implantation", 0, 0.05, -0.05, "m"],
    ["Écart altimétrique (nivellement)", 0, 0.02, -0.02, "m"],
  ];
  const plans = [];
  const pEx = await api("plans_controle", null, "GET", `?chantier_id=eq.${chantier.id}&select=*`);
  if (pEx && pEx.length) {
    plans.push(...pEx);
    console.log("plan de controle deja present :", plans.length, "parametres");
  }
  for (const [param, exigee, tolPos, tolNeg, unite] of (pEx && pEx.length ? [] : params)) {
    const [p] = await api("plans_controle", {
      chantier_id: chantier.id,
      type_ouvrage: "route",
      paramètre: param,
      valeur_exigee: exigee,
      tolerance_pos: tolPos,
      tolerance_neg: tolNeg,
      unite,
    });
    plans.push(p);
  }
  console.log("plan de controle cree :", plans.length, "parametres");

  // --- essai hors tolerance : 999 m sur la largeur (exigee 7 m +/- 0,15)
  const largeur = plans[0];
  const eEx = await api("essais_qualite", null, "GET", `?chantier_id=eq.${chantier.id}&select=id&limit=1`);
  if (!eEx || !eEx.length) await api("essais_qualite", {
    chantier_id: chantier.id,
    plan_controle_id: largeur.id,
    type_controle: largeur.paramètre,
    valeur_mesuree: 999,
    valeur_exigee: 7,
    tolerance_pos: 0.15,
    tolerance_neg: -0.15,
    unite: "m",
    conforme: false,
    date_controle: "2026-10-19",
    responsable: "Ingénieur travaux",
    observations: "Contrôle non conforme : Largeur de la chaussée = 999 m (exige : 7 m +0,15/−0,15)",
  });
  console.log("essai hors tolerance saisi : 999 m sur la largeur de chaussee");

  // --- fiche de non-conformite (RG-04) : l'application la cree a la saisie
  //     de l'essai ; on la reproduit ici pour que la capture la montre.
  const [essai] = await api("essais_qualite", null, "GET",
    `?chantier_id=eq.${chantier.id}&select=id&limit=1`);
  if (essai) {
    await api("non_conformites", {
      chantier_id: chantier.id,
      essai_id: essai.id,
      description: "Contrôle non conforme : Largeur de la chaussée = 999 m (exige : 7 m +0,15/−0,15)",
      gravite: "critique",
      statut: "ouverte",
      responsable: "Ingénieur travaux",
      action_corrective: "Reprise de la couche de base sur 120 m",
      echeance: "2026-10-26",
    });
    console.log("fiche de non-conformite creee (gravite critique, echeance 26/10/2026)");
  }

  // --- depense reelle : 200 L de gasoil a 850 FCFA
  const dEx = await api("depenses_reelles", null, "GET", `?chantier_id=eq.${chantier.id}&select=id&limit=1`);
  if (!dEx || !dEx.length) await api("depenses_reelles", {
    chantier_id: chantier.id,
    categorie: "carburant",
    designation: "Gasoil — pelle hydraulique",
    quantite: 200,
    unite: "L",
    prix_unitaire: 850,
    montant_total: 170000,
    date_depense: "2026-10-19",
  });
  console.log("depense : 200 L x 850 = 170 000 FCFA");

  console.log("\nTermine. Chantier :", chantier.id);
};

run().catch((e) => {
  console.error("Echec :", e.message);
  process.exit(1);
});
