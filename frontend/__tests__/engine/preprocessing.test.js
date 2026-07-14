import { describe, it, expect } from 'vitest'
import { mapColumns, filterMotile, parseCSVText, preprocessCSV, validateFeatures, normKey } from '../../src/engine/preprocessing.js'

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

  it('skips CASA preamble/metadata rows before the header', () => {
    const csv = [
      'Sample: WT_mouse1',
      'Date: 2026-07-14',
      'Software: CASA v3.2',
      '',
      'Type,VCL,VSL,ALH,BCF',
      '99,120,80,3.5,12',
    ].join('\n')
    const { rows } = parseCSVText(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].VCL).toBe(120)
    expect(rows[0].Type).toBe(99)
  })
})

describe('real-data header robustness (mapColumns)', () => {
  // Micro sign U+00B5 is what most Windows/CASA exports actually emit,
  // NOT Greek mu U+03BC that the config table is written with.
  it('maps headers using the micro sign µ (U+00B5)', () => {
    const rows = [{ '種別': 99, '曲線速度[µm/秒]': 120, '直線速度[µm/秒]': 80, '頭部振幅[µm]': 3.5, '頭部振動数[Hz]': 12 }]
    const mapped = mapColumns(rows)
    expect(mapped[0].VCL).toBe(120)
    expect(mapped[0].VSL).toBe(80)
    expect(mapped[0].ALH).toBe(3.5)
  })

  it('maps romanized "um" unit headers', () => {
    const rows = [{ '種別': 99, '曲線速度[um/秒]': 120, '直線速度[um/秒]': 80, '頭部振幅[um]': 3.5, '頭部振動数[Hz]': 12 }]
    const mapped = mapColumns(rows)
    expect(mapped[0].VCL).toBe(120)
    expect(mapped[0].ALH).toBe(3.5)
  })

  it('maps full-width bracket headers', () => {
    const rows = [{ '種別': 99, '曲線速度［μm／秒］': 120, '直線速度［μm／秒］': 80 }]
    const mapped = mapColumns(rows)
    expect(mapped[0].VCL).toBe(120)
    expect(mapped[0].VSL).toBe(80)
  })

  it('maps English headers that carry units', () => {
    const rows = [{ Type: 99, 'VCL [µm/s]': 120, 'VSL [µm/s]': 80, 'ALH [µm]': 3.5, 'BCF [Hz]': 12 }]
    const mapped = mapColumns(rows)
    expect(mapped[0].VCL).toBe(120)
    expect(mapped[0].BCF).toBe(12)
  })

  it('normKey collapses µ, μ and um variants to the same key', () => {
    expect(normKey('曲線速度[µm/秒]')).toBe(normKey('曲線速度[μm/秒]'))
    expect(normKey('VCL [µm/s]')).toBe('vcl')
  })
})

describe('filterMotile tolerance', () => {
  it('treats string "99" and 99.0 as motile', () => {
    const rows = [{ Type: '99', VCL: 1 }, { Type: 99.0, VCL: 2 }, { Type: '0', VCL: 3 }]
    expect(filterMotile(rows)).toHaveLength(2)
  })
})

describe('preprocessCSV end-to-end', () => {
  it('parses a dirty real-world CASA export (preamble + µ sign + Shift-JIS-style headers)', () => {
    const csv = [
      'Measurement Report',
      'Sample,WT_mouse1',
      '',
      '番号,種別,曲線速度[µm/秒],直線速度[µm/秒],平均速度[µm/秒],直線性,直進性,曲線性,頭部振幅[µm],頭部振動数[Hz]',
      '1,99,180,90,120,0.5,0.75,0.66,3.5,12',
      '2,99,60,40,50,0.6,0.8,0.7,2.1,9',
      '3,0,10,2,5,0.2,0.3,0.4,0.5,2',
    ].join('\n')
    const { data, totalSperm, motileSperm, error } = preprocessCSV(csv, { mouseId: 'WT_01', group: 'WT' })
    expect(error).toBeUndefined()
    expect(totalSperm).toBe(3)
    expect(motileSperm).toBe(2)
    expect(data[0].VCL).toBe(180)
    expect(data[0].Mouse).toBe('WT_01')
    expect(data[0].Group).toBe('WT')
  })

  it('returns an actionable error when a required column is missing', () => {
    const csv = 'Type,VCL,VSL,ALH\n99,120,80,3.5' // no BCF
    const { error, data } = preprocessCSV(csv, { mouseId: 'm1', group: 'WT' })
    expect(data).toHaveLength(0)
    expect(error).toMatch(/BCF/)
  })

  it('returns an actionable error when nothing is motile', () => {
    const csv = 'Type,VCL,VSL,ALH,BCF\n0,120,80,3.5,12\n1,60,40,2,9'
    const { error } = preprocessCSV(csv, { mouseId: 'm1', group: 'WT' })
    expect(error).toMatch(/motile/i)
  })
})

describe('validateFeatures', () => {
  it('passes when all t-SNE features are present and numeric', () => {
    expect(validateFeatures([{ VCL: 1, VSL: 2, ALH: 3, BCF: 4 }])).toBeNull()
  })
  it('names the missing feature columns', () => {
    const msg = validateFeatures([{ VCL: 1, VSL: 2 }])
    expect(msg).toMatch(/ALH/)
    expect(msg).toMatch(/BCF/)
  })
})
