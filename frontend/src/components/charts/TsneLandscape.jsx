import { useMemo, useState } from 'react'
import Plot from './Plot'
import { CLUSTER_COLORS } from '../../utils/constants'

export default function TsneLandscape({ data }) {
  const [colorBy, setColorBy] = useState('cluster')

  const traces = useMemo(() => {
    if (!data?.tSNE1?.length) return []

    if (colorBy === 'cluster') {
      const clusters = [...new Set(data.Cluster)]
      return clusters.map(c => {
        const mask = data.Cluster.map((v, i) => v === c ? i : -1).filter(i => i >= 0)
        return {
          x: mask.map(i => data.tSNE1[i]),
          y: mask.map(i => data.tSNE2[i]),
          mode: 'markers',
          type: 'scattergl',
          name: `Cluster ${c}`,
          marker: { size: 4, color: CLUSTER_COLORS[c] || '#999', opacity: 0.6 },
        }
      })
    } else {
      const mice = [...new Set(data.Mouse)]
      const mouseColors = ['#4DBBD5', '#E64B35', '#00A087', '#3C5488', '#F39B7F']
      return mice.map((m, idx) => {
        const mask = data.Mouse.map((v, i) => v === m ? i : -1).filter(i => i >= 0)
        return {
          x: mask.map(i => data.tSNE1[i]),
          y: mask.map(i => data.tSNE2[i]),
          mode: 'markers',
          type: 'scattergl',
          name: `${m} (n=${mask.length})`,
          marker: { size: 4, color: mouseColors[idx] || '#999', opacity: 0.6 },
        }
      })
    }
  }, [data, colorBy])

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">t-SNE Landscape</h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-xs ${colorBy === 'cluster' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setColorBy('cluster')}
          >Cluster</button>
          <button
            className={`px-3 py-1 rounded text-xs ${colorBy === 'mouse' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setColorBy('mouse')}
          >Individual</button>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          xaxis: { title: 't-SNE 1' },
          yaxis: { title: 't-SNE 2' },
          margin: { t: 20, r: 20, b: 50, l: 50 },
          legend: { x: 1, xanchor: 'right', y: 1 },
          height: 500,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
