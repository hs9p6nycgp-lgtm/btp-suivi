export type Langue = "fr" | "en";

const LANGUE_STORAGE_KEY = "btp-suivi-langue";

export const DICTIONNAIRE: Record<string, Record<Langue, string>> = {
  // Navigation
  "nav.accueil": { fr: "Accueil", en: "Home" },
  "nav.chantiers": { fr: "Chantiers", en: "Sites" },
  "nav.dashboard": { fr: "Tableau de bord", en: "Dashboard" },
  "nav.bpu": { fr: "Base de prix", en: "Price Library" },
  "nav.referentiel": { fr: "Référentiel de prix", en: "Price Reference" },
  "nav.fournisseurs": { fr: "Fournisseurs", en: "Suppliers" },
  "nav.export": { fr: "Export Excel", en: "Excel Export" },
  "nav.rapports": { fr: "Rapports", en: "Reports" },
  "nav.devis": { fr: "Calcul de devis", en: "Estimates" },
  "nav.mur": { fr: "Calcul de murs", en: "Wall calculator" },

  // Navigation des onglets d'un chantier
  "nav.groupe_chantier": { fr: "Onglets du chantier", en: "Site tabs" },
  "detail.metre": { fr: "Métré & DQE", en: "Quantity & DQE" },

  // Top bar
  "topbar.rechercher": { fr: "Rechercher...", en: "Search..." },
  "topbar.theme": { fr: "Thème", en: "Theme" },
  "topbar.alertes": { fr: "Alertes", en: "Alerts" },
  "topbar.profil": { fr: "Profil", en: "Profile" },
  "topbar.saisie_jour": { fr: "Saisie du jour", en: "Daily entry" },

  // Actions communes
  "action.creer": { fr: "Créer", en: "Create" },
  "action.ajouter": { fr: "Ajouter", en: "Add" },
  "action.enregistrer": { fr: "Enregistrer", en: "Save" },
  "action.modifier": { fr: "Modifier", en: "Edit" },
  "action.supprimer": { fr: "Supprimer", en: "Delete" },
  "action.annuler": { fr: "Annuler", en: "Cancel" },
  "action.retour": { fr: "Retour", en: "Back" },
  "action.fermer": { fr: "Fermer", en: "Close" },

  // Statuts
  "statut.en_preparation": { fr: "En préparation", en: "Preparation" },
  "statut.en_cours": { fr: "En cours", en: "In Progress" },
  "statut.suspendu": { fr: "Suspendu", en: "Suspended" },
  "statut.receptionne_provisoirement": { fr: "Réceptionné prov.", en: "Provisional Acceptance" },
  "statut.cloture": { fr: "Clôturé", en: "Closed" },
  "statut.a_faire": { fr: "À faire", en: "To Do" },
  "statut.termine": { fr: "Terminé", en: "Done" },
  "statut.retarde": { fr: "Retardé", en: "Delayed" },
  "statut.annule": { fr: "Annulé", en: "Cancelled" },

  // Erreurs Supabase traduites
  "err.invalid_credentials": { fr: "Identifiants incorrects.", en: "Invalid credentials." },
  "err.email_already_registered": { fr: "Cet e-mail est déjà utilisé.", en: "This email is already registered." },
  "err.invalid_email": { fr: "E-mail invalide.", en: "Invalid email." },
  "err.password_too_short": { fr: "Le mot de passe est trop court (minimum 6 caractères).", en: "Password is too short (minimum 6 characters)." },
  "err.email_not_confirmed": { fr: "Votre e-mail n'est pas encore confirmé. Vérifiez votre boîte de réception.", en: "Your email is not confirmed yet. Check your inbox." },
  "err.user_not_found": { fr: "Utilisateur introuvable.", en: "User not found." },
  "err.network": { fr: "Erreur de connexion. Vérifiez votre réseau.", en: "Network error. Check your connection." },
  "err.unknown": { fr: "Une erreur est survenue.", en: "An error occurred." },

  // Accueil
  "home.titre": { fr: "Tableau de bord", en: "Dashboard" },
  "home.connecte": { fr: "Connecté en tant que {email}", en: "Logged in as {email}" },
  "home.chantiers": { fr: "Chantiers", en: "Sites" },
  "home.en_cours": { fr: "En cours", en: "In Progress" },
  "home.montant_cumule": { fr: "Montant cumulé", en: "Total Amount" },
  "home.chantiers_recents": { fr: "Chantiers récents", en: "Recent Sites" },
  "home.aucun_chantier": { fr: "Aucun chantier pour le moment.", en: "No sites for the moment." },
  "home.creer_chantier": { fr: "Créer mon premier chantier", en: "Create my first site" },
  "home.voir_tout": { fr: "Voir tout", en: "See all" },

  // Chantiers
  "chantiers.titre": { fr: "Chantiers", en: "Sites" },
  "chantiers.nouveau": { fr: "Nouveau chantier", en: "New Site" },
  "chantiers.rechercher": { fr: "Rechercher un chantier...", en: "Search a site..." },
  "chantiers.tous_types": { fr: "Tous les types", en: "All types" },
  "chantiers.tous_statuts": { fr: "Tous les statuts", en: "All statuses" },
  "chantiers.type_route": { fr: "Route", en: "Road" },
  "chantiers.type_batiment": { fr: "Bâtiment", en: "Building" },
  "chantiers.statut": { fr: "Statut", en: "Status" },
  "chantiers.maitre_ouvrage": { fr: "Maître d'ouvrage", en: "Project Owner" },
  "chantiers.montant": { fr: "Montant", en: "Amount" },
  "chantiers.avancement": { fr: "Avancement", en: "Progress" },
  "chantiers.aucun": { fr: "Aucun chantier ne correspond aux filtres.", en: "No sites match the filters." },

  // Nouveau chantier
  "nouveau_chantier.titre": { fr: "Nouveau chantier", en: "New Site" },
  "nouveau_chantier.nom": { fr: "Nom du chantier *", en: "Site name *" },
  "nouveau_chantier.type": { fr: "Type *", en: "Type *" },
  "nouveau_chantier.type_route": { fr: "Route", en: "Road" },
  "nouveau_chantier.type_batiment": { fr: "Bâtiment", en: "Building" },
  "nouveau_chantier.maitre_ouvrage": { fr: "Maître d'ouvrage", en: "Project Owner" },
  "nouveau_chantier.montant": { fr: "Montant du marché (FCFA)", en: "Contract Amount (FCFA)" },
  "nouveau_chantier.date_debut": { fr: "Date de début", en: "Start Date" },
  "nouveau_chantier.date_fin": { fr: "Date de fin prévue", en: "Planned End Date" },
  "nouveau_chantier.latitude": { fr: "Latitude (optionnel)", en: "Latitude (optional)" },
  "nouveau_chantier.longitude": { fr: "Longitude (optionnel)", en: "Longitude (optional)" },
  "nouveau_chantier.seuil": { fr: "Seuil d'alerte écart de quantité (%)", en: "Quantity variance alert threshold (%)" },
  "nouveau_chantier.creer": { fr: "Créer le chantier", en: "Create Site" },

  // Détail chantier
  "detail.equipe": { fr: "Équipe du chantier", en: "Site Team" },
  "detail.statut": { fr: "Statut du chantier", en: "Site Status" },
  "detail.sections": { fr: "Sections, PK, niveaux et lots", en: "Sections, PK, Levels and Lots" },
  "detail.documents": { fr: "Documents du chantier", en: "Site Documents" },
  "detail.planning": { fr: "Planning & PERT", en: "Planning & PERT" },
  "detail.couts": { fr: "Coûts & Budget", en: "Costs & Budget" },
  "detail.journal": { fr: "Journal de chantier", en: "Site Log" },
  "detail.livraisons": { fr: "Livraisons", en: "Deliveries" },
  "detail.modelisation3d": { fr: "Modélisation 3D", en: "3D Modeling" },

  // Langue
  "langue.titre": { fr: "Langue", en: "Language" },
  "langue.francais": { fr: "Français", en: "French" },
  "langue.anglais": { fr: "Anglais", en: "English" },

  // Authentification
  "auth.connexion": { fr: "Connexion", en: "Sign In" },
  "auth.creer_compte": { fr: "Créer un compte", en: "Create Account" },
  "auth.deja_compte": { fr: "J'ai déjà un compte", en: "I already have an account" },
  "auth.email": { fr: "E-mail", en: "Email" },
  "auth.telephone": { fr: "Téléphone", en: "Phone" },
  "auth.mot_de_passe": { fr: "Mot de passe", en: "Password" },
  "auth.mot_de_passe_oublie": { fr: "Mot de passe oublié ?", en: "Forgot password?" },
  "auth.nom": { fr: "Nom", en: "Name" },
  "auth.se_connecter": { fr: "Se connecter", en: "Sign In" },
  "auth.creer": { fr: "Créer le compte", en: "Create Account" },
  "auth.deconnecter": { fr: "Se déconnecter", en: "Sign Out" },
};

