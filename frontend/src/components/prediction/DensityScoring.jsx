export default function DensityScoring({ result }) {
  if (!result) return null
  const { similarity_score, js_divergence } = result
  const hue = (similarity_score / 100) * 120
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-xl bg-gray-50 border text-center">
        <p className="text-sm text-gray-500">Similarity to Fertile Reference</p>
        <p className="text-5xl font-bold mt-2" style={{ color: `hsl(${hue}, 70%, 40%)` }}>
          {similarity_score.toFixed(1)}
        </p>
        <p className="text-sm text-gray-400 mt-1">/ 100</p>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>Jensen-Shannon Divergence: <span className="font-mono">{js_divergence.toFixed(4)}</span></p>
        <p className="text-xs text-gray-400 mt-2">
          Score 0-100: higher = more similar to fertile reference population.
          Based on KDE density comparison in t-SNE space.
        </p>
      </div>
    </div>
  )
}
