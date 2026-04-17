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

// Compare two groups across multiple parameters with Welch's t-test.
// rows: array with .Group and parameter columns. groupA/groupB: group label strings.
// Returns: { [param]: { meanA, meanB, nA, nB, tStat, pValue, df } }
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
  return result
}
