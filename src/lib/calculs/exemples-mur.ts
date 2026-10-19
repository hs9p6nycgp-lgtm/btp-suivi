// Exemples de murs types pour le BTP ivoirien
import { Point3D, sommetsCube } from "./model3d";

export function murPortiqueStandard(): {
  sommets: Point3D[];
  infoPoteaux: Array<{ x: number; retrait: number }>;
} {
  const sommets = sommetsCube(8);
  const infoPoteaux = [
    { x: -4, retrait: 0.15 },
    { x: 4, retrait: 0.15 }
  ];
  return { sommets, infoPoteaux };
}

export function murPleinStandard(): {
  sommets: Point3D[];
} {
  return { sommets: sommetsCube(8) };
}

export function murMixeStandard(): {
  sommetsCorps: Point3D[];
  infoPoteaux: Array<{ x: number; retrait: number }>;
} {
  const sommets = sommetsCube(8);
  const infoPoteaux = [
    { x: -4, retrait: 0.15 },
    { x: 4, retrait: 0.15 }
  ];
  return { sommetsCorps: sommets, infoPoteaux };
}