import { describe, it, expect } from 'vitest'
import {
  rowsToCSV, baselineStatsToRows, motilitySummaryToRows,
  clusterPropsToRows, comparisonToRows,
} from '../../src/engine/exporter.js'

describe('rowsToCSV', () => {
  it('returns empty string for empty input', () => {
    expect(rowsToCSV([])).toBe('')
    expect(rowsToCSV(null)).toBe('')
  })
  it('produces CSV with header row', () => {
    const csv = rowsToCSV([{ a: 1, b: 'x' }, { a: 2, b: 'y' }])
    expect(csv.split(/\r?\n/)[0]).toBe('a,b')
    expect(csv).toContain('1,x')
    expect(csv).toContain('2,y')
  })
})

describe('baseline / motility / cluster row converters', () => {
  it('flattens baseline stats keyed by mouse', () => {
    const rows = baselineStatsToRows({ M1: { n: 5, VCL_mean: 100 } })
    expect(rows[0]).toEqual({ Mouse: 'M1', n: 5, VCL_mean: 100 })
  })
  it('flattens motility summary', () => {
    const rows = motilitySummaryToRows({ M1: { n: 10, PR_pct: 50 } })
    expect(rows[0].Mouse).toBe('M1')
    expect(rows[0].PR_pct).toBe(50)
  })
  it('flattens cluster proportions', () => {
    const rows = clusterPropsToRows({ M1: { 0: 50, 1: 50 } })
    expect(rows[0]).toEqual({ Mouse: 'M1', 0: 50, 1: 50 })
  })
})

describe('comparisonToRows', () => {
  it('flattens comparison output and labels significance', () => {
    const cmp = { VCL: { meanA: 100, meanB: 80, nA: 5, nB: 5, tStat: 4, df: 8, pValue: 0.001 } }
    const rows = comparisonToRows(cmp, 'WT', 'KO')
    expect(rows[0].Parameter).toBe('VCL')
    expect(rows[0].WT_mean).toBe(100)
    expect(rows[0].KO_mean).toBe(80)
    expect(rows[0].significant).toBe('yes')
  })
})
