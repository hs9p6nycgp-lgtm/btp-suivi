// Exemples de poutres types
import { Point3D, sommetsCylindre } from "./model3d";

export function poutreSimpleAppuiStandard(): {
  sommets: Point3D[];
  faces: number[][];
} {
  return sommetsCylindre(0.3, 6, 16);
}

export function poutreContinuStandard(): {
  sommets: Point3D[];
  faces: number[][];
} {
  const s1 = sommetsCylindre(0.3, 6, 16);
  const s2 = sommetsCylindre(0.3, 6, 16);
  const décalé: Point3D[] = s2.sommets.map((p): Point3D => [p[0] + 6, p[1], p[2]]);
  // Les faces de la seconde poutre sont renumérotées après les sommets de la première.
  const facesDécalées = s2.faces.map((face) => face.map((i) => i + s1.sommets.length));
  return { sommets: [...s1.sommets, ...décalé], faces: [...s1.faces, ...facesDécalées] };
}