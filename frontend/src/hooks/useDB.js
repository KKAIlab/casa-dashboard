import { useCallback } from 'react'
import * as db from '../db/index.js'

export function useDB() {
  const getDatasets = useCallback(() => db.getDatasets(), [])
  const getDataset = useCallback((id) => db.getDataset(id), [])
  const deleteDataset = useCallback((id) => db.deleteDataset(id), [])
  const getResults = useCallback((id) => db.getResults(id), [])

  const uploadDataset = useCallback(async ({ name, genotype, mouseId, group, csvText, totalSperm, motileSperm }) => {
    return db.addDataset({ name, genotype, mouseId, group, totalSperm, motileSperm, raw: csvText })
  }, [])

  const saveResults = useCallback((datasetId, results) => db.saveResults(datasetId, results), [])
  const updateDataset = useCallback((id, updates) => db.updateDataset(id, updates), [])

  return { getDatasets, getDataset, deleteDataset, getResults, uploadDataset, saveResults, updateDataset }
}
