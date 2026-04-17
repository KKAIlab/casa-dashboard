import { useEffect, useState } from 'react'

export default function ReferenceLoader({ onLoad }) {
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState('')

  const base = import.meta.env.BASE_URL || '/'

  useEffect(() => {
    fetch(`${base}references/manifest.json`)
      .then(r => r.ok ? r.json() : { references: [] })
      .then(data => setRefs(data.references || []))
      .catch(() => setRefs([]))
  }, [base])

  if (refs.length === 0) return null

  const handleLoad = async (ref) => {
    setLoading(ref.id); setMessage('')
    try {
      await onLoad(`${base}references/${ref.file}`, {
        name: ref.name,
        genotype: ref.group,
        group: ref.group,
        mouseId: ref.id,
      })
      setMessage(`Loaded "${ref.name}" — go to Analysis to run t-SNE.`)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setLoading(null)
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="font-semibold mb-1">Built-in Human References</h3>
      <p className="text-xs text-gray-500 mb-4">
        Synthetic cell-level data drawn from WHO 5th-edition normative ranges.
        Useful as fertility baselines for the Prediction page or to try the full UI.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {refs.map(ref => (
          <div key={ref.id} className="border rounded-lg p-3 flex flex-col gap-2">
            <p className="text-sm font-medium">{ref.name}</p>
            <p className="text-xs text-gray-500">{ref.donors} donors · {ref.cells} cells</p>
            <p className="text-xs text-gray-400 leading-snug">{ref.description}</p>
            <button
              className="self-start text-xs px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              disabled={loading === ref.id}
              onClick={() => handleLoad(ref)}
            >{loading === ref.id ? 'Loading…' : 'Load as dataset'}</button>
          </div>
        ))}
      </div>
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  )
}
