// Contrôle fonctionnel des écrans : chaque page s'ouvre-t-elle vraiment ?
//
// Ce que le script vérifie, écran par écran :
//   1. la page n'affiche pas l'écran d'erreur (« Une erreur est survenue ») ;
//   2. le contenu attendu est présent (le libellé de la page) ;
//   3. aucune erreur JavaScript n'a été émise dans la console.
//
// Complète `verifier-sante.mjs` (qui contrôle la base, la sécurité et les sites) :
// celui-ci vérifie que l'application est **utilisable**, écran par écran.
//
// Utilisation :
//   node scripts/verifier-ecrans.mjs
//   BTP_SITE=https://... BTP_COMPTE_EMAIL=... BTP_COMPTE_MDP=... node scripts/verifier-ecrans.mjs
//
// Variables d'environnement (facultatives) :
//   BTP_SITE        URL de l'application (défaut : http://localhost:3000)
//   BTP_COMPTE_EMAIL / BTP_COMPTE_MDP   identifiants du compte de test
//   BTP_CHANTIER_ID  chantier à utiliser pour les écrans qui en dépendent
//   BTP_DEVIS_ID     devis enregistré à contrôler
//
// Le script ne modifie aucune donnée : il se connecte et parcourt les écrans.
// Code de sortie : 0 = tous les écrans sont bons, 1 = au moins un écran en défaut.

import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";

const SITE = process.env.BTP_SITE ?? "http://localhost:3000";
const EMAIL = process.env.BTP_COMPTE_EMAIL ?? "test-pc-20261018@example.com";
const MDP = process.env.BTP_COMPTE_MDP ?? "TestPc2026_1018";
const CHANTIER = process.env.BTP_CHANTIER_ID ?? "";
const DEVIS = process.env.BTP_DEVIS_ID ?? "";
const PORT = process.env.BTP_CDP_PORT ?? "9333";
const DELAI = Number(process.env.BTP_DELAI ?? "3500");

/** Écrans à contrôler : nom, chemin, libellé attendu dans la page. */
const ECRANS = [
  ["Tableau de bord", "/", "Tableau de bord"],
  ["Liste des chantiers", "/chantiers", "Chantiers"],
  ["Fiche chantier", "/chantiers/{CHANTIER}", "MARCHÉ"],
  ["Planning", "/chantiers/{CHANTIER}/planning", "PERT"],
  ["Coûts", "/chantiers/{CHANTIER}/couts", "Coût"],
  ["Qualité", "/chantiers/{CHANTIER}/qualite", "Plan de contrôle"],
  ["Journal (liste)", "/chantiers/{CHANTIER}/journaux", "Journal"],
  ["Livraisons", "/chantiers/{CHANTIER}/livraisons", "Stocks"],
  ["Métré & DQE", "/chantiers/{CHANTIER}/metre", "Métré"],
  ["Sécurité (HSE)", "/chantiers/{CHANTIER}/securite", "Check-list"],
  ["Situations de paiement", "/chantiers/{CHANTIER}/situations", "Situations"],
  ["Fiche imprimable", "/chantiers/{CHANTIER}/imprimer", "SUIVI DE CHANTIER"],
  ["Rapport de réception", "/chantiers/{CHANTIER}/reception", "Bilan"],
  ["Carnet de chantier", "/chantiers/{CHANTIER}/carnet", "CARNET"],
  ["Modélisation 3D", "/chantiers/{CHANTIER}/modelisation3d", "Modélisation"],
  ["Calcul de devis", "/calculateurs/devis", "Calcul de devis"],
  ...(DEVIS ? [["Devis enregistré", "/calculateurs/devis/{DEVIS}", "Devis"]] : []),
  ["Calcul de murs", "/calculateurs/mur", "Calcul de murs"],
  ["Base de prix", "/bpu", "poste"],
  ["Référentiel de prix", "/referentiel", "Référentiel"],
  ["Fournisseurs", "/fournisseurs", "Fournisseurs"],
  ["Export Excel", "/export", "Export"],
  ["Rapports", "/rapports", "Rapports"],
  ["Centre d'alertes", "/alertes", "Centre d'alertes"],
  ["Direction", "/direction", "DIRECTION"],
  ["Exigences", "/exigences", "Couverture des exigences"],
  ["Aide", "/aide", "Aide"],
  ["Mon entreprise", "/parametres", "Mon entreprise"],
  ["Démo", "/demo", "Démo"],
];

