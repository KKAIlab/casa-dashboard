import { runTsne } from './tsne.js'

// Train a linear "fertility axis" from labeled human reference rows.
//
// rows:   array of cell-level dicts with feature columns and a `Group` field.
// params: feature names to use (e.g. ['VCL','VSL','LIN','ALH','BCF']).
// posLabel / negLabel: Group values that define the two classes
//                     (positive = "fertile" pole, negative = "subfertile" pole).
//
// Approach: per-feature z-score → class centroids → unit difference vector
// (Fisher's discriminant assuming spherical within-class covariance). The
// signed projection of any new cell onto this vector becomes its
// "human-fertility-likeness" score; sigmoid gives a 0..1 probability.
//
// Returns: { params, mean, std, weights, midpoint, accuracy, distances }
//   weights:  unit vector in feature space (length = params.length)
//   mean/std: per-feature standardization stats
//   midpoint: scalar offset such that score(x)=dot(z,weights)-midpoint
//             is 0 at the midpoint between the two centroids
//   accuracy: train-set classification accuracy (sanity check)
//   distances: { posMean, negMean, separation } in standardized space
export function trainFertilityAxis(rows, params, posLabel, negLabel) {
  const pos = rows.filter(r => r.Group === posLabel)
  const neg = rows.filter(r => r.Group === negLabel)
  if (pos.length < 2 || neg.length < 2) {
    throw new Error(`Need at least 2 cells per class. Got ${pos.length} ${posLabel}, ${neg.length} ${negLabel}.`)
  }

  const all = [...pos, ...neg]
  const d = params.length
  const n = all.length

  // Per-feature mean and std (population) for standardization.
  const mean = new Array(d).fill(0)
  const std = new Array(d).fill(0)
  for (let j = 0; j < d; j++) {
    let s = 0
    for (let i = 0; i < n; i++) s += Number(all[i][params[j]]) || 0
    mean[j] = s / n
    let v = 0
    for (let i = 0; i < n; i++) {
      const x = (Number(all[i][params[j]]) || 0) - mean[j]
      v += x * x
    }
    std[j] = Math.sqrt(v / n) || 1
  }

  const standardize = (row) => params.map((p, j) => ((Number(row[p]) || 0) - mean[j]) / std[j])

  // Class centroids in standardized space.
  const cPos = new Array(d).fill(0)
  const cNeg = new Array(d).fill(0)
  for (const r of pos) { const z = standardize(r); for (let j = 0; j < d; j++) cPos[j] += z[j] }
  for (const r of neg) { const z = standardize(r); for (let j = 0; j < d; j++) cNeg[j] += z[j] }
  for (let j = 0; j < d; j++) { cPos[j] /= pos.length; cNeg[j] /= neg.length }

  // Difference vector → unit weights.
  const diff = cPos.map((v, j) => v - cNeg[j])
  const norm = Math.sqrt(diff.reduce((s, v) => s + v * v, 0)) || 1
  const weights = diff.map(v => v / norm)

  // Midpoint along the axis: project both centroids and average.
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
  const projPos = dot(cPos, weights)
  const projNeg = dot(cNeg, weights)
  const midpoint = (projPos + projNeg) / 2

  // Train accuracy (axis points from neg → pos, so score > 0 ↔ pos).
  let correct = 0
  for (const r of pos) if (dot(standardize(r), weights) - midpoint > 0) correct++
  for (const r of neg) if (dot(standardize(r), weights) - midpoint <= 0) correct++
  const accuracy = correct / n

  return {
    params, mean, std, weights, midpoint, accuracy,
    distances: { posMean: projPos - midpoint, negMean: projNeg - midpoint, separation: projPos - projNeg },
  }
}

// Project rows onto a trained fertility axis.
// Returns array of { score, prob } in the same order.
//   score: signed distance along the axis (positive = closer to fertile pole)
//   prob:  logistic-squashed probability of the positive class
export function projectOnAxis(rows, axis, steepness = 1) {
  const { params, mean, std, weights, midpoint } = axis
  const d = params.length
  return rows.map(r => {
    let s = 0
    for (let j = 0; j < d; j++) {
      const z = ((Number(r[params[j]]) || 0) - mean[j]) / std[j]
      s += z * weights[j]
    }
    const score = s - midpoint
    const prob = 1 / (1 + Math.exp(-steepness * score))
    return { score, prob }
  })
}

// Per-mouse aggregation of axis scores.
// rows + scores must be the same length (one score per row).
// Returns: { [mouseId]: { n, meanScore, sdScore, meanProb, fracPos, group } }
export function summarizeScoresByMouse(rows, scores) {
  const groups = {}
  for (let i = 0; i < rows.length; i++) {
    const m = rows[i].Mouse || 'unknown'
    if (!groups[m]) groups[m] = { scores: [], probs: [], group: rows[i].Group }
    groups[m].scores.push(scores[i].score)
    groups[m].probs.push(scores[i].prob)
  }
  const out = {}
  for (const [m, g] of Object.entries(groups)) {
    const n = g.scores.length
    const meanScore = g.scores.reduce((s, v) => s + v, 0) / n
    const variance = n > 1 ? g.scores.reduce((s, v) => s + (v - meanScore) ** 2, 0) / (n - 1) : 0
    const meanProb = g.probs.reduce((s, v) => s + v, 0) / n
    const fracPos = g.scores.filter(s => s > 0).length / n
    out[m] = { n, meanScore, sdScore: Math.sqrt(variance), meanProb, fracPos, group: g.group }
  }
  return out
}

// Co-embed cells from multiple sources into a single t-SNE space.
//
// sources: array of { rows, label } where label is e.g. "human-fertile",
//          "mouse-WT", "mouse-Omega6KO".
// params:  feature names to use.
// opts.standardizePerSource: if true, z-score each source independently before
//          embedding. Recommended when species absolute scales differ
//          (mouse VCL ~200 vs human VCL ~90 µm/s).
//
// Returns: { embedding, labels, sources, indices }
//   embedding: (n × 2) t-SNE coordinates over the union
//   labels:    parallel array of source labels for coloring
//   sources:   the input source labels (for legend ordering)
//   indices:   per-source [start, end) ranges into the embedding
export function coEmbed(sources, params, opts = {}) {
  const standardizePerSource = opts.standardizePerSource !== false
  const allFeatures = []
  const labels = []
  const indices = {}

  for (const { rows, label } of sources) {
    const start = allFeatures.length
    let mat = rows.map(r => params.map(p => Number(r[p]) || 0))

    if (standardizePerSource && mat.length > 1) {
      const d = params.length
      const mean = new Array(d).fill(0), std = new Array(d).fill(0)
      for (let j = 0; j < d; j++) {
        for (let i = 0; i < mat.length; i++) mean[j] += mat[i][j]
        mean[j] /= mat.length
        for (let i = 0; i < mat.length; i++) std[j] += (mat[i][j] - mean[j]) ** 2
        std[j] = Math.sqrt(std[j] / mat.length) || 1
      }
      mat = mat.map(row => row.map((v, j) => (v - mean[j]) / std[j]))
    }

    for (const row of mat) { allFeatures.push(row); labels.push(label) }
    indices[label] = [start, allFeatures.length]
  }

  if (allFeatures.length < 5) {
    throw new Error('coEmbed: need at least 5 cells across all sources')
  }

  const embedding = runTsne(allFeatures)
  return { embedding, labels, sources: sources.map(s => s.label), indices }
}
