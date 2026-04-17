import { describe, it, expect } from 'vitest'
import {
  trainFertilityAxis, projectOnAxis, summarizeScoresByMouse, coEmbed,
} from '../../src/engine/crossSpecies.js'

function gauss(m, s) {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function makeRefs() {
  // Two well-separated classes in 2D feature space (VCL, VSL).
  const fertile = Array.from({ length: 60 }, () => ({
    Group: 'fertile', Mouse: 'F', VCL: gauss(100, 5), VSL: gauss(60, 3),
  }))
  const subfertile = Array.from({ length: 60 }, () => ({
    Group: 'subfertile', Mouse: 'S', VCL: gauss(40, 5), VSL: gauss(15, 3),
  }))
  return [...fertile, ...subfertile]
}

describe('trainFertilityAxis', () => {
  it('separates clearly distinct classes with high accuracy', () => {
    const rows = makeRefs()
    const axis = trainFertilityAxis(rows, ['VCL', 'VSL'], 'fertile', 'subfertile')
    expect(axis.accuracy).toBeGreaterThan(0.95)
    expect(axis.weights.length).toBe(2)
    // Unit vector
    const norm = Math.sqrt(axis.weights.reduce((s, v) => s + v * v, 0))
    expect(norm).toBeCloseTo(1, 5)
    expect(axis.distances.separation).toBeGreaterThan(0)
  })

  it('throws when a class has fewer than 2 cells', () => {
    expect(() => trainFertilityAxis(
      [{ Group: 'fertile', VCL: 100, VSL: 60 }, { Group: 'subfertile', VCL: 40, VSL: 15 }, { Group: 'subfertile', VCL: 42, VSL: 16 }],
      ['VCL', 'VSL'], 'fertile', 'subfertile',
    )).toThrow(/at least 2/)
  })
})

describe('projectOnAxis', () => {
  it('places fertile-like cells above 0 and subfertile-like cells below 0', () => {
    const rows = makeRefs()
    const axis = trainFertilityAxis(rows, ['VCL', 'VSL'], 'fertile', 'subfertile')

    const fertileLike = projectOnAxis(
      [{ VCL: 100, VSL: 60 }, { VCL: 105, VSL: 62 }], axis,
    )
    const subfLike = projectOnAxis(
      [{ VCL: 40, VSL: 15 }, { VCL: 38, VSL: 14 }], axis,
    )

    expect(fertileLike.every(r => r.score > 0)).toBe(true)
    expect(subfLike.every(r => r.score < 0)).toBe(true)
    expect(fertileLike.every(r => r.prob > 0.5)).toBe(true)
    expect(subfLike.every(r => r.prob < 0.5)).toBe(true)
  })
})

describe('summarizeScoresByMouse', () => {
  it('aggregates per-mouse mean / SD / fraction-positive', () => {
    const rows = [
      { Mouse: 'WT_1', Group: 'WT' }, { Mouse: 'WT_1', Group: 'WT' }, { Mouse: 'WT_1', Group: 'WT' },
      { Mouse: 'KO_1', Group: 'KO' }, { Mouse: 'KO_1', Group: 'KO' },
    ]
    const scores = [
      { score: 1.0, prob: 0.73 }, { score: 1.5, prob: 0.82 }, { score: 0.5, prob: 0.62 },
      { score: -1.0, prob: 0.27 }, { score: -2.0, prob: 0.12 },
    ]
    const out = summarizeScoresByMouse(rows, scores)
    expect(out.WT_1.n).toBe(3)
    expect(out.WT_1.meanScore).toBeCloseTo(1.0, 5)
    expect(out.WT_1.fracPos).toBe(1)
    expect(out.WT_1.group).toBe('WT')
    expect(out.KO_1.fracPos).toBe(0)
    expect(out.KO_1.meanScore).toBeLessThan(0)
  })
})

describe('coEmbed', () => {
  it('returns a t-SNE embedding over the union with per-source indices', () => {
    const human = Array.from({ length: 15 }, (_, i) => ({ VCL: 90 + i, VSL: 50 + i, ALH: 3, BCF: 15 }))
    const mouse = Array.from({ length: 15 }, (_, i) => ({ VCL: 200 + i, VSL: 110 + i, ALH: 5, BCF: 10 }))
    const result = coEmbed(
      [{ rows: human, label: 'human' }, { rows: mouse, label: 'mouse' }],
      ['VCL', 'VSL', 'ALH', 'BCF'],
      { standardizePerSource: true },
    )
    expect(result.embedding.length).toBe(30)
    expect(result.embedding[0].length).toBe(2)
    expect(result.indices.human).toEqual([0, 15])
    expect(result.indices.mouse).toEqual([15, 30])
    expect(result.labels.filter(l => l === 'human').length).toBe(15)
  })
})
