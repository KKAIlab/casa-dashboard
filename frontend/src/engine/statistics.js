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
  const meanA = jStat.mean(a), meanB = jStat.mean(b)
  const varA = jStat.variance(a, true), varB = jStat.variance(b, true)
  const seA = varA / nA, seB = varB / nB
  const tStat = (meanA - meanB) / Math.sqrt(seA + seB)
  const df = (seA + seB) ** 2 / (seA ** 2 / (nA - 1) + seB ** 2 / (nB - 1))
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tStat), df))
  return { tStat, pValue, df }
}
