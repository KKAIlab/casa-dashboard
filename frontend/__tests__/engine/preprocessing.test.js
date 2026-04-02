import { describe, it, expect } from 'vitest'
import { mapColumns, filterMotile, parseCSVText } from '../../src/engine/preprocessing.js'

describe('mapColumns', () => {
  it('maps Japanese column names to English', () => {
    const rows = [
      { '種別': 99, '曲線速度[μm/秒]': 120, '直線速度[μm/秒]': 80, '頭部振幅[μm]': 3.5, '頭部振動数[Hz]': 12 },
    ]
    const mapped = mapColumns(rows)
    expect(mapped[0].Type).toBe(99)
    expect(mapped[0].VCL).toBe(120)
    expect(mapped[0].VSL).toBe(80)
    expect(mapped[0].ALH).toBe(3.5)
    expect(mapped[0].BCF).toBe(12)
  })

  it('passes through already-English columns', () => {
    const rows = [{ Type: 99, VCL: 100, VSL: 60, ALH: 2, BCF: 10 }]
    const mapped = mapColumns(rows)
    expect(mapped[0].VCL).toBe(100)
  })
})

describe('filterMotile', () => {
  it('keeps only Type=99 rows', () => {
    const rows = [
      { Type: 99, VCL: 100 },
      { Type: 0, VCL: 50 },
      { Type: 99, VCL: 120 },
      { Type: 1, VCL: 30 },
    ]
    const motile = filterMotile(rows)
    expect(motile).toHaveLength(2)
    expect(motile.every(r => r.Type === 99)).toBe(true)
  })

  it('returns empty array when no motile sperm', () => {
    const rows = [{ Type: 0, VCL: 50 }]
    expect(filterMotile(rows)).toHaveLength(0)
  })
})

describe('parseCSVText', () => {
  it('parses UTF-8 CSV text', () => {
    const csv = 'Type,VCL,VSL,ALH,BCF\n99,120,80,3.5,12\n0,50,30,1.0,5'
    const { rows, errors } = parseCSVText(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(2)
    expect(rows[0].VCL).toBe(120)
  })

  it('handles header-only CSV', () => {
    const csv = 'Type,VCL,VSL\n'
    const { rows } = parseCSVText(csv)
    expect(rows).toHaveLength(0)
  })
})
