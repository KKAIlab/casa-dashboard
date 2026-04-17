import Papa from 'papaparse'

export function rowsToCSV(rows) {
  if (!rows || rows.length === 0) return ''
  return Papa.unparse(rows)
}

// Trigger browser download of a string as a file.
export function downloadText(text, filename, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Flatten baseline stats {mouse: {n, VCL_mean, VCL_std, ...}} into rows.
export function baselineStatsToRows(baseline) {
  return Object.entries(baseline || {}).map(([mouse, entry]) => ({ Mouse: mouse, ...entry }))
}

export function motilitySummaryToRows(summary) {
  return Object.entries(summary || {}).map(([mouse, s]) => ({ Mouse: mouse, ...s }))
}

export function clusterPropsToRows(clusterProps) {
  return Object.entries(clusterProps || {}).map(([mouse, props]) => ({ Mouse: mouse, ...props }))
}

export function comparisonToRows(comparison, groupA, groupB) {
  return Object.entries(comparison || {}).map(([param, c]) => ({
    Parameter: param,
    [`${groupA}_mean`]: c.meanA,
    [`${groupA}_n`]: c.nA,
    [`${groupB}_mean`]: c.meanB,
    [`${groupB}_n`]: c.nB,
    t_statistic: c.tStat,
    df: c.df,
    p_value: c.pValue,
    significant: c.pValue < 0.05 ? 'yes' : 'no',
  }))
}
