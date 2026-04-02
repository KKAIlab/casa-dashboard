import { useEffect, useState, useCallback } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { useAppState } from '../context/AppContext'
import ProgressBar from '../components/ProgressBar'
import TsneLandscape from '../components/charts/TsneLandscape'
import ClusterProportions from '../components/charts/ClusterProportions'
import ParameterBoxPlots from '../components/charts/ParameterBoxPlots'
import GenotypeComparison from '../components/charts/GenotypeComparison'

export default function Analysis() {
  const db = useDB()
  const engine = useEngine()
  const { state, dispatch } = useAppState()
  const [charts, setCharts] = useState({})
  const [datasets, setDatasets] = useState([])
  const [compareIds, setCompareIds] = useState([])
  const [compareData, setCompareData] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const selectedId = state.selectedDatasetId

  useEffect(() => {
    db.getDatasets().then(data => { setDatasets(data); dispatch({ type: 'SET_DATASETS', payload: data }) }).catch(() => {})
  }, [])

  const loadCharts = useCallback(async (id) => {
    const types = ['tsne_landscape', 'cluster_proportions', 'parameter_box']
    const results = {}
    for (const type of types) { try { results[type] = await engine.getChartData(id, type) } catch { /* skip */ } }
    setCharts(results)
  }, [engine])

  useEffect(() => {
    if (!selectedId) return
    db.getResults(selectedId).then(results => { if (results) loadCharts(selectedId) }).catch(() => {})
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
          <div className="grid grid-cols-2 gap-6">
            <TsneLandscape data={charts.tsne_landscape} />
            <ClusterProportions data={charts.cluster_proportions} />
          </div>
          <ParameterBoxPlots data={charts.parameter_box} />
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-sm mb-3">Cross-Genotype Comparison</h3>
            <div className="flex gap-3 items-center mb-4">
              <select multiple className="border rounded-lg px-3 py-2 text-sm h-24" value={compareIds} onChange={e => setCompareIds([...e.target.selectedOptions].map(o => Number(o.value)))}>
                {datasets.filter(d => d.status === 'done').map(ds => (<option key={ds.id} value={ds.id}>{ds.name}</option>))}
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm" disabled={compareIds.length < 2} onClick={handleCompare}>Compare</button>
            </div>
            {compareData && <GenotypeComparison data={compareData} />}
          </div>
        </div>
      )}
    </div>
  )
}
