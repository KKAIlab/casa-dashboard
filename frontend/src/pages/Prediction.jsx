import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useAppState } from '../context/AppContext'
import ClusterClassifier from '../components/prediction/ClusterClassifier'
import DensityScoring from '../components/prediction/DensityScoring'

export default function Prediction() {
  const api = useApi()
  const { state, dispatch } = useAppState()
  const [datasets, setDatasets] = useState([])
  const [classifierResult, setClassifierResult] = useState(null)
  const [densityResult, setDensityResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedId = state.selectedDatasetId

  useEffect(() => {
    api.getDatasets().then(data => {
      setDatasets(data.filter(d => d.analysis_status === 'done'))
      dispatch({ type: 'SET_DATASETS', payload: data })
    }).catch(() => {})
  }, [])

  const runPrediction = async (modelType) => {
    if (!selectedId) return
    setLoading(true)
    setError('')
    try {
      const result = await api.predict(selectedId, modelType)
      if (modelType === 'cluster_classifier') {
        setClassifierResult(result.result)
      } else {
        setDensityResult(result.result)
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Fertility Prediction</h2>
      <div className="flex gap-3 items-center">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={selectedId || ''}
          onChange={e => dispatch({ type: 'SELECT_DATASET', payload: e.target.value })}
        >
          <option value="">Select analyzed dataset...</option>
          {datasets.map(ds => (
            <option key={ds.id} value={ds.id}>{ds.name} ({ds.genotype})</option>
          ))}
        </select>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">Model A: Cluster Proportion Classifier</h3>
              <p className="text-xs text-gray-400 mt-1">Logistic regression on cluster proportions</p>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              disabled={!selectedId || loading}
              onClick={() => runPrediction('cluster_classifier')}
            >{loading ? 'Running...' : 'Predict'}</button>
          </div>
          <ClusterClassifier result={classifierResult} />
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">Model B: Landscape Density Scoring</h3>
              <p className="text-xs text-gray-400 mt-1">KDE + Jensen-Shannon divergence vs fertile reference</p>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              disabled={!selectedId || loading}
              onClick={() => runPrediction('density_scoring')}
            >{loading ? 'Running...' : 'Score'}</button>
          </div>
          <DensityScoring result={densityResult} />
        </div>
      </div>
      <div className="bg-white rounded-xl border p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-2">Reference</p>
        <p>Fernandez-Lopez, P. et al. (2022). "Predicting fertility from sperm motility landscapes." <em>Communications Biology</em> 5:1027</p>
        <p className="mt-2 text-xs text-gray-400">Note: Prediction uses built-in synthetic reference data. For accurate predictions, upload actual fertile/subfertile reference populations via the Data Management page.</p>
      </div>
    </div>
  )
}
