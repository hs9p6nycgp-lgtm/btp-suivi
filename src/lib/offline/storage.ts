// Stockage local simple (IndexedDB) pour le mode hors connexion.
// Utilisable uniquement dans le navigateur.

const DB_NAME = "btp-suivi";
const DB_VERSION = 1;

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

// Retourne true si l'opération a bien été mise en file (false si le stockage est indisponible).
export async function queueAdd(op: Omit<QueuedOp, "id" | "createdAt">): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction("queue", "readwrite");
      const store = tx.objectStore("queue");
      store.add({ ...op, createdAt: Date.now() });
      tx.oncomplete = () => resolve(true);
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
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}