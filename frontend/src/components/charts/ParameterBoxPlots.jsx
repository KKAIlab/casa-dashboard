import { useMemo, useState } from 'react'
import Plot from './Plot'
import { TSNE_FEATURES, CLUSTER_COLORS, PARAM_INFO } from '../../utils/constants'

export default function ParameterBoxPlots({ data }) {
  const [groupBy, setGroupBy] = useState('cluster')

  const { traces, layout } = useMemo(() => {
    if (!data || !Object.keys(data).length) return { traces: [], layout: {} }

    const params = TSNE_FEATURES.filter(p => data[p])
    if (!params.length) return { traces: [], layout: {} }

    const firstParam = data[params[0]]
    const groupKey = groupBy === 'cluster' ? 'cluster' : 'mouse'
    const groups = [...new Set(firstParam[groupKey] || [])]

    const allTraces = []
    params.forEach((param, pi) => {
      groups.forEach((g, gi) => {
        const mask = (firstParam[groupKey] || [])
          .map((v, i) => v === g ? i : -1).filter(i => i >= 0)
        allTraces.push({
          y: mask.map(i => data[param].values[i]),
          type: 'box',
          name: groupBy === 'cluster' ? `C${g}` : `${g}`,
          marker: { color: CLUSTER_COLORS[gi % CLUSTER_COLORS.length] },
          xaxis: `x${pi + 1}`,
          yaxis: `y${pi + 1}`,
          legendgroup: `${g}`,
          showlegend: pi === 0,
        })
      })
    })

    const subplotLayout = {
      height: 500,
      margin: { t: 30, r: 20, b: 50, l: 50 },
      grid: { rows: 1, columns: params.length, pattern: 'independent' },
    }
    params.forEach((param, pi) => {
      const suffix = pi === 0 ? '' : `${pi + 1}`
      subplotLayout[`xaxis${suffix}`] = { title: param }
      subplotLayout[`yaxis${suffix}`] = { title: PARAM_INFO[param]?.unit || '' }
    })

    return { traces: allTraces, layout: subplotLayout }
  }, [data, groupBy])

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Parameter Distributions</h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-xs ${groupBy === 'cluster' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setGroupBy('cluster')}
          >By Cluster</button>
          <button
            className={`px-3 py-1 rounded text-xs ${groupBy === 'mouse' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setGroupBy('mouse')}
          >By Mouse</button>
        </div>
      </div>
      <Plot
        data={traces}
        layout={layout}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
