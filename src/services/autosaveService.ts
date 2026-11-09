const DB_NAME = 'DocFusionAutosaveDB'
const STORE_NAME = 'sessions'
const SESSION_KEY = 'active_session'

export interface AutosaveSession {
  buffer: ArrayBuffer
  fileName: string
  timestamp: number
  description?: string
  pageCount?: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'))
      return
    }

    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Saves current document buffer and metadata into browser IndexedDB.
 */
export async function saveAutosaveSession(session: AutosaveSession): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(session, SESSION_KEY)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Fallback: save metadata to localStorage if buffer exceeds storage limits
    try {
      localStorage.setItem(
        'docfusion_autosave_meta',
        JSON.stringify({
          fileName: session.fileName,
          timestamp: session.timestamp,
          description: session.description,
        })
      )
    } catch {
      // Ignore
    }
  }
}

/**
 * Retrieves the persisted autosave session from IndexedDB.
 */
export async function getAutosaveSession(): Promise<AutosaveSession | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(SESSION_KEY)

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Clears the persisted autosave session.
 */
export async function clearAutosaveSession(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(SESSION_KEY)
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    localStorage.removeItem('docfusion_autosave_meta')
  } catch {
    // Ignore
  }
}
