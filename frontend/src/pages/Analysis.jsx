import { useEffect, useState, useCallback } from 'react'
import { useApi } from '../hooks/useApi'
import { useAppState } from '../context/AppContext'
import ProgressBar from '../components/ProgressBar'
import TsneLandscape from '../components/charts/TsneLandscape'
import ClusterProportions from '../components/charts/ClusterProportions'
import ParameterBoxPlots from '../components/charts/ParameterBoxPlots'
import Heatmap from '../components/charts/Heatmap'
import ScatterPlot from '../components/charts/ScatterPlot'
import ViolinPlot from '../components/charts/ViolinPlot'
import GenotypeComparison from '../components/charts/GenotypeComparison'

export default function Analysis() {
  const api = useApi()
  const { state, dispatch } = useAppState()
  const [analysisStatus, setAnalysisStatus] = useState(null)
  const [charts, setCharts] = useState({})
  const [datasets, setDatasets] = useState([])
  const [compareIds, setCompareIds] = useState([])
  const [compareData, setCompareData] = useState(null)

  const selectedId = state.selectedDatasetId

  useEffect(() => {
    api.getDatasets().then(data => {
      setDatasets(data)
      dispatch({ type: 'SET_DATASETS', payload: data })
    }).catch(() => {})
  }, [])

  const loadCharts = useCallback(async (id) => {
    const types = ['tsne_landscape', 'cluster_proportions', 'parameter_box', 'heatmap', 'scatter', 'violin']
    const results = {}
    for (const type of types) {
      try {
        results[type] = await api.getChartData(id, type)
      } catch { /* skip unavailable charts */ }
    }
    setCharts(results)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    api.getAnalysis(selectedId).then(res => {
      setAnalysisStatus(res)
      if (res.status === 'done') loadCharts(selectedId)
    }).catch(() => {})
  }, [selectedId])

  const handleAnalyze = async () => {
    if (!selectedId) return
    await api.triggerAnalysis(selectedId)
    const poll = setInterval(async () => {
      const res = await api.getAnalysis(selectedId)
      setAnalysisStatus(res)
      if (res.status === 'done' || res.status === 'error') {
        clearInterval(poll)
        if (res.status === 'done') loadCharts(selectedId)
      }
    }, 2000)
  }

  const handleCompare = async () => {
    if (compareIds.length < 2) return
    const data = await api.compareDatasets(compareIds)
    setCompareData(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analysis & Visualization</h2>
        <div className="flex gap-3 items-center">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={selectedId || ''}
            onChange={e => dispatch({ type: 'SELECT_DATASET', payload: e.target.value })}
          >
            <option value="">Select dataset...</option>
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name} ({ds.genotype})</option>
            ))}
          </select>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={!selectedId || analysisStatus?.status === 'running'}
            onClick={handleAnalyze}
          >
            {analysisStatus?.status === 'running' ? 'Running...' : 'Run Analysis'}
          </button>
          <a
            href={selectedId ? api.exportCsv(selectedId) : '#'}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            download
          >
            Export CSV
          </a>
        </div>
      </div>

      {analysisStatus && <ProgressBar status={analysisStatus.status} message={analysisStatus.message} />}

      {analysisStatus?.status === 'done' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TsneLandscape data={charts.tsne_landscape} />
            <ClusterProportions data={charts.cluster_proportions} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <ParameterBoxPlots data={charts.parameter_box} />
            <ScatterPlot data={charts.scatter} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Heatmap data={charts.heatmap} />
            <ViolinPlot data={charts.violin} />
          </div>

          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-sm mb-3">Cross-Genotype Comparison</h3>
            <div className="flex gap-3 items-center mb-4">
              <select
                multiple
                className="border rounded-lg px-3 py-2 text-sm h-24"
                value={compareIds}
                onChange={e => setCompareIds([...e.target.selectedOptions].map(o => o.value))}
              >
                {datasets.filter(d => d.analysis_status === 'done').map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                disabled={compareIds.length < 2}
                onClick={handleCompare}
              >
                Compare
              </button>
            </div>
            {compareData && <GenotypeComparison data={compareData} />}
          </div>
        </div>
      )}
    </div>
  )
}
