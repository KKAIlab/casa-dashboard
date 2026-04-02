import { describe, it, expect } from 'vitest'
import { CONFIG } from '../../src/engine/config.js'

describe('CONFIG', () => {
  it('has correct CASA params', () => {
    expect(CONFIG.ALL_CASA_PARAMS).toEqual(['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF'])
  })

  it('has correct t-SNE features', () => {
    expect(CONFIG.TSNE_FEATURES).toEqual(['VCL', 'VSL', 'ALH', 'BCF'])
  })

  it('has correct clustering params', () => {
    expect(CONFIG.N_CLUSTERS).toBe(5)
    expect(CONFIG.RANDOM_STATE).toBe(42)
  })

  it('maps Japanese column names', () => {
    expect(CONFIG.COLUMN_MAPPING['曲線速度[μm/秒]']).toBe('VCL')
    expect(CONFIG.COLUMN_MAPPING['種別']).toBe('Type')
  })

  it('has perplexity candidates', () => {
    expect(CONFIG.TSNE_PERPLEXITIES).toEqual([5, 10, 30, 50, 100])
  })
})
