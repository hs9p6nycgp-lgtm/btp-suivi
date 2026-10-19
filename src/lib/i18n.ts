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
  "nav.aide": { fr: "Aide", en: "Help" },
  "nav.parametres": { fr: "Mon entreprise", en: "My company" },
  "nav.alertes": { fr: "Alertes", en: "Alerts" },
  "nav.compte": { fr: "Mon compte", en: "My account" },
  "nav.demo": { fr: "Démo", en: "Demo" },
  "topbar.modeTerrain": { fr: "Mode terrain (soleil)", en: "Outdoor mode (sun)" },
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
  "err.db_colonne_manquante": { fr: "La base de données n'est pas à jour (une colonne manque). Appliquez la dernière migration Supabase.", en: "The database is out of date (a column is missing). Apply the latest Supabase migration." },
  "err.db_table_manquante": { fr: "La base de données n'est pas à jour (une table manque). Appliquez la dernière migration Supabase.", en: "The database is out of date (a table is missing). Apply the latest Supabase migration." },
  "err.rls": { fr: "Accès refusé par la sécurité de la base de données.", en: "Access denied by the database security policy." },
  "err.fk": { fr: "Référence invalide : une donnée liée n'existe pas.", en: "Invalid reference: a linked record does not exist." },
  "err.duplicate": { fr: "Cet enregistrement existe déjà.", en: "This record already exists." },
  "inscription_erreur": { fr: "Erreur lors de la création du compte.", en: "Failed to create account." },
  "connexion_erreur": { fr: "Identifiants incorrects ou réseau indisponible.", en: "Invalid credentials or network unavailable." },
  "err.not_null": { fr: "Un champ obligatoire est vide.", en: "A required field is empty." },
  "err.check": { fr: "Valeur refusée par la base de données (règle non respectée).", en: "Value rejected by the database (rule not satisfied)." },

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
  "detail.quality": { fr: "Qualité", en: "Quality" },
  "detail.securite": { fr: "Sécurité (HSE)", en: "Safety (HSE)" },
  "detail.situations": { fr: "Situations de paiement", en: "Payment statements" },

  // Journal de chantier — création robuste réseau
  "journal.enregistre_hors_ligne": { fr: "Pas de réseau : la fiche du jour a été enregistrée sur votre appareil. Elle sera créée automatiquement dès le retour du réseau.", en: "No network: today's log was saved on your device. It will be created automatically once the network is back." },
  "journal.hors_ligne_impossible": { fr: "Impossible d'enregistrer la fiche sur cet appareil (stockage indisponible). Libérez de l'espace puis réessayez.", en: "Could not save the log on this device (storage unavailable). Free up space and try again." },

  // Langue
  "langue.titre": { fr: "Langue", en: "Language" },
  "langue.francais": { fr: "Français", en: "French" },
  "langue.anglais": { fr: "Anglais", en: "English" },

  // Authentification
  "connexion": { fr: "Connexion", en: "Sign In" },
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

  // Messages de création de compte
  "account_created": {
    fr: "Compte créé. Vérifiez votre boîte mail si une confirmation est demandée.",
    en: "Account created. Check your inbox if confirmation is required.",
  },
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

  // Erreurs de base de donnees (PostgREST / PostgreSQL) : message precis
  // pour agir, suivi du detail brut entre parentheses.
  if (code === "PGRST204" || /could not find the .*column/i.test(msg)) {
    return `${t("err.db_colonne_manquante")} (${msg})`;
  }
  if (code === "42P01" || /relation .* does not exist/i.test(msg)) {
    return `${t("err.db_table_manquante")} (${msg})`;
  }
  if (code === "42501" || /row-level security/i.test(msg)) {
    return t("err.rls");
  }
  if (code === "23503" || /foreign key/i.test(msg)) {
    return t("err.fk");
  }
  if (code === "23505" || /duplicate key/i.test(msg)) {
    return t("err.duplicate");
  }
  if (code === "23514" || /check constraint/i.test(msg)) {
    return t("err.check");
  }
  if (code === "23502" || /not-null constraint/i.test(msg)) {
    return t("err.not_null");
  }

  // Erreurs réseau
  if (msg.includes("Failed to fetch") || msg.includes("network")) {
    return t("err.network");
  }

  // Inconnue : garder le message d'origine pour pouvoir diagnostiquer.
  return msg ? `${t("err.unknown")} (${msg})` : t("err.unknown");
}