export function getLangue(): Langue {
  if (typeof window === "undefined") return "fr";
  const stock = localStorage.getItem(LANGUE_STORAGE_KEY);
  if (stock === "fr" || stock === "en") return stock as Langue;
  return "fr";
}

export function setLangue(langue: Langue) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANGUE_STORAGE_KEY, langue);
}

export function t(key: string, params?: Record<string, string | number>): string {
  const langue = getLangue();
  const traduction = DICTIONNAIRE[key]?.[langue] || key;
  if (!params) return traduction;
  return traduction.replace(/\{(\w+)\}/g, (_match, nom) => {
    const valeur = params[nom];
    return valeur !== undefined ? String(valeur) : `{${nom}}`;
  });
}

export function traduireErreur(erreur: { message?: string; code?: string; name?: string }): string {
  const msg = erreur.message || "";
  const code = erreur.code || "";

  // Mapping des erreurs Supabase connues
  const mapping: Record<string, string> = {
    "Invalid login credentials": "err.invalid_credentials",
    "Email already registered": "err.email_already_registered",
    "Invalid email": "err.invalid_email",
    "Password should be at least 6 characters": "err.password_too_short",
    "Email not confirmed": "err.email_not_confirmed",
    "User not found": "err.user_not_found",
  };

  const cle = mapping[msg] || mapping[code];
  if (cle) return t(cle);

  // Erreurs réseau
  if (msg.includes("Failed to fetch") || msg.includes("network")) {
    return t("err.network");
  }

  return t("err.unknown");
}