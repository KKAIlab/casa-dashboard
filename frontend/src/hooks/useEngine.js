import { useCallback, useState } from 'react'
import { preprocessCSV, readFileText } from '../engine/preprocessing.js'
import { runAnalysisPipeline } from '../engine/pipeline.js'
import { classifyByProportions, computeDensityScore } from '../engine/prediction.js'
import { useDB } from './useDB.js'

export function useEngine() {
  const db = useDB()
  const [progress, setProgress] = useState(null)

  const uploadAndPreprocess = useCallback(async (file, meta) => {
    const text = await readFileText(file)
    const { data, totalSperm, motileSperm, error } = preprocessCSV(text, meta)
    if (error) throw new Error(error)
    return db.uploadDataset({
      name: meta.name || file.name.replace('.csv', ''),
      genotype: meta.genotype,
      mouseId: meta.mouseId,
      group: meta.group || meta.genotype,
      csvText: text, totalSperm, motileSperm,
    })
  }, [db])

  const importProcessed = useCallback(async (file, meta) => {
    const text = await readFileText(file)
    const { data, totalSperm } = preprocessCSV(text, { mouseId: meta.mouseId || 'imported', group: meta.genotype })
    const hasTsne = data.length > 0 && 'tSNE1' in data[0]
    const id = await db.uploadDataset({
      name: meta.name || file.name.replace('.csv', ''),
      genotype: meta.genotype, mouseId: meta.mouseId || 'imported',
      group: meta.genotype, csvText: text, totalSperm, motileSperm: data.length,
    })
    if (hasTsne) {
      await db.saveResults(id, {
        tsne: data.map(r => [r.tSNE1, r.tSNE2]),
        clusters: data.map(r => r.Cluster),
        stats: { baseline: {}, clusterProportions: {} },
        clusterProps: {}, analyzedData: data,
      })
    }
    return id
  }, [db])

  const analyze = useCallback(async (datasetId) => {
    setProgress({ status: 'running', message: 'Loading data...' })
    const ds = await db.getDataset(datasetId)
    if (!ds) throw new Error('Dataset not found')
    const { data, error } = preprocessCSV(ds.raw, { mouseId: ds.mouseId, group: ds.group })
    if (error) {
      setProgress({ status: 'error', message: error })
      throw new Error(error)
    }
    const result = runAnalysisPipeline(data, ({ step, message }) => {
      setProgress({ status: 'running', message })
    })
    if (result.error) {
      setProgress({ status: 'error', message: result.error })
      await db.updateDataset(datasetId, { status: 'error' })
      throw new Error(result.error)
    }
    await db.saveResults(datasetId, {
      tsne: result.analyzedData.map(r => [r.tSNE1, r.tSNE2]),
      clusters: result.analyzedData.map(r => r.Cluster),
      stats: result.stats,
      clusterProps: result.stats.clusterProportions,
      analyzedData: result.analyzedData,
    })
    await db.updateDataset(datasetId, { motileSperm: result.analyzedData.length, status: 'done' })
    setProgress({ status: 'done', message: 'Analysis complete' })
    return result
  }, [db])

  const getChartData = useCallback(async (datasetId, chartType) => {
    const results = await db.getResults(datasetId)
    if (!results) return null
    const { analyzedData } = results
    switch (chartType) {
      case 'tsne_landscape':
        return { tSNE1: analyzedData.map(r => r.tSNE1), tSNE2: analyzedData.map(r => r.tSNE2), Cluster: analyzedData.map(r => r.Cluster), Mouse: analyzedData.map(r => r.Mouse) }
      case 'cluster_proportions':
        return Object.entries(results.clusterProps).map(([mouse, props]) => ({ Mouse: mouse, ...props }))
      case 'parameter_box': {
        const params = ['VCL', 'VSL', 'ALH', 'BCF']
        const out = {}
        for (const p of params) { out[p] = { values: analyzedData.map(r => r[p]), cluster: analyzedData.map(r => r.Cluster), mouse: analyzedData.map(r => r.Mouse) } }
        return out
      }
      default: return null
    }
  }, [db])

  const compareDatasets = useCallback(async (datasetIds) => {
    const allData = { tSNE1: [], tSNE2: [], dataset_name: [], Cluster: [] }
    for (const id of datasetIds) {
      const results = await db.getResults(id)
      const ds = await db.getDataset(id)
      if (!results) continue
      for (const row of results.analyzedData) {
        allData.tSNE1.push(row.tSNE1); allData.tSNE2.push(row.tSNE2)
        allData.Cluster.push(row.Cluster); allData.dataset_name.push(ds.name)
      }
    }
    return allData
  }, [db])

  const predict = useCallback(async (datasetId, modelType, referenceResults) => {
    const results = await db.getResults(datasetId)
    if (!results) throw new Error('No analysis results. Run analysis first.')
    if (modelType === 'cluster_classifier') {
      if (!referenceResults || referenceResults.length < 2) throw new Error('Upload at least 2 labeled reference datasets')
      const sampleProps = results.clusterProps
      const firstMouse = Object.keys(sampleProps)[0]
      return { result: classifyByProportions(sampleProps[firstMouse], referenceResults) }
    }
    if (modelType === 'density_scoring') {
      if (!referenceResults) throw new Error('Upload a reference dataset')
      const result = computeDensityScore(results.tsne, referenceResults.tsne || referenceResults)
      return { result: { similarity_score: result.similarityScore, js_divergence: result.jsDivergence } }
    }
    throw new Error(`Unknown model type: ${modelType}`)
  }, [db])

  return { uploadAndPreprocess, importProcessed, analyze, getChartData, compareDatasets, predict, progress }
}
