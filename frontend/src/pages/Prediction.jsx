import { useEffect, useState, useRef } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { useAppState } from '../context/AppContext'
import { readFileText, parseCSVText } from '../engine/preprocessing'
import ClusterClassifier from '../components/prediction/ClusterClassifier'
import DensityScoring from '../components/prediction/DensityScoring'

export default function Prediction() {
  const db = useDB()
  const engine = useEngine()
  const { state, dispatch } = useAppState()
  const [datasets, setDatasets] = useState([])
  const [classifierResult, setClassifierResult] = useState(null)
  const [densityResult, setDensityResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refFile, setRefFile] = useState(null)
  const refInputRef = useRef()
  const selectedId = state.selectedDatasetId

  useEffect(() => {
    db.getDatasets().then(data => {
      setDatasets(data.filter(d => d.status === 'done'))
      dispatch({ type: 'SET_DATASETS', payload: data })
    }).catch(() => {})
  }, [])

  const runPrediction = async (modelType) => {
    if (!selectedId) return
    if (!refFile) { setError('Please upload a reference CSV first'); return }
    setLoading(true); setError('')
    try {
      const refText = await readFileText(refFile)
      const { rows } = parseCSVText(refText)
      let referenceData
      if (modelType === 'cluster_classifier') {
        referenceData = rows.map(r => ({ label: r.label, proportions: { 0: r[0] || 0, 1: r[1] || 0, 2: r[2] || 0, 3: r[3] || 0, 4: r[4] || 0 } }))
      } else {
        referenceData = { tsne: rows.map(r => [r.tSNE1, r.tSNE2]).filter(r => !isNaN(r[0])) }
      }
      const result = await engine.predict(selectedId, modelType, referenceData)
      if (modelType === 'cluster_classifier') { setClassifierResult(result.result) } else { setDensityResult(result.result) }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Fertility Prediction</h2>
      <div className="flex gap-3 items-center">
        <select className="border rounded-lg px-3 py-2 text-sm" value={selectedId || ''} onChange={e => dispatch({ type: 'SELECT_DATASET', payload: Number(e.target.value) })}>
          <option value="">Select analyzed dataset...</option>
          {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name} ({ds.genotype})</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold text-sm mb-2">Reference Data</h3>
        <p className="text-xs text-gray-400 mb-3">Upload a CSV with labeled reference populations (fertile/subfertile).</p>
        <button className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50" onClick={() => refInputRef.current?.click()}>
          {refFile ? refFile.name : 'Choose reference CSV...'}
        </button>
        <input ref={refInputRef} type="file" accept=".csv" className="hidden" onChange={e => setRefFile(e.target.files[0])} />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <div><h3 className="font-semibold">Model A: Cluster Proportion Classifier</h3><p className="text-xs text-gray-400 mt-1">Nearest-centroid on cluster proportions</p></div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50" disabled={!selectedId || loading || !refFile} onClick={() => runPrediction('cluster_classifier')}>{loading ? 'Running...' : 'Predict'}</button>
          </div>
          <ClusterClassifier result={classifierResult} />
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <div><h3 className="font-semibold">Model B: Landscape Density Scoring</h3><p className="text-xs text-gray-400 mt-1">Histogram JS divergence vs reference</p></div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50" disabled={!selectedId || loading || !refFile} onClick={() => runPrediction('density_scoring')}>{loading ? 'Running...' : 'Score'}</button>
          </div>
          <DensityScoring result={densityResult} />
        </div>
      </div>
      <div className="bg-white rounded-xl border p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-2">Reference</p>
        <p>Fernandez-Lopez, P. et al. (2022). "Predicting fertility from sperm motility landscapes." <em>Communications Biology</em> 5:1027</p>
      </div>
    </div>
  )
}
