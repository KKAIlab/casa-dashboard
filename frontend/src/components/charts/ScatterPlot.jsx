import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { CASA_PARAMS } from '../../utils/constants'

export default function ScatterPlot({ data }) {
  const [xParam, setXParam] = useState('VCL')
  const [yParam, setYParam] = useState('BCF')

  const traces = useMemo(() => {
    if (!data?.[xParam] && !data?.VCL) return []
    const x = data[xParam] || data.VCL || []
    const y = data[yParam] || data.BCF || []
    const groups = data.Mouse || data.Group || []
    const uniqueGroups = [...new Set(groups)]
    return uniqueGroups.map(g => {
      const mask = groups.map((v, i) => v === g ? i : -1).filter(i => i >= 0)
      return {
        x: mask.map(i => x[i]), y: mask.map(i => y[i]),
        mode: 'markers', type: 'scattergl', name: g,
        marker: { size: 4, opacity: 0.5 },
      }
    })
  }, [data, xParam, yParam])

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Scatter Plot</h3>
        <div className="flex gap-2 text-xs">
          <select value={xParam} onChange={e => setXParam(e.target.value)} className="border rounded px-2 py-1">
            {CASA_PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className="self-center">vs</span>
          <select value={yParam} onChange={e => setYParam(e.target.value)} className="border rounded px-2 py-1">
            {CASA_PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          xaxis: { title: xParam }, yaxis: { title: yParam },
          margin: { t: 20, r: 20, b: 50, l: 50 }, height: 400,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
