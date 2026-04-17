import { useMemo } from 'react'
import Plot from './Plot'

const WHO_COLORS = { PR: '#2ca02c', NP: '#ff7f0e', IM: '#d62728' }

export default function MotilityBreakdown({ summary }) {
  const traces = useMemo(() => {
    if (!summary || Object.keys(summary).length === 0) return []
    const mice = Object.keys(summary)
    return ['PR', 'NP', 'IM'].map(cat => ({
      x: mice,
      y: mice.map(m => summary[m][`${cat}_pct`] || 0),
      name: cat,
      type: 'bar',
      marker: { color: WHO_COLORS[cat] },
    }))
  }, [summary])

  if (!summary || Object.keys(summary).length === 0) return null

  const totals = Object.values(summary)
  const avgHyper = totals.reduce((s, m) => s + (m.hyperactivated_pct || 0), 0) / totals.length

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="font-semibold text-sm">WHO Motility Classification</h3>
          <p className="text-xs text-gray-400 mt-0.5">PR = progressive · NP = non-progressive · IM = immotile</p>
        </div>
        <div className="text-xs text-gray-600 bg-purple-50 border border-purple-200 rounded px-2 py-1">
          Hyperactivated (avg): <span className="font-bold text-purple-700">{avgHyper.toFixed(1)}%</span>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          barmode: 'stack',
          xaxis: { title: 'Mouse' },
          yaxis: { title: 'Proportion (%)', range: [0, 100] },
          margin: { t: 20, r: 20, b: 50, l: 50 },
          height: 320,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
