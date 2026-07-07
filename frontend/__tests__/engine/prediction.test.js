import { describe, it, expect } from 'vitest'
import { classifyByProportions, computeDensityScore } from '../../src/engine/prediction.js'

describe('classifyByProportions', () => {
  it('classifies high-motility sample as fertile', () => {
    const reference = [
      { label: 'fertile', proportions: { 0: 40, 1: 25, 2: 15, 3: 10, 4: 10 } },
      { label: 'fertile', proportions: { 0: 45, 1: 20, 2: 15, 3: 12, 4: 8 } },
      { label: 'subfertile', proportions: { 0: 10, 1: 10, 2: 15, 3: 40, 4: 25 } },
      { label: 'subfertile', proportions: { 0: 8, 1: 12, 2: 10, 3: 45, 4: 25 } },
    ]
    const sample = { 0: 42, 1: 22, 2: 16, 3: 11, 4: 9 }
    const result = classifyByProportions(sample, reference)
    expect(result.prediction).toBe('fertile')
    expect(result.probability).toBeGreaterThan(0.5)
  })
})

describe('computeDensityScore', () => {
  it('returns high score for similar distributions', () => {
    const sample = [[0, 0], [1, 1], [2, 2], [0.5, 0.5]]
    const reference = [[0, 0], [1, 1], [2, 2], [0.3, 0.3]]
    const score = computeDensityScore(sample, reference)
    expect(score.similarityScore).toBeGreaterThan(50)
    expect(score.jsDivergence).toBeGreaterThanOrEqual(0)
  })

  it('returns low score for very different distributions', () => {
    const sample = [[0, 0], [1, 0], [0, 1]]
    const reference = [[100, 100], [101, 100], [100, 101]]
    const score = computeDensityScore(sample, reference)
    expect(score.similarityScore).toBeLessThan(50)
  })

  it('scores fully-disjoint distributions near 0 (normalized JSD)', () => {
    // Two histograms with no overlapping bins → JSD = ln 2. After normalizing
    // by ln 2 the similarity score must approach 0, not floor at ~31.
    const sample = [[0, 0], [0, 0], [0, 0], [0, 0]]
    const reference = [[1000, 1000], [1000, 1000], [1000, 1000], [1000, 1000]]
    const score = computeDensityScore(sample, reference)
    expect(score.similarityScore).toBeLessThan(1)
  })

  it('scores identical distributions at 100', () => {
    const pts = [[0, 0], [1, 1], [2, 2], [3, 3]]
    const score = computeDensityScore(pts, pts)
    expect(score.similarityScore).toBeGreaterThan(99.9)
  })
})
