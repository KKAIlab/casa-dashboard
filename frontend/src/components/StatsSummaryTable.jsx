const PARAMS = ['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF']

function fmt(v) {
  if (v == null || isNaN(v)) return '-'
  return Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)
}

export default function StatsSummaryTable({ baseline }) {
  if (!baseline || Object.keys(baseline).length === 0) return null
  const mice = Object.keys(baseline)

  return (
    <div className="bg-white rounded-xl border p-4 overflow-x-auto">
      <h3 className="font-semibold text-sm mb-3">Per-Mouse Summary (mean ± SD)</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-gray-500 text-left">
            <th className="py-2 px-2">Mouse</th>
            <th className="py-2 px-2">n</th>
            {PARAMS.map(p => <th key={p} className="py-2 px-2">{p}</th>)}
          </tr>
        </thead>
        <tbody>
          {mice.map(m => {
            const e = baseline[m]
            return (
              <tr key={m} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2 font-medium">{m}</td>
                <td className="py-2 px-2 text-gray-600">{e.n}</td>
                {PARAMS.map(p => (
                  <td key={p} className="py-2 px-2 font-mono text-gray-700">
                    {fmt(e[`${p}_mean`])} <span className="text-gray-400">±{fmt(e[`${p}_std`])}</span>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
