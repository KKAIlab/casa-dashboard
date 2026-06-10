import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { addDataset, getDatasets, getDataset, deleteDataset, saveResults, getResults, closeDB, checkStorage } from '../../src/db/index.js'

beforeEach(async () => {
  await closeDB()
  const dbs = await indexedDB.databases()
  for (const db of dbs) {
    indexedDB.deleteDatabase(db.name)
  }
})

describe('datasets CRUD', () => {
  it('adds and retrieves a dataset', async () => {
    const id = await addDataset({
      name: 'Test WT',
      genotype: 'WT',
      mouseId: 'M1',
      group: 'WT',
      totalSperm: 100,
      motileSperm: 60,
      raw: 'Type,VCL\n99,100',
    })
    expect(id).toBeGreaterThan(0)

    const ds = await getDataset(id)
    expect(ds.name).toBe('Test WT')
    expect(ds.genotype).toBe('WT')
    expect(ds.status).toBe('pending')
  })

  it('lists all datasets', async () => {
    await addDataset({ name: 'DS1', genotype: 'WT', raw: '' })
    await addDataset({ name: 'DS2', genotype: 'KO', raw: '' })
    const all = await getDatasets()
    expect(all).toHaveLength(2)
  })

  it('deletes a dataset', async () => {
    const id = await addDataset({ name: 'ToDelete', genotype: 'X', raw: '' })
    await deleteDataset(id)
    const all = await getDatasets()
    expect(all).toHaveLength(0)
  })
})

describe('checkStorage', () => {
  it('reports ok when IndexedDB works', async () => {
    const { ok, error } = await checkStorage()
    expect(ok).toBe(true)
    expect(error).toBeNull()
  })

  it('reports not-ok when IndexedDB is missing', async () => {
    const original = globalThis.indexedDB
    // Simulate a browser without IndexedDB (e.g. blocked by privacy settings).
    delete globalThis.indexedDB
    try {
      const { ok, error } = await checkStorage()
      expect(ok).toBe(false)
      expect(error).toBeTruthy()
    } finally {
      globalThis.indexedDB = original
    }
  })
})

describe('results CRUD', () => {
  it('saves and retrieves analysis results', async () => {
    const dsId = await addDataset({ name: 'DS', genotype: 'WT', raw: '' })
    await saveResults(dsId, {
      tsne: [[1, 2], [3, 4]],
      clusters: [0, 1],
      stats: { baseline: {} },
      clusterProps: {},
      analyzedData: [{ VCL: 100, tSNE1: 1, tSNE2: 2, Cluster: 0 }],
    })

    const results = await getResults(dsId)
    expect(results.tsne).toEqual([[1, 2], [3, 4]])
    expect(results.clusters).toEqual([0, 1])

    const ds = await getDataset(dsId)
    expect(ds.status).toBe('done')
  })
})
