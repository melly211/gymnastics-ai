const DATABASE_NAME = 'gymnastics-ai-history'
const DATABASE_VERSION = 1
const ANALYSES_STORE = 'analyses'
const VIDEOS_STORE = 'videos'

let databasePromise

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error('This browser does not support private analysis history storage.'))
        return
      }

      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(ANALYSES_STORE)) {
          database.createObjectStore(ANALYSES_STORE, { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains(VIDEOS_STORE)) {
          database.createObjectStore(VIDEOS_STORE, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Could not open browser history storage.'))
    })
  }

  return databasePromise
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not read browser history storage.'))
  })
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save browser history.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving browser history was interrupted.'))
  })
}

export async function saveAnalysisHistory(file, analysis) {
  const database = await openDatabase()
  const id = crypto.randomUUID()
  const transaction = database.transaction([ANALYSES_STORE, VIDEOS_STORE], 'readwrite')
  const complete = transactionComplete(transaction)

  transaction.objectStore(ANALYSES_STORE).add({
    id,
    createdAt: new Date().toISOString(),
    filename: file.name,
    fileSize: file.size,
    analysis,
  })
  transaction.objectStore(VIDEOS_STORE).add({ id, file })

  await complete
  return id
}

export async function getAnalysisHistory() {
  const database = await openDatabase()
  const transaction = database.transaction(ANALYSES_STORE, 'readonly')
  const records = await requestResult(transaction.objectStore(ANALYSES_STORE).getAll())

  return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function getSavedAnalysis(id) {
  const database = await openDatabase()
  const transaction = database.transaction([ANALYSES_STORE, VIDEOS_STORE], 'readonly')
  const complete = transactionComplete(transaction)
  const recordRequest = transaction.objectStore(ANALYSES_STORE).get(id)
  const videoRequest = transaction.objectStore(VIDEOS_STORE).get(id)
  const [record, video] = await Promise.all([
    requestResult(recordRequest),
    requestResult(videoRequest),
    complete,
  ])

  if (!record) {
    throw new Error('This saved analysis could not be found in browser history.')
  }

  return { ...record, videoFile: video?.file ?? null }
}

export async function renameSavedAnalysis(id, displayName) {
  const normalizedName = displayName.trim()
  if (!normalizedName) {
    throw new Error('Please enter a name for this analysis.')
  }

  const database = await openDatabase()
  const transaction = database.transaction(ANALYSES_STORE, 'readwrite')
  const store = transaction.objectStore(ANALYSES_STORE)
  const complete = transactionComplete(transaction)
  const record = await requestResult(store.get(id))

  if (!record) {
    await complete
    throw new Error('This saved analysis could not be found in browser history.')
  }

  store.put({ ...record, displayName: normalizedName })
  await complete

  return normalizedName
}

export async function deleteSavedAnalysis(id) {
  const database = await openDatabase()
  const transaction = database.transaction([ANALYSES_STORE, VIDEOS_STORE], 'readwrite')
  const complete = transactionComplete(transaction)

  transaction.objectStore(ANALYSES_STORE).delete(id)
  transaction.objectStore(VIDEOS_STORE).delete(id)

  await complete
}
