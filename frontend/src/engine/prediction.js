export function classifyByProportions(sampleProportions, reference) {
  const classes = {}
  for (const ref of reference) {
    if (!classes[ref.label]) classes[ref.label] = []
    classes[ref.label].push(ref.proportions)
  }

  const centroids = {}
  for (const [label, propsList] of Object.entries(classes)) {
    const allKeys = new Set(propsList.flatMap(p => Object.keys(p)))
    centroids[label] = {}
    for (const k of allKeys) {
      centroids[label][k] = propsList.reduce((s, p) => s + (p[k] || 0), 0) / propsList.length
    }
  }

  const distances = {}
  for (const [label, centroid] of Object.entries(centroids)) {
    const allKeys = new Set([...Object.keys(centroid), ...Object.keys(sampleProportions)])
    let dist = 0
    for (const k of allKeys) {
      dist += ((sampleProportions[k] || 0) - (centroid[k] || 0)) ** 2
    }
    distances[label] = Math.sqrt(dist)
  }

  const labels = Object.keys(distances)
  const negDists = labels.map(l => -distances[l])
  const maxNeg = Math.max(...negDists)
  const exps = negDists.map(d => Math.exp(d - maxNeg))
  const sumExp = exps.reduce((a, b) => a + b, 0)
  const probs = exps.map(e => e / sumExp)

  const classProbabilities = {}
  labels.forEach((l, i) => { classProbabilities[l] = probs[i] })

  const bestIdx = probs.indexOf(Math.max(...probs))
  return {
    prediction: labels[bestIdx],
    probability: probs[bestIdx],
    classProbabilities,
  }
}

export function computeDensityScore(sampleEmbedding, referenceEmbedding, bins = 20) {
  const all = [...sampleEmbedding, ...referenceEmbedding]
  // reduce instead of Math.min(...spread): a large embedding can exceed the
  // argument-count limit and throw with a spread.
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity
  for (const [x, y] of all) {
    if (x < xMin) xMin = x
    if (x > xMax) xMax = x
    if (y < yMin) yMin = y
    if (y > yMax) yMax = y
  }
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  function toHist(points) {
    const hist = new Float64Array(bins * bins)
    for (const [x, y] of points) {
      const xi = Math.min(Math.floor((x - xMin) / xRange * bins), bins - 1)
      const yi = Math.min(Math.floor((y - yMin) / yRange * bins), bins - 1)
      hist[yi * bins + xi]++
    }
    const total = points.length
    const eps = 1e-10
    for (let i = 0; i < hist.length; i++) hist[i] = hist[i] / total + eps
    const sum = hist.reduce((a, b) => a + b, 0)
    for (let i = 0; i < hist.length; i++) hist[i] /= sum
    return hist
  }

  const P = toHist(sampleEmbedding)
  const Q = toHist(referenceEmbedding)

  const M = new Float64Array(P.length)
  for (let i = 0; i < P.length; i++) M[i] = (P[i] + Q[i]) / 2

  function kl(a, b) {
    let sum = 0
    for (let i = 0; i < a.length; i++) sum += a[i] * Math.log(a[i] / b[i])
    return sum
  }

  // JS divergence in nats is bounded to [0, ln 2]. Normalize by ln 2 so the
  // similarity score spans the full 0..100 range: identical distributions → 100,
  // fully disjoint → 0. (Without this, disjoint distributions floor at ~31.)
  const jsDivergence = (kl(P, M) + kl(Q, M)) / 2
  const normalized = jsDivergence / Math.LN2
  const similarityScore = Math.max(0, Math.min(100, (1 - normalized) * 100))

  return { similarityScore, jsDivergence }
}
