import { useEffect, useState } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { useAppState } from '../context/AppContext'
import FileUploader from '../components/FileUploader'
import DataTable from '../components/DataTable'
import ReferenceLoader from '../components/ReferenceLoader'

export default function DataManagement() {
  const db = useDB()
  const engine = useEngine()
  const { state, dispatch } = useAppState()
  const [uploadMode, setUploadMode] = useState('raw')
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info') // info | success | error

  const refresh = () => { db.getDatasets().then(data => dispatch({ type: 'SET_DATASETS', payload: data })) }
  useEffect(() => { refresh() }, [])

  const handleUpload = async (file, meta, mode) => {
    try {
      setMessageKind('info'); setMessage('Processing...')
      if (mode === 'raw') {
        const { totalSperm, motileSperm } = await engine.uploadAndPreprocess(file, meta)
        const pct = totalSperm ? Math.round((motileSperm / totalSperm) * 100) : 0
        setMessageKind('success')
        setMessage(`Upload successful — kept ${motileSperm} of ${totalSperm} rows as motile sperm (${pct}%).`)
      } else {
        await engine.importProcessed(file, meta)
        setMessageKind('success'); setMessage('Import successful!')
      }
      refresh()
    } catch (err) { setMessageKind('error'); setMessage(err.message) }
  }

  const handleDelete = async (id) => { await db.deleteDataset(id); refresh() }
  const handleRename = async (id, name) => { await db.updateDataset(id, { name }); refresh() }

  const base = import.meta.env.BASE_URL || '/'
  const sampleProcessedUrl = `${base}sample_processed.csv`
  const sampleRawUrl = `${base}sample_raw_casa.csv`
  const messageClass = messageKind === 'error'
    ? 'text-red-700 bg-red-50 border border-red-200'
    : messageKind === 'success'
    ? 'text-green-700 bg-green-50 border border-green-200'
    : 'text-gray-600 bg-gray-50 border border-gray-200'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
        <div className="flex gap-4">
          <a href={sampleRawUrl} download className="text-sm text-blue-600 hover:text-blue-800 underline">
            Sample raw CASA CSV
          </a>
          <a href={sampleProcessedUrl} download className="text-sm text-blue-600 hover:text-blue-800 underline">
            Sample processed CSV
          </a>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <div className="flex gap-4 mb-4">
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${uploadMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setUploadMode('raw')}>Upload Raw CASA CSV</button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${uploadMode === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setUploadMode('import')}>Import Processed CSV</button>
        </div>
        <FileUploader onUpload={handleUpload} mode={uploadMode} />
        {uploadMode === 'raw' && (
          <p className="mt-2 text-xs text-gray-400">
            Accepts raw CASA exports (Japanese or English headers, Shift-JIS or UTF-8). Metadata/preamble rows and µm/μm/um unit variants are handled automatically. Only motile sperm (Type = 99) are analyzed. Try the <a href={sampleRawUrl} download className="text-blue-600 underline">sample raw CASA CSV</a>.
          </p>
        )}
        {message && <p className={`mt-3 text-sm rounded-lg px-3 py-2 ${messageClass}`}>{message}</p>}
      </div>
      <ReferenceLoader onLoad={async (url, meta) => { await engine.importFromURL(url, meta); refresh() }} />
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Datasets</h3>
        <DataTable
          datasets={state.datasets}
          selectedId={state.selectedDatasetId}
          onSelect={id => dispatch({ type: 'SELECT_DATASET', payload: id })}
          onDelete={handleDelete}
          onRename={handleRename}
        />
      </div>
    </div>
  )
}
