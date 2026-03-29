import { ANALYSIS_STATUS } from '../utils/constants'

export default function DataTable({ datasets, onSelect, onDelete, selectedId }) {
  if (datasets.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">No datasets uploaded yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 px-3">Name</th>
            <th className="py-2 px-3">Genotype</th>
            <th className="py-2 px-3">Sperm</th>
            <th className="py-2 px-3">Source</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map(ds => {
            const status = ANALYSIS_STATUS[ds.analysis_status] || {}
            return (
              <tr
                key={ds.id}
                className={`border-b hover:bg-gray-50 cursor-pointer ${
                  selectedId === ds.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelect(ds.id)}
              >
                <td className="py-2 px-3 font-medium">{ds.name}</td>
                <td className="py-2 px-3">{ds.genotype}</td>
                <td className="py-2 px-3">{ds.total_sperm.toLocaleString()}</td>
                <td className="py-2 px-3">{ds.source_type}</td>
                <td className={`py-2 px-3 ${status.color}`}>{status.label}</td>
                <td className="py-2 px-3">
                  <button
                    className="text-red-500 hover:text-red-700 text-xs"
                    onClick={e => { e.stopPropagation(); onDelete(ds.id) }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
