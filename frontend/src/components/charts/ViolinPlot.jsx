import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import { TSNE_FEATURES } from '../../utils/constants'

export default function ViolinPlot({ data }) {
  const traces = useMemo(() => {
    if (!data || !Object.keys(data).length) return []
    return TSNE_FEATURES.filter(p => data[p]).map(param => ({
      type: 'violin', y: data[param].values, name: param,
      box: { visible: true }, meanline: { visible: true },
    }))
  }, [data])

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-sm mb-2">Parameter Distributions (Violin)</h3>
      <Plot
        data={traces}
        layout={{ margin: { t: 20, r: 20, b: 50, l: 50 }, height: 400, showlegend: false }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
