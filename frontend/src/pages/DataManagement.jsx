import { useCallback, useEffect, useState } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { useAppState } from '../context/appContext'
import FileUploader from '../components/FileUploader'
import DataTable from '../components/DataTable'
import ReferenceLoader from '../components/ReferenceLoader'

export default function DataManagement() {
  const db = useDB()
  const engine = useEngine()
  const { state, dispatch } = useAppState()
  const [uploadMode, setUploadMode] = useState('raw')
  const [message, setMessage] = useState('')

  const refresh = useCallback(() => {
    db.getDatasets().then(data => dispatch({ type: 'SET_DATASETS', payload: data }))
  }, [db, dispatch])
  useEffect(() => { refresh() }, [refresh])

  const handleUpload = async (file, meta, mode) => {
    try {
      setMessage('Processing...')
      if (mode === 'raw') { await engine.uploadAndPreprocess(file, meta) } else { await engine.importProcessed(file, meta) }
      setMessage('Upload successful!')
      refresh()
    } catch (err) { setMessage(`Error: ${err.message}`) }
  }

  const handleDelete = async (id) => { await db.deleteDataset(id); refresh() }
  const handleRename = async (id, name) => { await db.updateDataset(id, { name }); refresh() }

  const sampleUrl = `${import.meta.env.BASE_URL || '/'}sample_processed.csv`

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
        <a href={sampleUrl} download className="text-sm text-blue-600 hover:text-blue-800 underline">
          Download sample CSV
        </a>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <div className="flex gap-4 mb-4">
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${uploadMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setUploadMode('raw')}>Upload Raw CASA CSV</button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${uploadMode === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setUploadMode('import')}>Import Processed CSV</button>
        </div>
        <FileUploader onUpload={handleUpload} mode={uploadMode} />
        {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
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
