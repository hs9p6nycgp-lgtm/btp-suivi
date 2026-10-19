// Exemples de poteaux types
import { Point3D, sommetsPoteau } from "./model3d";

export function poteauIsoléStandard(): Point3D[] {
  return sommetsPoteau(3, { cote: 0.4, hauteur: 3 });
}

export function poteauRangéeStandard(ligne: number, entracte: number): Point3D[] {
  const pts: Point3D[] = [];
  for (let i = 0; i < 5; i++) {
    const x = i * entracte;
    const s = sommetsPoteau(3, { cote: 0.4, hauteur: 3 });
    pts.push(...s.map((p): Point3D => [p[0] + x, p[1], p[2]]));
  }
  return pts;
}