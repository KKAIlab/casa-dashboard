import { describe, it, expect } from 'vitest'
import { compareGroups } from '../../src/engine/statistics.js'

describe('compareGroups', () => {
  it('runs Welch t-test per parameter across two groups', () => {
    const rows = [
      ...Array.from({ length: 10 }, () => ({ Group: 'WT', VCL: 100 + Math.random(), VSL: 70 + Math.random() })),
      ...Array.from({ length: 10 }, () => ({ Group: 'KO', VCL: 50 + Math.random(),  VSL: 30 + Math.random() })),
    ]
    const out = compareGroups(rows, 'WT', 'KO', ['VCL', 'VSL'])
    expect(out.VCL.nA).toBe(10)
    expect(out.VCL.nB).toBe(10)
    expect(out.VCL.meanA).toBeGreaterThan(out.VCL.meanB)
    expect(out.VCL.pValue).toBeLessThan(0.001)
    expect(out.VSL.pValue).toBeLessThan(0.001)
  })

  it('returns NaN tStat when a group has fewer than 2 samples', () => {
    const rows = [
      { Group: 'WT', VCL: 100 },
      { Group: 'KO', VCL: 50 }, { Group: 'KO', VCL: 55 }, { Group: 'KO', VCL: 52 },
    ]
    const out = compareGroups(rows, 'WT', 'KO', ['VCL'])
    expect(Number.isNaN(out.VCL.tStat)).toBe(true)
  })
})
