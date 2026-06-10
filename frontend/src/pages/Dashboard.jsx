import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDB } from '../hooks/useDB'
import { useAppState } from '../context/appContext'

export default function Dashboard() {
  const db = useDB()
  const { state, dispatch } = useAppState()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getDatasets().then(data => {
      dispatch({ type: 'SET_DATASETS', payload: data })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [db, dispatch])

  const datasets = state.datasets
  const stats = {
    total: datasets.length,
    analyzed: datasets.filter(d => d.status === 'done').length,
    totalSperm: datasets.reduce((sum, d) => sum + (d.totalSperm || 0), 0),
    genotypes: [...new Set(datasets.map(d => d.genotype).filter(Boolean))],
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Datasets', value: stats.total },
          { label: 'Analyzed', value: stats.analyzed },
          { label: 'Total Sperm', value: stats.totalSperm.toLocaleString() },
          { label: 'Genotypes', value: stats.genotypes.join(', ') || '-' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Recent Datasets</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800" onClick={() => navigate('/data')}>Manage Data</button>
        </div>
        <div className="p-4">
          {datasets.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No datasets yet. Go to Data Management to upload.</p>
          ) : (
            <div className="space-y-2">
              {datasets.slice(0, 5).map(ds => (
                <div key={ds.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => { dispatch({ type: 'SELECT_DATASET', payload: ds.id }); navigate('/analysis') }}>
                  <div>
                    <p className="font-medium text-sm">{ds.name}</p>
                    <p className="text-xs text-gray-400">{ds.genotype} &middot; {(ds.totalSperm || 0).toLocaleString()} sperm</p>
                  </div>
                  <span className={`text-xs font-medium ${ds.status === 'done' ? 'text-green-600' : ds.status === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {ds.status === 'done' ? 'Complete' : ds.status === 'error' ? 'Error' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
