import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface WalluDB extends DBSchema {
  school_cache: {
    key: string; // ex: 'school_data_cache'
    value: {
      timestamp: number;
      data: any;
    };
  };
  sync_queue: {
    key: number;
    value: {
      id?: number;
      action: string;
      payload: any;
      created_at: number;
    };
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<WalluDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') return null; // Safe for SSR (Next.js)
  
  if (!dbPromise) {
    dbPromise = openDB<WalluDB>('wallu-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('school_cache')) {
          db.createObjectStore('school_cache');
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date', 'created_at');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSchoolCache(data: any) {
  const db = await getDB();
  if (!db) return;
  await db.put('school_cache', { timestamp: Date.now(), data }, 'school_data_cache');
}

export async function getSchoolCache() {
  const db = await getDB();
  if (!db) return null;
  const cache = await db.get('school_cache', 'school_data_cache');
  return cache ? cache.data : null;
}

export async function queueOfflineAction(action: string, payload: any) {
  const db = await getDB();
  if (!db) return;
  await db.add('sync_queue', {
    action,
    payload,
    created_at: Date.now()
  });
}

export async function getOfflineQueue() {
  const db = await getDB();
  if (!db) return [];
  return await db.getAllFromIndex('sync_queue', 'by-date');
}

export async function clearOfflineAction(id: number) {
  const db = await getDB();
  if (!db) return;
  await db.delete('sync_queue', id);
}
