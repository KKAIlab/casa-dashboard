import { describe, it, expect } from 'vitest'
import { runAnalysisPipeline } from '../../src/engine/pipeline.js'

describe('runAnalysisPipeline', () => {
  it('runs full pipeline on motile sperm data', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      Type: 99,
      VCL: 50 + Math.sin(i) * 30,
      VSL: 30 + Math.cos(i) * 20,
      VAP: 40 + Math.sin(i * 2) * 15,
      LIN: 0.5 + Math.cos(i) * 0.3,
      STR: 0.6 + Math.sin(i) * 0.2,
      WOB: 0.7 + Math.cos(i * 3) * 0.1,
      ALH: 2 + Math.sin(i * 0.5) * 1.5,
      BCF: 8 + Math.cos(i * 0.7) * 4,
      Mouse: i < 15 ? 'M1' : 'M2',
      Group: i < 15 ? 'WT' : 'KO',
    }))

    const result = runAnalysisPipeline(data)

    expect(result.analyzedData).toHaveLength(30)
    expect(result.analyzedData[0]).toHaveProperty('tSNE1')
    expect(result.analyzedData[0]).toHaveProperty('tSNE2')
    expect(result.analyzedData[0]).toHaveProperty('Cluster')
    expect(typeof result.analyzedData[0].Cluster).toBe('number')
    expect(result.stats.baseline).toHaveProperty('M1')
    expect(result.stats.baseline).toHaveProperty('M2')
    expect(result.stats.clusterProportions).toHaveProperty('M1')
  })

  it('returns error for empty data', () => {
    const result = runAnalysisPipeline([])
    expect(result.error).toBeTruthy()
  })
})
