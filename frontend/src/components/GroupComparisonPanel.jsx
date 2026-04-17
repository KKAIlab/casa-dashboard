import { useState, useMemo } from 'react'
import { compareGroups } from '../engine/statistics'
import { downloadText, rowsToCSV, comparisonToRows } from '../engine/exporter'

const PARAMS = ['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF']

function pColor(p) {
  if (p == null || isNaN(p)) return 'text-gray-400'
  if (p < 0.001) return 'text-red-700 font-bold'
  if (p < 0.01) return 'text-red-600 font-semibold'
  if (p < 0.05) return 'text-orange-600 font-semibold'
  return 'text-gray-600'
}

function fmtP(p) {
  if (p == null || isNaN(p)) return '-'
  if (p < 0.001) return p.toExponential(1)
  return p.toFixed(3)
}

function fmt(v) {
  if (v == null || isNaN(v)) return '-'
  return Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)
}

export default function GroupComparisonPanel({ rows, defaultParams = PARAMS }) {
  const groups = useMemo(() => {
    const set = new Set(rows.map(r => r.Group).filter(Boolean))
    return [...set]
  }, [rows])

  const [groupA, setGroupA] = useState(groups[0] || '')
  const [groupB, setGroupB] = useState(groups[1] || '')

  const result = useMemo(() => {
    if (!groupA || !groupB || groupA === groupB) return null
    return compareGroups(rows, groupA, groupB, defaultParams)
  }, [rows, groupA, groupB, defaultParams])

  const handleExport = () => {
    if (!result) return
    const csv = rowsToCSV(comparisonToRows(result, groupA, groupB))
    downloadText(csv, `comparison_${groupA}_vs_${groupB}.csv`)
  }

  if (groups.length < 2) {
    return (
      <div className="bg-white rounded-xl border p-4 text-sm text-gray-400">
        <h3 className="font-semibold text-gray-700 text-sm mb-1">Group Comparison (Welch's t-test)</h3>
        <p>Need at least 2 distinct Group values across analyzed datasets.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Group Comparison (Welch's t-test)</h3>
        <div className="flex gap-2 items-center">
          <select className="border rounded px-2 py-1 text-sm" value={groupA} onChange={e => setGroupA(e.target.value)}>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <span className="text-gray-400 text-sm">vs</span>
          <select className="border rounded px-2 py-1 text-sm" value={groupB} onChange={e => setGroupB(e.target.value)}>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50" disabled={!result} onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>
      {!result ? (
        <p className="text-xs text-gray-400">Pick two different groups to compare.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-gray-500 text-left">
                <th className="py-2 px-2">Param</th>
                <th className="py-2 px-2">{groupA} (n={result[defaultParams[0]]?.nA ?? 0})</th>
                <th className="py-2 px-2">{groupB} (n={result[defaultParams[0]]?.nB ?? 0})</th>
                <th className="py-2 px-2">t</th>
                <th className="py-2 px-2">p-value</th>
              </tr>
            </thead>
            <tbody>
              {defaultParams.map(p => {
                const r = result[p] || {}
                return (
                  <tr key={p} className="border-b hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-medium">{p}</td>
                    <td className="py-1.5 px-2 font-mono">{fmt(r.meanA)}</td>
                    <td className="py-1.5 px-2 font-mono">{fmt(r.meanB)}</td>
                    <td className="py-1.5 px-2 font-mono text-gray-600">{fmt(r.tStat)}</td>
                    <td className={`py-1.5 px-2 font-mono ${pColor(r.pValue)}`}>{fmtP(r.pValue)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">
            Bold red: p &lt; 0.001 · red: p &lt; 0.01 · orange: p &lt; 0.05. Cell-level test, not pseudoreplication-corrected.
          </p>
        </div>
      )}
    </div>
  )
}
