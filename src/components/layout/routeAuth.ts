// Pages « avant connexion » : connexion, mot de passe oublié, réinitialisation.
// Sur ces pages, la coquille de l'application (barre du haut, barre latérale,
// navigation mobile, bouton « Saisie du jour ») est masquée : elles affichent
// leur propre mise en page plein écran.
const MOTIF_ROUTES_AUTH = /^\/(login|mot-de-passe-oublie|reinitialiser-mot-de-passe)(\/|$)/;

// Pages d'impression : elles doivent sortir proprement sur une feuille A4
// (sans barre latérale ni bouton). Ex. : /chantiers/<id>/imprimer
const MOTIF_ROUTES_IMPRESSION = /\/imprimer(\/|$)/;

export function estRouteAuth(chemin: string): boolean {
  return MOTIF_ROUTES_AUTH.test(chemin);
}

export function estRouteImpression(chemin: string): boolean {
  return MOTIF_ROUTES_IMPRESSION.test(chemin);
}
