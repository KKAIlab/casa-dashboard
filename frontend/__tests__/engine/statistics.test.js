import { describe, it, expect } from 'vitest'
import { computeBaselineStats, computeClusterProportions, welchTTest } from '../../src/engine/statistics.js'

describe('computeBaselineStats', () => {
  it('computes mean and std per mouse', () => {
    const data = [
      { Mouse: 'M1', VCL: 100, VSL: 60 },
      { Mouse: 'M1', VCL: 120, VSL: 80 },
      { Mouse: 'M2', VCL: 90, VSL: 50 },
    ]
    const stats = computeBaselineStats(data, ['VCL', 'VSL'])
    expect(stats.M1.n).toBe(2)
    expect(stats.M1.VCL_mean).toBe(110)
    expect(stats.M2.n).toBe(1)
    expect(stats.M2.VCL_mean).toBe(90)
  })
})

describe('computeClusterProportions', () => {
  it('computes cluster % per mouse', () => {
    const data = [
      { Mouse: 'M1', Cluster: 0 },
      { Mouse: 'M1', Cluster: 0 },
      { Mouse: 'M1', Cluster: 1 },
      { Mouse: 'M1', Cluster: 1 },
      { Mouse: 'M2', Cluster: 0 },
    ]
    const props = computeClusterProportions(data)
    expect(props.M1[0]).toBe(50)
    expect(props.M1[1]).toBe(50)
    expect(props.M2[0]).toBe(100)
  })
})

describe('welchTTest', () => {
  it('returns correct p-value for clearly different groups', () => {
    const a = [100, 110, 105, 95, 108]
    const b = [50, 55, 48, 52, 60]
    const result = welchTTest(a, b)
    expect(result.pValue).toBeLessThan(0.01)
    expect(result.tStat).toBeGreaterThan(0)
  })

  it('returns high p-value for similar groups', () => {
    const a = [100, 102, 98, 101, 99]
    const b = [100, 103, 97, 101, 100]
    const result = welchTTest(a, b)
    expect(result.pValue).toBeGreaterThan(0.3)
  })
})
