import { useEffect, useState, useCallback } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { useAppState } from '../context/AppContext'
import ProgressBar from '../components/ProgressBar'
import TsneLandscape from '../components/charts/TsneLandscape'
import ClusterProportions from '../components/charts/ClusterProportions'
import ParameterBoxPlots from '../components/charts/ParameterBoxPlots'
import GenotypeComparison from '../components/charts/GenotypeComparison'
import MotilityBreakdown from '../components/charts/MotilityBreakdown'
import Heatmap from '../components/charts/Heatmap'
import StatsSummaryTable from '../components/StatsSummaryTable'
import GroupComparisonPanel from '../components/GroupComparisonPanel'
import {
  rowsToCSV, downloadText, baselineStatsToRows,
  motilitySummaryToRows, clusterPropsToRows,
} from '../engine/exporter'

export default function Analysis() {
  const db = useDB()
  const engine = useEngine()
  const { state, dispatch } = useAppState()
  const [charts, setCharts] = useState({})
  const [results, setResults] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [compareIds, setCompareIds] = useState([])
  const [compareData, setCompareData] = useState(null)
  const [compareRows, setCompareRows] = useState([])
  const [analyzing, setAnalyzing] = useState(false)

  const selectedId = state.selectedDatasetId

  useEffect(() => {
    db.getDatasets().then(data => { setDatasets(data); dispatch({ type: 'SET_DATASETS', payload: data }) }).catch(() => {})
  }, [])

  const loadCharts = useCallback(async (id) => {
    const types = ['tsne_landscape', 'cluster_proportions', 'parameter_box']
    const out = {}
    for (const type of types) { try { out[type] = await engine.getChartData(id, type) } catch { /* skip */ } }
    setCharts(out)
    const r = await db.getResults(id)
    setResults(r)
  }, [engine, db])

  useEffect(() => {
    if (!selectedId) return
    db.getResults(selectedId).then(r => {
      if (r) loadCharts(selectedId)
      else { setCharts({}); setResults(null) }
    }).catch(() => {})
  }, [selectedId])

  const handleAnalyze = async () => {
    if (!selectedId) return
    setAnalyzing(true)
    try {
      await engine.analyze(selectedId)
      await loadCharts(selectedId)
      const data = await db.getDatasets()
      setDatasets(data); dispatch({ type: 'SET_DATASETS', payload: data })
    } catch (err) { console.error('Analysis failed:', err) }
    setAnalyzing(false)
  }

  const handleCompare = async () => {
    if (compareIds.length < 2) return
    setCompareData(await engine.compareDatasets(compareIds))
    // Pull raw rows + Group label for the t-test panel
    const all = []
    for (const id of compareIds) {
      const r = await db.getResults(id)
      const ds = await db.getDataset(id)
      if (!r) continue
      const grp = ds?.group || ds?.genotype || ds?.name
      r.analyzedData.forEach(row => all.push({ ...row, Group: grp }))
    }
    setCompareRows(all)
  }

  const exportCSV = (kind) => {
    if (!results) return
    const ds = datasets.find(d => d.id === selectedId)
    const base = ds?.name || `dataset_${selectedId}`
    if (kind === 'cells') {
      downloadText(rowsToCSV(results.analyzedData), `${base}_cells.csv`)
    } else if (kind === 'baseline') {
      downloadText(rowsToCSV(baselineStatsToRows(results.stats?.baseline)), `${base}_baseline_stats.csv`)
    } else if (kind === 'motility') {
      downloadText(rowsToCSV(motilitySummaryToRows(results.stats?.motilitySummary)), `${base}_motility_summary.csv`)
    } else if (kind === 'clusters') {
      downloadText(rowsToCSV(clusterPropsToRows(results.clusterProps)), `${base}_cluster_proportions.csv`)
    }
  }

  const currentDs = datasets.find(d => d.id === selectedId)
  const isDone = currentDs?.status === 'done'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analysis & Visualization</h2>
        <div className="flex gap-3 items-center">
          <select className="border rounded-lg px-3 py-2 text-sm" value={selectedId || ''} onChange={e => dispatch({ type: 'SELECT_DATASET', payload: Number(e.target.value) })}>
            <option value="">Select dataset...</option>
            {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name} ({ds.genotype})</option>)}
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50" disabled={!selectedId || analyzing} onClick={handleAnalyze}>
            {analyzing ? 'Running...' : 'Run Analysis'}
          </button>
        </div>
      </div>
      {engine.progress && <ProgressBar status={engine.progress.status} message={engine.progress.message} />}
      {isDone && Object.keys(charts).length > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-3 flex flex-wrap gap-2 items-center text-sm">
            <span className="font-medium text-gray-600 mr-1">Export:</span>
            <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => exportCSV('cells')}>Cells (full)</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => exportCSV('baseline')}>Per-mouse means</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => exportCSV('motility')}>WHO motility</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => exportCSV('clusters')}>Cluster proportions</button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <TsneLandscape data={charts.tsne_landscape} />
            <ClusterProportions data={charts.cluster_proportions} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <MotilityBreakdown summary={results?.stats?.motilitySummary} />
            <Heatmap clusterProps={results?.clusterProps} title="Cluster Proportion Heatmap" />
          </div>
          <ParameterBoxPlots data={charts.parameter_box} />
          <StatsSummaryTable baseline={results?.stats?.baseline} />
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-sm mb-3">Cross-Genotype Comparison</h3>
            <div className="flex gap-3 items-center mb-4">
              <select multiple className="border rounded-lg px-3 py-2 text-sm h-24" value={compareIds} onChange={e => setCompareIds([...e.target.selectedOptions].map(o => Number(o.value)))}>
                {datasets.filter(d => d.status === 'done').map(ds => (<option key={ds.id} value={ds.id}>{ds.name}</option>))}
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm" disabled={compareIds.length < 2} onClick={handleCompare}>Compare</button>
            </div>
            {compareData && <GenotypeComparison data={compareData} />}
            {compareRows.length > 0 && (
              <div className="mt-4">
                <GroupComparisonPanel rows={compareRows} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
