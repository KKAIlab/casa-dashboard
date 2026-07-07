import jStat from 'jstat'

export function computeBaselineStats(data, params) {
  const groups = {}
  for (const row of data) {
    const m = row.Mouse
    if (!groups[m]) groups[m] = []
    groups[m].push(row)
  }

  const result = {}
  for (const [mouse, rows] of Object.entries(groups)) {
    const entry = { n: rows.length }
    for (const param of params) {
      const values = rows.map(r => r[param]).filter(v => v != null)
      if (values.length > 0) {
        entry[`${param}_mean`] = jStat.mean(values)
        entry[`${param}_std`] = values.length > 1 ? jStat.stdev(values, true) : 0
      }
    }
    result[mouse] = entry
  }
  return result
}

export function computeClusterProportions(data) {
  const groups = {}
  for (const row of data) {
    const m = row.Mouse
    if (!groups[m]) groups[m] = {}
    groups[m][row.Cluster] = (groups[m][row.Cluster] || 0) + 1
  }

  const result = {}
  for (const [mouse, counts] of Object.entries(groups)) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    result[mouse] = {}
    for (const [cluster, count] of Object.entries(counts)) {
      result[mouse][cluster] = (count / total) * 100
    }
  }
  return result
}

export function welchTTest(a, b) {
  const nA = a.length, nB = b.length
  if (nA < 2 || nB < 2) return { tStat: NaN, pValue: NaN, df: NaN }
  const meanA = jStat.mean(a), meanB = jStat.mean(b)
  const varA = jStat.variance(a, true), varB = jStat.variance(b, true)
  const seA = varA / nA, seB = varB / nB
  const denom = Math.sqrt(seA + seB)
  if (denom === 0) return { tStat: 0, pValue: 1, df: nA + nB - 2 }
  const tStat = (meanA - meanB) / denom
  const df = (seA + seB) ** 2 / (seA ** 2 / (nA - 1) + seB ** 2 / (nB - 1))
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tStat), df))
  return { tStat, pValue, df }
}

// Benjamini-Hochberg FDR adjustment for a set of p-values.
// Returns adjusted p-values (q-values) in the same order as the input.
// NaN p-values are passed through unchanged and excluded from the ranking.
export function adjustPValuesBH(pValues) {
  const indexed = pValues
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p != null && !Number.isNaN(p))
  const m = indexed.length
  const adjusted = pValues.map(p => (p == null || Number.isNaN(p) ? NaN : p))
  if (m === 0) return adjusted

  indexed.sort((x, y) => x.p - y.p)
  // Walk from largest to smallest p, enforcing monotonicity of the q-values.
  let prev = Infinity
  for (let rank = m - 1; rank >= 0; rank--) {
    const { p, i } = indexed[rank]
    const q = Math.min(prev, (p * m) / (rank + 1))
    adjusted[i] = Math.min(1, q)
    prev = adjusted[i]
  }
  return adjusted
}

// Compare two groups across multiple parameters with Welch's t-test.
// rows: array with .Group and parameter columns. groupA/groupB: group label strings.
// Because several parameters are tested at once, each result also carries a
// Benjamini-Hochberg FDR-adjusted p-value (pAdjusted) computed across `params`.
// Returns: { [param]: { meanA, meanB, nA, nB, tStat, pValue, df, pAdjusted } }
export function compareGroups(rows, groupA, groupB, params) {
  const result = {}
  const aRows = rows.filter(r => (r.Group ?? r.genotype) === groupA)
  const bRows = rows.filter(r => (r.Group ?? r.genotype) === groupB)
  for (const p of params) {
    const a = aRows.map(r => r[p]).filter(v => v != null && !isNaN(v))
    const b = bRows.map(r => r[p]).filter(v => v != null && !isNaN(v))
    const t = welchTTest(a, b)
    result[p] = {
      meanA: a.length ? jStat.mean(a) : NaN,
      meanB: b.length ? jStat.mean(b) : NaN,
      nA: a.length, nB: b.length,
      ...t,
    }
  }
  const adjusted = adjustPValuesBH(params.map(p => result[p].pValue))
  params.forEach((p, i) => { result[p].pAdjusted = adjusted[i] })
  return result
}
