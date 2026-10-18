// Compression locale des photos avant envoi vers Supabase.
//
// Objectif : économiser les données mobiles et accélérer les téléversements
// sur réseau faible (chantier). La photo est redimensionnée (côté le plus grand
// limité à maxCote) puis ré-encodée en JPEG.
//
// Si la compression échoue ou n'apporte rien (image déjà petite), le fichier
// d'origine est renvoyé tel quel : on ne bloque jamais un téléversement.

export type OptionsCompression = {
  /** Longueur maximale du plus grand côté, en pixels. Défaut : 1600. */
  maxCote?: number;
  /** Qualité JPEG entre 0 et 1. Défaut : 0,72. */
  qualite?: number;
};

/** Calcule les dimensions d'une image redimensionnée pour que son plus grand côté vaille maxCote. */
export function dimensionsReduites(
  largeur: number,
  hauteur: number,
  maxCote: number,
): { largeur: number; hauteur: number } {
  const plusGrandCote = Math.max(largeur, hauteur);
  if (plusGrandCote <= maxCote || plusGrandCote === 0) {
    return { largeur, hauteur };
  }
  const facteur = maxCote / plusGrandCote;
  return {
    largeur: Math.max(1, Math.round(largeur * facteur)),
    hauteur: Math.max(1, Math.round(hauteur * facteur)),
  };
}

async function chargerImage(fichier: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(fichier, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      // certain formats (ex. HEIC selon navigateur) ne passent pas par createImageBitmap
    }
  }
  return await new Promise<ImageBitmap | HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    image.src = url;
  });
}

export async function compresserImage(
  fichier: File,
  options: OptionsCompression = {},
): Promise<File> {
  const { maxCote = 1600, qualite = 0.72 } = options;

  if (typeof document === "undefined" || typeof File === "undefined") return fichier;
  if (!fichier.type.startsWith("image/")) return fichier;
  // Ne pas aplatir les images animées ou vectorielles.
  if (fichier.type === "image/gif" || fichier.type === "image/svg+xml") return fichier;

  try {
    const image = await chargerImage(fichier);
    const { largeur, hauteur } = dimensionsReduites(image.width, image.height, maxCote);

    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const contexte = canvas.getContext("2d");
    if (!contexte) return fichier;
    contexte.drawImage(image, 0, 0, largeur, hauteur);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", qualite);
    });
    if (!blob || blob.size >= fichier.size) return fichier;

    const nom = fichier.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nom, { type: "image/jpeg" });
  } catch {
    return fichier;
  }
}
