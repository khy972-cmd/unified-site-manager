export type AttachmentType = "photo" | "drawing";

export interface AttachmentRef {
  id: string;
  type: AttachmentType;
  status: string;
  timestamp: string;
}

const DB_NAME = "inopnc_blobs_v1";
const STORE_NAME = "blobs";
const DB_VERSION = 1;

const objectUrlCache = new Map<string, string>();

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error("indexeddb_unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function makeRefId(worklogId: string, type: AttachmentType, index: number) {
  return `att_${worklogId}_${type}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getBlob(refId: string) {
  if (!isBrowser()) return null;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(refId);
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    await txDone(tx);
    return blob;
  } finally {
    db.close();
  }
}

export function isAttachmentRef(value: unknown): value is AttachmentRef {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    (row.type === "photo" || row.type === "drawing") &&
    typeof row.status === "string" &&
    typeof row.timestamp === "string"
  );
}

export async function saveFiles(params: {
  worklogId: string;
  type: AttachmentType;
  files: File[];
  defaultStatus: string;
}) {
  const { worklogId, type, files, defaultStatus } = params;
  if (!isBrowser()) return [] as AttachmentRef[];
  if (!Array.isArray(files) || files.length === 0) return [] as AttachmentRef[];

  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const refs: AttachmentRef[] = [];

    files.forEach((file, index) => {
      const id = makeRefId(worklogId || "temp", type, index);
      const ref: AttachmentRef = {
        id,
        type,
        status: defaultStatus,
        timestamp: new Date().toISOString(),
      };
      refs.push(ref);
      store.put(file, id);
    });

    await txDone(tx);
    return refs;
  } finally {
    db.close();
  }
}

export async function getObjectUrl(refId: string) {
  if (!refId) return null;
  if (objectUrlCache.has(refId)) return objectUrlCache.get(refId) || null;

  const blob = await getBlob(refId);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  objectUrlCache.set(refId, url);
  return url;
}

export function revokeObjectUrl(refId: string) {
  const url = objectUrlCache.get(refId);
  if (!url) return;
  URL.revokeObjectURL(url);
  objectUrlCache.delete(refId);
}

export function revokeAllObjectUrls() {
  objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
  objectUrlCache.clear();
}

export async function deleteRef(refId: string) {
  if (!isBrowser() || !refId) return;
  revokeObjectUrl(refId);

  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(refId);
    await txDone(tx);
  } finally {
    db.close();
  }
}
