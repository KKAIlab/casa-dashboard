import { describe, it, expect } from 'vitest'

// The custom Plotly bundle (src/components/charts/plotlyBundle.js) registers
// only the trace types the dashboard actually draws. If a chart starts using
// a new trace type, it must be added there or Plotly will silently fail to
// render it. This test pins the contract: every trace type used in the app is
// registered on the bundle.
const REQUIRED_TRACE_TYPES = ['scatter', 'scattergl', 'bar', 'box', 'heatmap', 'histogram', 'violin']

describe('custom plotly bundle', () => {
  it('registers every trace type the charts use', async () => {
    const Plotly = (await import('../../src/components/charts/plotlyBundle.js')).default
    const registered = Object.keys(Plotly.PlotSchema.get().traces)
    for (const type of REQUIRED_TRACE_TYPES) {
      expect(registered, `trace type "${type}" must be registered`).toContain(type)
    }
  })
})
