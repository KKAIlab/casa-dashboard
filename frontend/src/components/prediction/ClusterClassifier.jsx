export default function ClusterClassifier({ result }) {
  if (!result) return null
  const { prediction, probability, class_probabilities } = result
  return (
    <div className="space-y-4">
      <div className={`p-6 rounded-xl text-center ${
        prediction === 'fertile' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      } border`}>
        <p className="text-sm text-gray-500">Classification</p>
        <p className={`text-3xl font-bold mt-1 ${
          prediction === 'fertile' ? 'text-green-700' : 'text-red-700'
        }`}>
          {prediction.charAt(0).toUpperCase() + prediction.slice(1)}
        </p>
        <p className="text-sm text-gray-500 mt-2">Relative score: {(probability * 100).toFixed(1)}%</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">Class scores</p>
        {Object.entries(class_probabilities || {}).map(([cls, prob]) => (
          <div key={cls} className="flex items-center gap-3">
            <span className="text-sm w-20">{cls}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${cls === 'fertile' ? 'bg-green-500' : 'bg-red-400'}`}
                style={{ width: `${prob * 100}%` }}
              />
            </div>
            <span className="text-sm w-16 text-right">{(prob * 100).toFixed(1)}%</span>
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-2">
          Scores are a softmax over distances to each class centroid — a relative
          ranking, not a calibrated probability.
        </p>
      </div>
    </div>
  )
}
