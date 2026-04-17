import { useMemo } from 'react'
import Plot from './Plot'

// Generic heatmap. Two modes:
//   - clusterProps mode: pass `clusterProps` ({mouse: {clusterId: pct}}) -> mice on x, cluster IDs on y.
//   - parameter mode: pass `data` (array of {group, [param]: value}) -> groups on x, params on y.
export default function Heatmap({ clusterProps, data, params, title }) {
  const plotData = useMemo(() => {
    if (clusterProps) {
      const mice = Object.keys(clusterProps)
      if (mice.length === 0) return []
      const allClusters = new Set()
      mice.forEach(m => Object.keys(clusterProps[m]).forEach(c => allClusters.add(c)))
      const clusters = [...allClusters].sort((a, b) => Number(a) - Number(b))
      const z = clusters.map(c => mice.map(m => clusterProps[m][c] || 0))
      return [{
        z, x: mice, y: clusters.map(c => `Cluster ${c}`),
        type: 'heatmap', colorscale: 'YlOrRd',
        hovertemplate: '%{x}<br>%{y}<br>%{z:.1f}%<extra></extra>',
        colorbar: { title: '%' },
      }]
    }
    if (data?.length && params?.length) {
      const groups = data.map(d => d.group || d.Mouse)
      const values = params.map(p => data.map(d => d[p] || 0))
      return [{
        z: values, x: groups, y: params,
        type: 'heatmap', colorscale: 'RdBu', reversescale: true,
      }]
    }
    return []
  }, [clusterProps, data, params])

  if (plotData.length === 0) return null

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-sm mb-2">{title || 'Heatmap'}</h3>
      <Plot
        data={plotData}
        layout={{ margin: { t: 20, r: 80, b: 60, l: 80 }, height: 320 }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
