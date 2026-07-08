import { describe, it, expect } from 'vitest'
import { runTsne, tsneRun } from '../../src/engine/tsne.js'
import { standardize } from '../../src/engine/clustering.js'

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

  // Regression guard for review finding H2. The perplexity sweep selects the run
  // with the lowest final KL. It was hypothesized this biases toward the SMALLEST
  // perplexity (which would defeat the sweep). Empirically the opposite holds:
  // the smallest perplexity yields the HIGHEST KL, so min-KL selection favors a
  // moderate/large perplexity — a benign default, not a bug. This test pins that
  // behavior so a future change to the kernel/schedule can't silently reintroduce
  // the degenerate case without failing here.
  it('min-KL selection does not collapse onto the smallest perplexity', () => {
    // three well-separated 4D gaussian blobs, deterministic (no Math.random)
    let s = 12345
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
    const centers = [[0, 0, 0, 0], [8, 8, 2, 2], [-6, 4, -3, 5]]
    const raw = Array.from({ length: 120 }, (_, i) =>
      centers[i % 3].map(v => v + (rnd() - 0.5) * 3))
    const X = standardize(raw)
    const candidates = [5, 10, 30, 50, 100].filter(p => p < X.length)
    const kls = candidates.map(p => ({ p, kl: tsneRun(X, p, 42, 300).kl }))
    const picked = kls.reduce((a, b) => (b.kl < a.kl ? b : a)).p
    const smallest = Math.min(...candidates)
    expect(picked).not.toBe(smallest)
    // and the smallest perplexity is in fact the worst (highest KL)
    const worst = kls.reduce((a, b) => (b.kl > a.kl ? b : a)).p
    expect(worst).toBe(smallest)
  })
})