/** Démarre un Chrome sans interface avec le protocole DevTools. */
function demarrerChrome() {
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const linux = "/usr/bin/google-chrome";
  const binaire = process.platform === "darwin" ? mac : linux;
  // Sans accélération graphique, la vue 3D ne peut pas s'afficher : c'est
  // volontairement le cas par défaut (certains appareils n'ont pas de WebGL).
  // BTP_WEBGL=1 active le rendu logiciel pour tester le reste de l'application.
  const rendu = process.env.BTP_WEBGL === "1" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : ["--disable-gpu"];
  const enfant = spawn(
    binaire,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=/tmp/btp-suivi-verifier-ecrans-${PORT}`,
      "--no-first-run",
      "--no-default-browser-check",
      ...rendu,
      "--window-size=1440,900",
    ],
    { stdio: "ignore", detached: true },
  );
  enfant.unref();
  return enfant;
}

async function attendreChrome(tentatives = 40) {
  for (let i = 0; i < tentatives; i += 1) {
    try {
      const reponse = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (reponse.ok) return true;
    } catch {
      /* pas encore prêt */
    }
    await pause(500);
  }
  return false;
}

const chrome = demarrerChrome();
if (!(await attendreChrome())) {
  console.error("Impossible de démarrer Chrome (mode sans interface).");
  process.exit(2);
}

let onglet;
try {
  const creation = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" }).catch(() => null);
  onglet = creation && creation.ok ? await creation.json() : await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json().then((l) => l[0]);
} catch (e) {
  console.error("Connexion au navigateur impossible :", e.message);
  process.exit(2);
}

const ws = new WebSocket(onglet.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = () => rej(new Error("WebSocket"));
});

let compteur = 0;
const enAttente = new Map();
const erreursConsole = [];
ws.onmessage = (evenement) => {
  const message = JSON.parse(evenement.data);
  if (message.id && enAttente.has(message.id)) {
    const { resolve, reject } = enAttente.get(message.id);
    enAttente.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  } else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    erreursConsole.push(
      (message.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 160),
    );
  }
};

const envoyer = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++compteur;
    enAttente.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

await Promise.all([envoyer("Page.enable"), envoyer("Runtime.enable"), envoyer("Network.enable")]);

const evaluer = async (expression, delaiMax = Number(process.env.BTP_DELAI_MAX ?? "30000")) => {
  // Une page très lourde (rendu 3D logiciel) peut ne pas répondre : on ne
  // bloque jamais le contrôle plus de `delaiMax`.
  const r = await Promise.race([
    envoyer("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }),
    pause(delaiMax).then(() => ({ exceptionDetails: { text: "délai dépassé" } })),
  ]);
  if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text).slice(0, 200));
  return r.result.value;
};
const attendre = async (condition, tours = 200) => {
  for (let i = 0; i < tours; i += 1) {
    try {
      if (await evaluer(condition)) return true;
    } catch {
      /* on réessaie */
    }
    await pause(250);
  }
  return false;
};
const naviguer = async (url) => {
  await envoyer("Page.navigate", { url });
  await attendre("document.readyState==='complete'");
};

const resultats = [];
let defauts = 0;
try {
  await naviguer(`${SITE}/`);
  if (await evaluer("location.pathname==='/login' && !!document.querySelector('input[type=email]')")) {
    await attendre("!!document.querySelector('input[type=email]')");
    await pause(600);
    await evaluer(`(()=>{const set=(s,v)=>{const el=document.querySelector(s);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};set('input[type="email"]',${JSON.stringify(EMAIL)});set('input[type="password"]',${JSON.stringify(MDP)});return 1})()`);
    await evaluer(`[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Se connecter').click()`);
    await attendre("location.pathname!=='/login'");
  }

  for (const [nom, chemin, attendu] of ECRANS) {
    if (chemin.includes("{CHANTIER}") && !CHANTIER) {
      console.log(`— ${nom} : ignoré (aucun chantier indiqué)`);
      continue;
    }
    erreursConsole.length = 0;
    const url = `${SITE}${chemin.replace("{CHANTIER}", CHANTIER).replace("{DEVIS}", DEVIS)}`;
    await naviguer(url);
    await pause(DELAI);
    let etat;
    try {
      etat = await evaluer(`(()=>{const t=document.body.innerText;return{
      ecranErreur:/Une erreur est survenue|This page couldn't load/i.test(t),
      aLeContenu:t.toLowerCase().indexOf(${JSON.stringify(attendu.toLowerCase())})>=0,
      longueur:t.length};})()`);
    } catch (e) {
      etat = { ecranErreur: true, aLeContenu: false, longueur: 0, note: e.message };
    }
    const erreurs = erreursConsole.filter((e) => !/script tag/i.test(e)).slice(0, 2);
    const enDefaut = etat.ecranErreur || !etat.aLeContenu || erreurs.length > 0;
    if (enDefaut) defauts += 1;
    resultats.push({ nom, url, ...etat, erreurs, enDefaut });
    console.log(
      `${enDefaut ? "✗" : "✓"} ${nom.padEnd(26)} ${String(etat.longueur).padStart(6)} car.` +
        (enDefaut
          ? ` — écran d'erreur : ${etat.ecranErreur} · contenu attendu absent : ${!etat.aLeContenu}` +
            (erreurs.length ? ` · ${erreurs[0].slice(0, 120)}` : "")
          : ""),
    );
  }
} catch (e) {
  console.error("Contrôle interrompu :", e.message);
  defauts += 1;
}

console.log(`\n${resultats.length} écran(s) contrôlé(s) — ${defauts} en défaut.`);
try {
  ws.close();
  process.kill(-chrome.pid);
} catch {
  /* le navigateur peut déjà être arrêté */
}
process.exit(defauts > 0 ? 1 : 0);
