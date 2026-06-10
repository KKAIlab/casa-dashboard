import { openDB } from 'idb'

const DB_NAME = 'CASADashboardDB'
const DB_VERSION = 1

let _dbPromise = null

export async function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('datasets')) {
          const ds = db.createObjectStore('datasets', { keyPath: 'id', autoIncrement: true })
          ds.createIndex('genotype', 'genotype')
        }
        if (!db.objectStoreNames.contains('results')) {
          db.createObjectStore('results', { keyPath: 'datasetId' })
        }
      },
    })
  }
  return _dbPromise
}

export async function closeDB() {
  if (_dbPromise) {
    const db = await _dbPromise
    db.close()
    _dbPromise = null
  }
}

// Probe whether persistent storage is usable. IndexedDB can be missing or
// blocked (private browsing in some browsers, disabled site data, strict
// privacy settings), in which case the whole app silently fails to load or
// save datasets. Returns { ok, error } so the UI can warn instead of looking
// inexplicably empty.
export async function checkStorage() {
  if (typeof indexedDB === 'undefined') {
    return { ok: false, error: 'This browser does not support IndexedDB.' }
  }
  try {
    const db = await getDB()
    await db.count('datasets')
    return { ok: true, error: null }
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'IndexedDB is unavailable (it may be blocked by private browsing or privacy settings).',
    }
  }
}

export async function addDataset({ name, genotype, mouseId, group, totalSperm, motileSperm, raw }) {
  const db = await getDB()
  return db.add('datasets', {
    name: name || 'Unnamed',
    genotype: genotype || '',
    mouseId: mouseId || '',
    group: group || genotype || '',
    totalSperm: totalSperm || 0,
    motileSperm: motileSperm || 0,
    status: 'pending',
    createdAt: Date.now(),
    raw: raw || '',
  })
}

export async function getDatasets() {
  const db = await getDB()
  const all = await db.getAll('datasets')
  return all.map(({ raw, ...rest }) => rest)
}

export async function getDataset(id) {
  const db = await getDB()
  return db.get('datasets', id)
}

export async function updateDataset(id, updates) {
  const db = await getDB()
  const ds = await db.get('datasets', id)
  if (!ds) throw new Error(`Dataset ${id} not found`)
  const updated = { ...ds, ...updates }
  await db.put('datasets', updated)
  return updated
}

export async function deleteDataset(id) {
  const db = await getDB()
  const tx = db.transaction(['datasets', 'results'], 'readwrite')
  await tx.objectStore('datasets').delete(id)
  try { await tx.objectStore('results').delete(id) } catch { /* may not exist */ }
  await tx.done
}

export async function saveResults(datasetId, { tsne, clusters, stats, clusterProps, analyzedData }) {
  const db = await getDB()
  const tx = db.transaction(['results', 'datasets'], 'readwrite')
  await tx.objectStore('results').put({
    datasetId,
    tsne,
    clusters,
    stats,
    clusterProps,
    analyzedData,
  })

  const ds = await tx.objectStore('datasets').get(datasetId)
  if (ds) {
    ds.status = 'done'
    await tx.objectStore('datasets').put(ds)
  }
  await tx.done
}

export async function getResults(datasetId) {
  const db = await getDB()
  return db.get('results', datasetId)
}
