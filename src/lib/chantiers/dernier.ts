// Mémoire du dernier chantier consulté (stockage local du navigateur).
//
// Sert au bouton « Saisie du jour » et à l'accueil : ouvrir directement
// le journal du chantier sur lequel l'utilisateur travaille, sans repasser
// par la liste des chantiers.
//
// Toutes les erreurs de stockage (mode privé, quota...) sont ignorées :
// au pire, la fonctionnalité retombe sur la liste des chantiers.

export const CLE_DERNIER_CHANTIER = "btp.dernier.chantier";

export function memoriserDernierChantier(id: string): void {
  try {
    if (typeof localStorage !== "undefined" && id) {
      localStorage.setItem(CLE_DERNIER_CHANTIER, id);
    }
  } catch {
    // stockage local indisponible : on ignore
  }
}

export function lireDernierChantier(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const id = localStorage.getItem(CLE_DERNIER_CHANTIER);
    return id && id.trim() !== "" ? id : null;
  } catch {
    return null;
  }
}

export function oublierDernierChantier(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(CLE_DERNIER_CHANTIER);
    }
  } catch {
    // stockage local indisponible : on ignore
  }
}
