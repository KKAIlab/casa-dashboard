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
      if (!rows.length) throw new Error('Reference CSV is empty or could not be parsed.')
      let referenceData
      if (modelType === 'cluster_classifier') {
        const header = Object.keys(rows[0])
        if (!header.includes('label')) {
          throw new Error("Reference CSV for Model A needs a 'label' column (e.g. fertile/subfertile).")
        }
        const clusterCols = header.filter(h => /^\d+$/.test(h))
        if (clusterCols.length === 0) {
          throw new Error("Reference CSV for Model A needs cluster-proportion columns named by cluster id (0, 1, 2, …).")
        }
        referenceData = rows.map(r => ({
          label: r.label,
          proportions: Object.fromEntries(clusterCols.map(c => [c, Number(r[c]) || 0])),
        }))
      } else {
        referenceData = { tsne: rows.map(r => [r.tSNE1, r.tSNE2]).filter(r => !isNaN(r[0])) }
        if (referenceData.tsne.length === 0) {
          throw new Error('Reference CSV for Model B needs numeric tSNE1 and tSNE2 columns.')
        }
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
        <p className="text-xs text-gray-400 mb-3">Upload a labeled reference CSV, or load the built-in WHO human reference (synthetic, drawn from WHO 5th-ed normative ranges).</p>
        <div className="flex flex-wrap gap-2 items-center">
          <button className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50" onClick={() => refInputRef.current?.click()}>
            {refFile ? refFile.name : 'Choose reference CSV...'}
          </button>
          <input ref={refInputRef} type="file" accept=".csv" className="hidden" onChange={e => setRefFile(e.target.files[0])} />
          <button
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            onClick={async () => {
              try {
                const url = `${import.meta.env.BASE_URL || '/'}references/who_human_fertile.csv`
                const res = await fetch(url)
                if (!res.ok) throw new Error('Failed to fetch reference')
                const text = await res.text()
                const blob = new Blob([text], { type: 'text/csv' })
                setRefFile(new File([blob], 'who_human_fertile.csv', { type: 'text/csv' }))
                setError('')
              } catch (err) { setError(err.message) }
            }}>Use WHO fertile reference</button>
        </div>
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
