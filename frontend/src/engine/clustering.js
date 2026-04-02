function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function standardize(data) {
  const n = data.length
  const d = data[0].length
  const means = new Array(d).fill(0)
  const stds = new Array(d).fill(0)

  for (let j = 0; j < d; j++) {
    for (let i = 0; i < n; i++) means[j] += data[i][j]
    means[j] /= n
    for (let i = 0; i < n; i++) stds[j] += (data[i][j] - means[j]) ** 2
    stds[j] = Math.sqrt(stds[j] / n) || 1
  }

  return data.map(row => row.map((v, j) => (v - means[j]) / stds[j]))
}

export function kmeans(data, k, seed = 42, nInit = 10, maxIter = 100) {
  const n = data.length
  const d = data[0].length
  k = Math.min(k, n)

  const rng = mulberry32(seed)

  function dist(a, b) {
    let s = 0
    for (let j = 0; j < d; j++) s += (a[j] - b[j]) ** 2
    return s
  }

  function runOnce() {
    const indices = []
    const used = new Set()
    while (indices.length < k) {
      const idx = Math.floor(rng() * n)
      if (!used.has(idx)) { used.add(idx); indices.push(idx) }
    }
    const centroids = indices.map(i => [...data[i]])
    const labels = new Array(n).fill(0)

    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false
      for (let i = 0; i < n; i++) {
        let bestC = 0, bestD = Infinity
        for (let c = 0; c < k; c++) {
          const dd = dist(data[i], centroids[c])
          if (dd < bestD) { bestD = dd; bestC = c }
        }
        if (labels[i] !== bestC) { labels[i] = bestC; changed = true }
      }
      if (!changed) break

      const sums = Array.from({ length: k }, () => new Array(d).fill(0))
      const counts = new Array(k).fill(0)
      for (let i = 0; i < n; i++) {
        counts[labels[i]]++
        for (let j = 0; j < d; j++) sums[labels[i]][j] += data[i][j]
      }
      for (let c = 0; c < k; c++) {
        if (counts[c] === 0) continue
        for (let j = 0; j < d; j++) centroids[c][j] = sums[c][j] / counts[c]
      }
    }

    let inertia = 0
    for (let i = 0; i < n; i++) inertia += dist(data[i], centroids[labels[i]])
    return { labels, inertia }
  }

  let best = null
  for (let init = 0; init < nInit; init++) {
    const result = runOnce()
    if (!best || result.inertia < best.inertia) best = result
  }

  return best.labels
}
