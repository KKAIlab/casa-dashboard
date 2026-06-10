import { useEffect, useMemo, useState } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { welchTTest } from '../engine/statistics'
import { rowsToCSV, downloadText } from '../engine/exporter'
import Plot from '../components/charts/Plot'

const DEFAULT_PARAMS = ['VCL', 'VSL', 'LIN', 'ALH', 'BCF']
const ALL_PARAMS = ['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF']

function fmt(v, dp = 2) {
  if (v == null || Number.isNaN(v)) return '-'
  return Number(v).toFixed(dp)
}

function fmtP(p) {
  if (p == null || Number.isNaN(p)) return '-'
  if (p < 0.001) return p.toExponential(1)
  return p.toFixed(3)
}

export default function CrossSpecies() {
  const db = useDB()
  const engine = useEngine()
  const [datasets, setDatasets] = useState([])
  const [posIds, setPosIds] = useState([])
  const [negIds, setNegIds] = useState([])
  const [mouseIds, setMouseIds] = useState([])
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [axis, setAxis] = useState(null)
  const [training, setTraining] = useState(false)
  const [projection, setProjection] = useState(null)
  const [projecting, setProjecting] = useState(false)
  const [coEmbed, setCoEmbed] = useState(null)
  const [embedding, setEmbedding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    db.getDatasets().then(setDatasets).catch(() => {})
  }, [db])

  const handleTrain = async () => {
    setError(''); setAxis(null); setProjection(null)
    if (posIds.length === 0 || negIds.length === 0) { setError('Pick at least one dataset for each pole.'); return }
    setTraining(true)
    try {
      const { axis: a, posCount, negCount } = await engine.trainAxis(posIds, negIds, params)
      setAxis({ ...a, posCount, negCount })
    } catch (err) { setError(err.message) }
    setTraining(false)
  }

  const handleProject = async () => {
    setError('')
    if (!axis) { setError('Train an axis first.'); return }
    if (mouseIds.length === 0) { setError('Pick at least one mouse dataset to project.'); return }
    setProjecting(true)
    try {
      const result = await engine.projectDatasets(mouseIds, axis)
      // Also project the human reference (for distribution overlay).
      const ref = await engine.projectDatasets([...posIds, ...negIds], axis)
      setProjection({ ...result, ref })
    } catch (err) { setError(err.message) }
    setProjecting(false)
  }

  const handleCoEmbed = async () => {
    setError('')
    if (posIds.length === 0 || negIds.length === 0 || mouseIds.length === 0) {
      setError('Need fertile + subfertile + at least one mouse dataset for co-embedding.'); return
    }
    setEmbedding(true)
    try {
      const r = await engine.runCoEmbed([
        { datasetIds: posIds, label: 'human-fertile' },
        { datasetIds: negIds, label: 'human-subfertile' },
        ...mouseIds.map(id => {
          const ds = datasets.find(d => d.id === id)
          return { datasetIds: [id], label: `mouse-${ds?.group || ds?.genotype || ds?.name || id}` }
        }),
      ], params, { standardizePerSource: true })
      setCoEmbed(r)
    } catch (err) { setError(err.message) }
    setEmbedding(false)
  }

  // --- Plots ---------------------------------------------------------------

  const weightTraces = useMemo(() => {
    if (!axis) return []
    return [{
      x: axis.params, y: axis.weights, type: 'bar',
      marker: { color: axis.weights.map(w => w >= 0 ? '#2ca02c' : '#d62728') },
    }]
  }, [axis])

  const distributionTraces = useMemo(() => {
    if (!projection) return []
    const traces = []
    // Human reference distributions for context.
    const refRows = projection.ref.rows
    const refScores = projection.ref.scores
    const fertScores = refScores.filter((_, i) => refRows[i]._datasetId && posIds.includes(refRows[i]._datasetId)).map(s => s.score)
    const subfScores = refScores.filter((_, i) => refRows[i]._datasetId && negIds.includes(refRows[i]._datasetId)).map(s => s.score)
    if (fertScores.length) traces.push({ x: fertScores, type: 'histogram', name: 'human-fertile', opacity: 0.5, marker: { color: '#2ca02c' }, histnorm: 'probability density', nbinsx: 30 })
    if (subfScores.length) traces.push({ x: subfScores, type: 'histogram', name: 'human-subfertile', opacity: 0.5, marker: { color: '#d62728' }, histnorm: 'probability density', nbinsx: 30 })

    // Per-mouse-dataset histograms (one trace per dataset).
    const byDataset = {}
    for (let i = 0; i < projection.rows.length; i++) {
      const id = projection.rows[i]._datasetId
      const name = projection.rows[i]._datasetName
      const key = `${name}#${id}`
      if (!byDataset[key]) byDataset[key] = { name, scores: [] }
      byDataset[key].scores.push(projection.scores[i].score)
    }
    const palette = ['#1f77b4', '#ff7f0e', '#9467bd', '#8c564b', '#17becf', '#bcbd22']
    let idx = 0
    for (const { name, scores } of Object.values(byDataset)) {
      traces.push({ x: scores, type: 'histogram', name, opacity: 0.55, marker: { color: palette[idx++ % palette.length] }, histnorm: 'probability density', nbinsx: 30 })
    }
    return traces
  }, [projection, posIds, negIds])

  // Welch's t-test on per-mouse mean scores between two mouse Groups.
  const mouseGroupTest = useMemo(() => {
    if (!projection) return null
    const summary = projection.summary
    const byGroup = {}
    for (const s of Object.values(summary)) {
      const g = s.group || 'unknown'
      if (!byGroup[g]) byGroup[g] = []
      byGroup[g].push(s.meanScore)
    }
    const groups = Object.keys(byGroup)
    if (groups.length < 2) return { groups, byGroup, test: null }
    // Take first two groups; user can pick if more.
    const [a, b] = groups
    if (byGroup[a].length < 2 || byGroup[b].length < 2) return { groups, byGroup, test: null }
    const test = welchTTest(byGroup[a], byGroup[b])
    return { groups: [a, b], byGroup, test }
  }, [projection])

  const coEmbedTraces = useMemo(() => {
    if (!coEmbed) return []
    const palette = {
      'human-fertile': '#2ca02c',
      'human-subfertile': '#d62728',
    }
    const fallback = ['#1f77b4', '#ff7f0e', '#9467bd', '#8c564b', '#17becf', '#bcbd22']
    const traces = []
    let idx = 0
    for (const label of coEmbed.sources) {
      const [start, end] = coEmbed.indices[label] || [0, 0]
      traces.push({
        x: coEmbed.embedding.slice(start, end).map(p => p[0]),
        y: coEmbed.embedding.slice(start, end).map(p => p[1]),
        mode: 'markers', type: 'scattergl', name: label,
        marker: { size: 4, opacity: 0.55, color: palette[label] || fallback[idx++ % fallback.length] },
      })
    }
    return traces
  }, [coEmbed])

  const exportSummary = () => {
    if (!projection) return
    const rows = Object.entries(projection.summary).map(([m, s]) => ({
      Mouse: m, Group: s.group, n: s.n,
      mean_score: s.meanScore, sd_score: s.sdScore,
      mean_prob_fertile: s.meanProb, frac_above_midpoint: s.fracPos,
    }))
    downloadText(rowsToCSV(rows), 'cross_species_scores.csv')
  }

  const renderMultiSelect = (value, onChange, options) => (
    <select multiple value={value} onChange={e => onChange([...e.target.selectedOptions].map(o => Number(o.value)))}
      className="border rounded-lg px-3 py-2 text-sm h-32 w-full">
      {options.map(ds => <option key={ds.id} value={ds.id}>{ds.name} {ds.group ? `(${ds.group})` : ''}</option>)}
    </select>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Cross-Species Bridging</h2>
        <p className="text-sm text-gray-500 mt-1">
          Train a human fertility axis from labelled human reference data, then project mouse cells onto it
          to ask: <em>does the KO mouse motility pattern look more like human fertile or subfertile?</em>
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* --- Train axis --- */}
      <div className="bg-white rounded-xl border p-4 space-y-4">
        <h3 className="font-semibold text-sm">1. Train fertility axis (human reference)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Positive pole (e.g. fertile)</label>
            {renderMultiSelect(posIds, setPosIds, datasets)}
          </div>
          <div>
            <label className="text-xs text-gray-500">Negative pole (e.g. subfertile)</label>
            {renderMultiSelect(negIds, setNegIds, datasets)}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Features</label>
          <div className="flex flex-wrap gap-2">
            {ALL_PARAMS.map(p => (
              <label key={p} className={`px-2 py-1 text-xs rounded border cursor-pointer ${params.includes(p) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200'}`}>
                <input type="checkbox" className="hidden" checked={params.includes(p)}
                  onChange={() => setParams(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} />
                {p}
              </label>
            ))}
          </div>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          disabled={training} onClick={handleTrain}>
          {training ? 'Training...' : 'Train axis'}
        </button>

        {axis && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span><b>Train accuracy:</b> {(axis.accuracy * 100).toFixed(1)}%</span>
              <span><b>Centroid separation:</b> {fmt(axis.distances.separation)} (z-units)</span>
              <span className="text-gray-500">{axis.posCount} pos cells, {axis.negCount} neg cells</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Feature weights (positive → pulls toward fertile pole)</p>
              <Plot data={weightTraces}
                layout={{ height: 220, margin: { t: 10, r: 10, b: 40, l: 40 }, yaxis: { zeroline: true, zerolinecolor: '#666' } }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* --- Project mouse data --- */}
      <div className="bg-white rounded-xl border p-4 space-y-4">
        <h3 className="font-semibold text-sm">2. Project mouse data onto the axis</h3>
        <div>
          <label className="text-xs text-gray-500">Mouse datasets (e.g. WT, Omega6-HUFA KO)</label>
          {renderMultiSelect(mouseIds, setMouseIds, datasets)}
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
            disabled={projecting || !axis} onClick={handleProject}>
            {projecting ? 'Projecting...' : 'Project'}
          </button>
          <button className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={!projection} onClick={exportSummary}>Export per-mouse scores (CSV)</button>
        </div>

        {projection && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Score distributions (positive = closer to human-fertile pole)</p>
              <Plot data={distributionTraces}
                layout={{
                  height: 320, margin: { t: 10, r: 10, b: 40, l: 50 }, barmode: 'overlay',
                  xaxis: { title: 'Fertility-axis score', zeroline: true, zerolinecolor: '#666' },
                  yaxis: { title: 'Density' },
                  shapes: [{ type: 'line', x0: 0, x1: 0, yref: 'paper', y0: 0, y1: 1, line: { color: '#444', dash: 'dot' } }],
                }}
                config={{ responsive: true }}
                style={{ width: '100%' }} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-gray-500 text-left">
                  <th className="py-2 px-2">Mouse</th><th className="py-2 px-2">Group</th>
                  <th className="py-2 px-2">n</th><th className="py-2 px-2">Mean score</th>
                  <th className="py-2 px-2">SD</th><th className="py-2 px-2">Mean P(fertile)</th>
                  <th className="py-2 px-2">% above midpoint</th>
                </tr></thead>
                <tbody>
                  {Object.entries(projection.summary).map(([m, s]) => (
                    <tr key={m} className="border-b">
                      <td className="py-1.5 px-2 font-medium">{m}</td>
                      <td className="py-1.5 px-2">{s.group || '-'}</td>
                      <td className="py-1.5 px-2">{s.n}</td>
                      <td className={`py-1.5 px-2 font-mono ${s.meanScore >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(s.meanScore)}</td>
                      <td className="py-1.5 px-2 font-mono text-gray-600">{fmt(s.sdScore)}</td>
                      <td className="py-1.5 px-2 font-mono">{fmt(s.meanProb, 3)}</td>
                      <td className="py-1.5 px-2 font-mono">{(s.fracPos * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mouseGroupTest?.test && (
              <div className="bg-gray-50 border rounded p-3 text-sm">
                <b>Per-mouse Welch's t-test:</b> {mouseGroupTest.groups[0]} vs {mouseGroupTest.groups[1]}<br />
                <span className="font-mono">t = {fmt(mouseGroupTest.test.tStat)}, df = {fmt(mouseGroupTest.test.df, 1)}, p = {fmtP(mouseGroupTest.test.pValue)}</span>
                <span className="ml-2 text-xs text-gray-500">(n per group: {mouseGroupTest.byGroup[mouseGroupTest.groups[0]].length} vs {mouseGroupTest.byGroup[mouseGroupTest.groups[1]].length})</span>
              </div>
            )}
            {mouseGroupTest && !mouseGroupTest.test && (
              <p className="text-xs text-gray-400">Need ≥2 mice in each Group for between-group t-test.</p>
            )}
          </div>
        )}
      </div>

      {/* --- Co-embedding --- */}
      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm">3. Co-embedded landscape (qualitative)</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
            disabled={embedding} onClick={handleCoEmbed}>
            {embedding ? 'Embedding...' : 'Run co-embedding'}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Combined t-SNE of human reference + mouse cells, with per-source z-score normalization so absolute species scale (mouse VCL ~200 vs human ~90 µm/s) doesn't dominate the layout.
        </p>
        {coEmbed && (
          <Plot data={coEmbedTraces}
            layout={{ height: 480, margin: { t: 10, r: 10, b: 40, l: 50 },
              xaxis: { title: 'Co-t-SNE 1' }, yaxis: { title: 'Co-t-SNE 2' } }}
            config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
            style={{ width: '100%' }} />
        )}
      </div>
    </div>
  )
}
