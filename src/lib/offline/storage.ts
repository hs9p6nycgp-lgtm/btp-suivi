// Stockage local simple (IndexedDB) pour le mode hors connexion.
// Utilisable uniquement dans le navigateur.

const DB_NAME = "btp-suivi";
// Version 2 : ajout du magasin « fichiers » (photos prises hors connexion).
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("fichiers")) {
        db.createObjectStore("fichiers", { keyPath: "chemin" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result?.value as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      store.put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export type QueuedOp = {
  id?: number;
  table: string;
  operation: "insert" | "update" | "delete";
  payload: unknown;
  filter?: string;
  createdAt: number;
};

// Prévient l'interface qu'une opération vient d'entrer ou de sortir de la file.
function annoncerFile() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("btp-file-attente"));
  }
}

// Retourne true si l'opération a bien été mise en file (false si le stockage est indisponible).
export async function queueAdd(op: Omit<QueuedOp, "id" | "createdAt">): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction("queue", "readwrite");
      const store = tx.objectStore("queue");
      store.add({ ...op, createdAt: Date.now() });
      tx.oncomplete = () => {
        annoncerFile();
        resolve(true);
      };
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function queueAll(): Promise<QueuedOp[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction("queue", "readonly");
      const store = tx.objectStore("queue");
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as QueuedOp[]) ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function queueRemove(id: number): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction("queue", "readwrite");
      const store = tx.objectStore("queue");
      store.delete(id);
      tx.oncomplete = () => {
        annoncerFile();
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

// --- Fichiers en attente (photos prises hors connexion) -----------------------

export type FichierEnAttente = {
  /** Adresse du fichier dans le stockage (bucket « chantiers-documents »). */
  chemin: string;
  nom: string;
  taille: number;
  blob: Blob;
  createdAt: number;
};

/** Ajoute un fichier binaire à la file d'attente. */
export async function fileAdd(fichier: FichierEnAttente): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction("fichiers", "readwrite");
      const store = tx.objectStore("fichiers");
      store.put(fichier);
      tx.oncomplete = () => {
        annoncerFile();
        resolve(true);
      };
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/** Tous les fichiers en attente, du plus ancien au plus récent. */
export async function fileAll(): Promise<FichierEnAttente[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction("fichiers", "readonly");
      const store = tx.objectStore("fichiers");
      const req = store.getAll();
      req.onsuccess = () => {
        const fichiers = (req.result as FichierEnAttente[]) ?? [];
        resolve([...fichiers].sort((a, b) => a.createdAt - b.createdAt));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/** Retire un fichier de la file (après envoi réussi). */
export async function fileRemove(chemin: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction("fichiers", "readwrite");
      const store = tx.objectStore("fichiers");
      store.delete(chemin);
      tx.oncomplete = () => {
        annoncerFile();
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

/** Nombre de fichiers en attente d'envoi. */
export async function fileCount(): Promise<number> {
  const fichiers = await fileAll();
  return fichiers.length;
}