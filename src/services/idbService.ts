
// The temporary scene assets cache (IndexedDB) implemented here provides
// a minimal, short-lived cache for transferring data across full page
// navigations (designer <-> planner). This is intended as a one-time
// handoff mechanism between pages where in-memory state is lost.

// The database version defines whether the schema is up to date with the
// cached store. Increment the database version when there are any changes
// to the schema. 

import * as tracker from 'utils/tracker'

const DB_NAME = "temp-cache-db"
const STORE_NAME = "tempAssets"
const DB_VERSION = 1

export type SceneAssetCacheEntry = {
  uuid: string
  asset: Blob
}

function openSceneAssetsCacheDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const onfailure = (error?: DOMException | null) => {
      tracker.workflow(`RoomBuilder.AssetsCachingNotSupported`, { error })
      resolve(null)
    }

    if (!indexedDB) {
      onfailure(new DOMException(`IndexedDB API not supported.`))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => onfailure(request.error)
    request.onblocked = () => onfailure(request.error)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
  })
}

export async function cacheSceneAsset(
  assetKey: string,
  asset: SceneAssetCacheEntry,
): Promise<void> {
  const startTime = Date.now()

  const database = await openSceneAssetsCacheDB()
  if (!database) {
    return
  }
  
  try {
    const databaseInitTime = Date.now()

    await new Promise<void>((resolve) => {
      const transaction = database.transaction(STORE_NAME, "readwrite")
      const store = transaction.objectStore(STORE_NAME)

      store.put(asset, assetKey)

      const onfailure = (error: DOMException | null) => {
        tracker.workflow(`RoomBuilder.${assetKey}CachingFailed`, { error })
        resolve()
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => onfailure(transaction.error)
      transaction.onabort = () => onfailure(transaction.error)
    })

    const transactionTime = Date.now()

    tracker.workflow(`RoomBuilder.${assetKey}Cached`, {
      databaseInitilizationDuration: databaseInitTime - startTime,
      transactionDuration: transactionTime - databaseInitTime,
      size: asset.asset.size,
    })

  } catch (error) {
    tracker.error(`RoomBuilder.${assetKey}CachingFailed`, { error })
  } finally {
    database.close()
  }
}

export async function consumeCachedSceneAsset(
  assetKey: string,
): Promise<SceneAssetCacheEntry | undefined> {
  const database = await openSceneAssetsCacheDB()
  if (!database) {
    return undefined
  }

  try {
    const result = await new Promise<
      SceneAssetCacheEntry | undefined
    >((resolve) => {
      const transaction = database.transaction(STORE_NAME, "readwrite")
      const store = transaction.objectStore(STORE_NAME)

      const getRequest = store.get(assetKey)

      const onfailure = (error: DOMException | null) => {
        tracker.workflow(`RoomBuilder.${assetKey}CacheReadingFailed`, { error })
        resolve(undefined)
      }

      getRequest.onerror = () => onfailure(getRequest.error)
      getRequest.onsuccess = () => {
        const asset = getRequest.result as SceneAssetCacheEntry | undefined
        if (!asset) {
          resolve(undefined)
        }

        const deleteReq = store.delete(assetKey)
        deleteReq.onerror = () => onfailure(deleteReq.error)
        deleteReq.onsuccess = () => resolve(asset)
      }

      transaction.onerror = () => onfailure(transaction.error)
      transaction.onabort = () => onfailure(transaction.error)
    })
    
    return result

  } catch (error) {
    tracker.error(`RoomBuilder.${assetKey}CacheReadingFailed`, { error })
    return undefined
  } finally {
    database.close()
  }
}
