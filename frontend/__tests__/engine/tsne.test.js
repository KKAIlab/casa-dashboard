import { describe, it, expect } from 'vitest'
import { runTsne } from '../../src/engine/tsne.js'

describe('runTsne', () => {
  it('returns 2D embedding of correct shape', () => {
    const data = Array.from({ length: 30 }, (_, i) => [
      Math.sin(i), Math.cos(i), Math.sin(i * 2), Math.cos(i * 2),
    ])
    const embedding = runTsne(data)
    expect(embedding).toHaveLength(30)
    expect(embedding[0]).toHaveLength(2)
  })

  it('is deterministic with same input', () => {
    const data = Array.from({ length: 20 }, (_, i) => [i, i * 2, i * 3, i * 0.5])
    const a = runTsne(data)
    const b = runTsne(data)
    expect(a).toEqual(b)
  })

  it('handles small datasets (n < smallest perplexity)', () => {
    const data = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]
    const embedding = runTsne(data)
    expect(embedding).toHaveLength(3)
    expect(embedding[0]).toHaveLength(2)
  })
})
