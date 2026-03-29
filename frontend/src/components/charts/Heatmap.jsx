import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import { TSNE_FEATURES } from '../../utils/constants'

export default function Heatmap({ data }) {
  const plotData = useMemo(() => {
    if (!data?.length) return []
    const groups = data.map(d => d.group)
    const values = TSNE_FEATURES.map(param => data.map(d => d[param] || 0))
    return [{
      z: values, x: groups, y: TSNE_FEATURES,
      type: 'heatmap', colorscale: 'RdBu', reversescale: true,
    }]
  }, [data])

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-sm mb-2">Parameter Heatmap</h3>
      <Plot
        data={plotData}
        layout={{ margin: { t: 20, r: 80, b: 50, l: 80 }, height: 350 }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
