import { useCallback, useState } from 'react'
import { preprocessCSV, readFileText, parseCSVText } from '../engine/preprocessing.js'
import { runAnalysisPipeline } from '../engine/pipeline.js'
import { classifyByProportions, computeDensityScore } from '../engine/prediction.js'
import { trainFertilityAxis, projectOnAxis, summarizeScoresByMouse, coEmbed } from '../engine/crossSpecies.js'
import { useDB } from './useDB.js'

export function useEngine() {
  const db = useDB()
  const [progress, setProgress] = useState(null)

  const uploadAndPreprocess = useCallback(async (file, meta) => {
    const text = await readFileText(file)
    const { totalSperm, motileSperm, error } = preprocessCSV(text, meta)
    if (error) throw new Error(error)
    return db.uploadDataset({
      name: meta.name || file.name.replace('.csv', ''),
      genotype: meta.genotype,
      mouseId: meta.mouseId,
      group: meta.group || meta.genotype,
      csvText: text, totalSperm, motileSperm,
    })
  }, [db])

  // Import a CSV fetched from a URL (used for built-in reference datasets).
  const importFromURL = useCallback(async (url, meta) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
    const text = await res.text()
    const { totalSperm, motileSperm, error } = preprocessCSV(text, meta)
    if (error) throw new Error(error)
    return db.uploadDataset({
      name: meta.name || url.split('/').pop().replace('.csv', ''),
      genotype: meta.genotype,
      mouseId: meta.mouseId,
      group: meta.group || meta.genotype,
      csvText: text, totalSperm, motileSperm,
    })
  }, [db])

  const importProcessed = useCallback(async (file, meta) => {
    const text = await readFileText(file)
    const { rows, errors } = parseCSVText(text)
    if (errors.length > 0 || rows.length === 0) throw new Error('Failed to parse CSV')

    // For processed CSV: use existing Mouse/Group columns, don't filter by Type
    const data = rows.map(row => ({
      ...row,
      Mouse: row.Mouse || meta.mouseId || 'imported',
      Group: row.Group || meta.genotype || 'unknown',
    }))

    const hasTsne = 'tSNE1' in data[0] && 'tSNE2' in data[0]
    const id = await db.uploadDataset({
      name: meta.name || file.name.replace('.csv', ''),
      genotype: meta.genotype, mouseId: meta.mouseId || data[0].Mouse,
      group: meta.group || meta.genotype, csvText: text, totalSperm: data.length, motileSperm: data.length,
    })
    if (hasTsne) {
      const { computeBaselineStats, computeClusterProportions } = await import('../engine/statistics.js')
      const { annotateMotility, computeMotilitySummary } = await import('../engine/motility.js')
      const params = ['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF'].filter(p => p in data[0])
      const annotated = annotateMotility(data)
      await db.saveResults(id, {
        tsne: annotated.map(r => [r.tSNE1, r.tSNE2]),
        clusters: annotated.map(r => r.Cluster),
        stats: {
          baseline: computeBaselineStats(annotated, params),
          clusterProportions: computeClusterProportions(annotated),
          motilitySummary: computeMotilitySummary(annotated),
        },
        clusterProps: computeClusterProportions(annotated),
        analyzedData: annotated,
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
    const result = runAnalysisPipeline(data, ({ message }) => {
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

  // --- Cross-species helpers ---------------------------------------------

  // Pull cell-level rows for a list of dataset IDs. Datasets without analysis
  // results fall back to the raw CSV so the user can train an axis on freshly
  // uploaded references without having to run t-SNE first.
  const loadCellRows = useCallback(async (datasetIds) => {
    const out = []
    for (const id of datasetIds) {
      const ds = await db.getDataset(id)
      if (!ds) continue
      const r = await db.getResults(id)
      if (r?.analyzedData?.length) {
        for (const row of r.analyzedData) out.push({ ...row, _datasetId: id, _datasetName: ds.name })
      } else if (ds.raw) {
        const { data } = preprocessCSV(ds.raw, { mouseId: ds.mouseId, group: ds.group })
        for (const row of data) out.push({ ...row, _datasetId: id, _datasetName: ds.name })
      }
    }
    return out
  }, [db])

  // Train a fertility axis from the union of one or more "fertile" datasets
  // and one or more "subfertile" datasets. Labels are forced regardless of
  // the dataset's stored Group so users can pick the role at training time.
  const trainAxis = useCallback(async (posIds, negIds, params) => {
    const posRows = (await loadCellRows(posIds)).map(r => ({ ...r, Group: '__POS__' }))
    const negRows = (await loadCellRows(negIds)).map(r => ({ ...r, Group: '__NEG__' }))
    const axis = trainFertilityAxis([...posRows, ...negRows], params, '__POS__', '__NEG__')
    return { axis, posCount: posRows.length, negCount: negRows.length }
  }, [loadCellRows])

  // Project mouse datasets onto a trained axis and return per-mouse summary.
  const projectDatasets = useCallback(async (datasetIds, axis) => {
    const rows = await loadCellRows(datasetIds)
    if (rows.length === 0) return { rows: [], scores: [], summary: {} }
    const scores = projectOnAxis(rows, axis)
    const summary = summarizeScoresByMouse(rows, scores)
    return { rows, scores, summary }
  }, [loadCellRows])

  // Run a combined t-SNE on cells from multiple datasets, with per-dataset
  // standardization on by default to remove species-level scale bias.
  const runCoEmbed = useCallback(async (sourceSpecs, params, opts) => {
    const sources = []
    for (const spec of sourceSpecs) {
      const rows = await loadCellRows(spec.datasetIds)
      if (rows.length > 0) sources.push({ rows, label: spec.label })
    }
    return coEmbed(sources, params, opts)
  }, [loadCellRows])

  return {
    uploadAndPreprocess, importProcessed, importFromURL, analyze,
    getChartData, compareDatasets, predict, progress,
    trainAxis, projectDatasets, runCoEmbed,
  }
}
