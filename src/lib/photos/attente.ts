// File d'attente des photos : une photo prise hors connexion est conservée
// sur l'appareil (IndexedDB) et partie automatiquement au retour du réseau.
//
// Le chemin de stockage est connu dès la prise de la photo : la ligne de base
// de données et le fichier portent donc la même adresse, et l'image apparaît
// dans le journal dès que la connexion revient (voir NetworkStatus.tsx).

import { createClient } from "@/lib/supabase/client";
import {
  fileAdd,
  fileAll,
  fileCount,
  fileRemove,
  type FichierEnAttente,
} from "@/lib/offline/storage";
import { BUCKET_PHOTOS } from "./urls";
import { cheminPhoto } from "./regles.ts";

export { cheminPhoto };

/**
 * Ajoute une photo à la file d'attente.
 * Retourne false si le stockage local est indisponible (photo perdue).
 */
export async function enregistrerPhotoEnAttente(
  chemin: string,
  fichier: File | Blob,
): Promise<boolean> {
  const nom = typeof File !== "undefined" && fichier instanceof File ? fichier.name : "photo.jpg";
  return await fileAdd({
    chemin,
    nom,
    taille: fichier.size,
    blob: fichier,
    createdAt: Date.now(),
  });
}

/** Photos encore en attente d'envoi. */
export async function photosEnAttente(): Promise<FichierEnAttente[]> {
  return await fileAll();
}

/** Nombre de photos en attente d'envoi. */
export async function nombrePhotosEnAttente(): Promise<number> {
  return await fileCount();
}

/**
 * Envoie les photos en attente. En cas d'échec, on s'arrête : les suivantes
 * attendront le prochain essai (l'ordre de la file est celui de la prise).
 * Retourne le nombre de photos envoyées.
 */
export async function envoyerPhotosEnAttente(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;

  const supabase = createClient();
  const fichiers = await fileAll();
  let envoyees = 0;

  for (const fichier of fichiers) {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_PHOTOS)
        .upload(fichier.chemin, fichier.blob, { upsert: true });
      if (error) break;
      await fileRemove(fichier.chemin);
      envoyees += 1;
    } catch {
      break;
    }
  }

  return envoyees;
}
