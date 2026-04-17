import { CONFIG } from './config.js'
import { runTsne } from './tsne.js'
import { kmeans, standardize } from './clustering.js'
import { computeBaselineStats, computeClusterProportions } from './statistics.js'
import { annotateMotility, computeMotilitySummary } from './motility.js'

export function runAnalysisPipeline(motileData, onProgress) {
  if (!motileData || motileData.length === 0) {
    return { analyzedData: [], stats: {}, error: 'No data to analyze' }
  }

  const features = CONFIG.TSNE_FEATURES

  if (onProgress) onProgress({ step: 1, message: 'Extracting features...' })
  const featureRows = motileData.map(row => features.map(f => row[f]))
  const valid = featureRows.filter(r => r.every(v => v != null && !isNaN(v)))

  if (valid.length === 0) {
    return { analyzedData: [], stats: {}, error: 'No valid feature rows found' }
  }

  // Deduplicate
  const seen = new Set()
  const uniqueIndices = []
  const uniqueFeatures = []
  for (let i = 0; i < valid.length; i++) {
    const key = valid[i].join('_')
    if (!seen.has(key)) {
      seen.add(key)
      uniqueIndices.push(i)
      uniqueFeatures.push(valid[i])
    }
  }

  // t-SNE
  if (onProgress) onProgress({ step: 2, message: `Running t-SNE on ${uniqueFeatures.length} unique points...` })
  const embedding = runTsne(uniqueFeatures, (done, total) => {
    if (onProgress) onProgress({ step: 2, message: `t-SNE: perplexity ${done}/${total}` })
  })

  // K-Means
  if (onProgress) onProgress({ step: 3, message: 'Clustering...' })
  const clusterLabels = kmeans(embedding, CONFIG.N_CLUSTERS, CONFIG.RANDOM_STATE, CONFIG.KMEANS_N_INIT)

  // Build lookup
  const lookup = {}
  uniqueFeatures.forEach((feat, i) => {
    lookup[feat.join('_')] = {
      tSNE1: embedding[i][0],
      tSNE2: embedding[i][1],
      Cluster: clusterLabels[i],
    }
  })

  // Merge back
  let analyzedData = []
  for (const row of motileData) {
    const vals = features.map(f => row[f])
    if (vals.some(v => v == null || isNaN(v))) continue
    const key = vals.join('_')
    const tsneResult = lookup[key]
    if (tsneResult) {
      analyzedData.push({ ...row, ...tsneResult })
    }
  }

  // Annotate WHO motility class + hyperactivation
  analyzedData = annotateMotility(analyzedData)

  // Statistics
  if (onProgress) onProgress({ step: 4, message: 'Computing statistics...' })
  const baseline = computeBaselineStats(analyzedData, CONFIG.ALL_CASA_PARAMS)
  const clusterProportions = computeClusterProportions(analyzedData)
  const motilitySummary = computeMotilitySummary(analyzedData)

  return {
    analyzedData,
    stats: {
      baseline,
      clusterProportions,
      motilitySummary,
      totalAnalyzed: analyzedData.length,
    },
  }
}
