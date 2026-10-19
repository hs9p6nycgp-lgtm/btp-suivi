// --- Barrel d'export pour tous les projets ---
// Importation re-exportée de tous les modules du sous-dossier `calculs`

// --- Types communs ---
export type { Point3D, Vector3D, Material3D, TypeMur } from "./model3d";

// --- Éléments architecturaux ---
export {
  createMur,
  createPoteau,
  createPoutre,
  createFondation,
} from "./model3d";

// --- Formes de base ---
export {
  sommetsCube,
  sommetsPyramide,
  sommetsCylindre,
  sommetsSphere,
  sommetsBoite,
  sommetsPoteau,
  facesCube,
} from "./model3d";

// --- Matériaux ---
export { materiaux3D, couleurs3D } from "./model3d";

// --- Exemples prêts à l'emploi ---
export * from "./exemples-mur";
export * from "./exemples-poteau";
export * from "./exemples-poutre";
export * from "./exemples-fondation";
