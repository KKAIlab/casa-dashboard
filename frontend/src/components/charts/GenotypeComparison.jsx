import { useMemo } from 'react'
import Plot from 'react-plotly.js'

export default function GenotypeComparison({ data }) {
  const traces = useMemo(() => {
    if (!data?.tSNE1?.length) return []
    const groups = [...new Set(data.dataset_name || data.Group || [])]
    return groups.map(g => {
      const source = data.dataset_name || data.Group || []
      const mask = source.map((v, i) => v === g ? i : -1).filter(i => i >= 0)
      return {
        x: mask.map(i => data.tSNE1[i]), y: mask.map(i => data.tSNE2[i]),
        mode: 'markers', type: 'scattergl', name: g,
        marker: { size: 4, opacity: 0.5 },
      }
    })
  }, [data])

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-sm mb-2">Cross-Genotype Comparison</h3>
      <Plot
        data={traces}
        layout={{
          xaxis: { title: 't-SNE 1' }, yaxis: { title: 't-SNE 2' },
          margin: { t: 20, r: 20, b: 50, l: 50 }, height: 500,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
