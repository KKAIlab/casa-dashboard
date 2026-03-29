import { useMemo, useState } from 'react'
import Plot from './Plot'
import { CLUSTER_COLORS } from '../../utils/constants'

export default function ClusterProportions({ data }) {
  const [stacked, setStacked] = useState(false)

  const traces = useMemo(() => {
    if (!data?.length) return []
    const clusterCols = Object.keys(data[0]).filter(k => k !== 'Mouse')
    const mice = data.map(d => d.Mouse)
    return clusterCols.map((col, idx) => ({
      x: mice,
      y: data.map(d => d[col]),
      name: `Cluster ${col}`,
      type: 'bar',
      marker: { color: CLUSTER_COLORS[idx] || '#999' },
    }))
  }, [data])

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Cluster Proportions</h3>
        <button
          className="px-3 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200"
          onClick={() => setStacked(s => !s)}
        >{stacked ? 'Grouped' : 'Stacked'}</button>
      </div>
      <Plot
        data={traces}
        layout={{
          barmode: stacked ? 'stack' : 'group',
          xaxis: { title: 'Mouse' },
          yaxis: { title: 'Proportion (%)' },
          margin: { t: 20, r: 20, b: 50, l: 50 },
          height: 400,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
