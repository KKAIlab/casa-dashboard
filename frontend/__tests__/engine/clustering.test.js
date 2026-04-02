import { describe, it, expect } from 'vitest'
import { kmeans, standardize } from '../../src/engine/clustering.js'

describe('standardize', () => {
  it('z-score normalizes columns', () => {
    const data = [[10, 100], [20, 200], [30, 300]]
    const result = standardize(data)
    const col0Mean = result.reduce((s, r) => s + r[0], 0) / result.length
    expect(Math.abs(col0Mean)).toBeLessThan(1e-10)
  })

  it('handles single-row input', () => {
    const data = [[5, 10]]
    const result = standardize(data)
    expect(result).toEqual([[0, 0]])
  })
})

describe('kmeans', () => {
  it('returns correct number of clusters', () => {
    const data = [
      [0, 0], [1, 0], [0, 1],
      [10, 10], [11, 10], [10, 11],
      [20, 0], [21, 0], [20, 1],
    ]
    const labels = kmeans(data, 3, 42)
    expect(new Set(labels).size).toBe(3)
    expect(labels[0]).toBe(labels[1])
    expect(labels[0]).toBe(labels[2])
    expect(labels[3]).toBe(labels[4])
    expect(labels[3]).toBe(labels[5])
  })

  it('handles k > n_samples', () => {
    const data = [[1, 2], [3, 4]]
    const labels = kmeans(data, 5, 42)
    expect(labels).toHaveLength(2)
  })

  it('is deterministic with same seed', () => {
    const data = Array.from({ length: 50 }, (_, i) => [Math.sin(i), Math.cos(i)])
    const a = kmeans(data, 3, 42)
    const b = kmeans(data, 3, 42)
    expect(a).toEqual(b)
  })
})
