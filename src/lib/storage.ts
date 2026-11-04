/** IndexedDB через idb: единый kv-стор для снапшота счёта и служебных данных. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface PTDB extends DBSchema {
  kv: {
    key: string
    value: { id: string; v: unknown }
  }
}

let dbPromise: Promise<IDBPDatabase<PTDB>> | null = null

function open(): Promise<IDBPDatabase<PTDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PTDB>('paper-trading', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function loadKV<T>(key: string): Promise<T | null> {
  try {
    const db = await open()
    const row = await db.get('kv', key)
    return row ? (row.v as T) : null
  } catch (e) {
    console.warn('[idb] load failed', key, e)
    return null
  }
}

export async function saveKV(key: string, value: unknown): Promise<void> {
  try {
    const db = await open()
    await db.put('kv', { id: key, v: value })
  } catch (e) {
    console.warn('[idb] save failed', key, e)
  }
}

export async function deleteKV(key: string): Promise<void> {
  try {
    const db = await open()
    await db.delete('kv', key)
  } catch (e) {
    console.warn('[idb] delete failed', key, e)
  }
}
