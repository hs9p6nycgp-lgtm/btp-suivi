// Exemples de fondations types
import { Point3D, sommetsCube } from "./model3d";

export function fondationSemelleIsoléeStandard(): {
  base: Point3D[];
  volume: number;
} {
  const base = sommetsCube(2);
  return { base, volume: 2 * 2 * 0.5 };
}

export function fondationRadierStandard(largeur: number, longueur: number, épaisseur: number): {
  base: Point3D[];
  volume: number;
} {
  const base = sommetsCube(Math.max(largeur, longueur));
  return { base, volume: largeur * longueur * épaisseur };
}