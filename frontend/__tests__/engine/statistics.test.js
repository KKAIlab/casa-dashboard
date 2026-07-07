import { describe, it, expect } from 'vitest'
import { computeBaselineStats, computeClusterProportions, welchTTest, adjustPValuesBH, compareGroups } from '../../src/engine/statistics.js'

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

describe('adjustPValuesBH', () => {
  it('matches R p.adjust(method="BH") on a known vector', () => {
    // p.adjust(c(0.01, 0.02, 0.03, 0.04, 0.05), "BH") =
    //   0.05 0.05 0.05 0.05 0.05
    const adj = adjustPValuesBH([0.01, 0.02, 0.03, 0.04, 0.05])
    for (const q of adj) expect(q).toBeCloseTo(0.05, 10)
  })

  it('enforces monotonicity and caps at 1', () => {
    // p.adjust(c(0.001, 0.5, 0.9), "BH") = 0.003 0.75 0.9
    const adj = adjustPValuesBH([0.001, 0.5, 0.9])
    expect(adj[0]).toBeCloseTo(0.003, 10)
    expect(adj[1]).toBeCloseTo(0.75, 10)
    expect(adj[2]).toBeCloseTo(0.9, 10)
  })

  it('passes NaN p-values through and excludes them from m', () => {
    const adj = adjustPValuesBH([0.01, NaN, 0.02])
    // m = 2 valid tests: 0.01*2/1=0.02, 0.02*2/2=0.02 → both 0.02
    expect(adj[0]).toBeCloseTo(0.02, 10)
    expect(Number.isNaN(adj[1])).toBe(true)
    expect(adj[2]).toBeCloseTo(0.02, 10)
  })
})

describe('compareGroups adds BH-adjusted p-values', () => {
  it('attaches pAdjusted >= pValue for each parameter', () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => ({ Group: 'WT', VCL: 100 + i, VSL: 70 + i })),
      ...Array.from({ length: 8 }, (_, i) => ({ Group: 'KO', VCL: 60 + i, VSL: 40 + i })),
    ]
    const out = compareGroups(rows, 'WT', 'KO', ['VCL', 'VSL'])
    expect(out.VCL.pAdjusted).toBeGreaterThanOrEqual(out.VCL.pValue)
    expect(out.VSL.pAdjusted).toBeGreaterThanOrEqual(out.VSL.pValue)
  })
})
