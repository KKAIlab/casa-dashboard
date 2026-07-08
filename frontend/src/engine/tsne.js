/**
 * t-SNE implementation (self-contained, no external dependency).
 * Uses Barnes-Hut style gradient descent with a seeded PRNG for determinism.
 */

import { standardize } from './clustering.js'
import { CONFIG } from './config.js'

// Mulberry32 seeded PRNG — same generator used in clustering.js
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Compute squared Euclidean distance matrix
function squaredDistances(X) {
  const n = X.length
  const D = Array.from({ length: n }, () => new Float64Array(n))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let d = 0
      for (let k = 0; k < X[i].length; k++) {
        const diff = X[i][k] - X[j][k]
        d += diff * diff
      }
      D[i][j] = d
      D[j][i] = d
    }
  }
  return D
}

// Binary search for sigma such that entropy of P_i equals log(perplexity)
function computePi(Di, perplexity, tol = 1e-5, maxIter = 50) {
  const n = Di.length
  const logU = Math.log(perplexity)
  let betaMin = -Infinity
  let betaMax = Infinity
  let beta = 1.0

  let Pi = new Float64Array(n)
  let H = 0

  for (let iter = 0; iter < maxIter; iter++) {
    let sumP = 0
    for (let j = 0; j < n; j++) {
      Pi[j] = Math.exp(-Di[j] * beta)
      sumP += Pi[j]
    }
    if (sumP === 0) sumP = 1e-300

    H = 0
    for (let j = 0; j < n; j++) {
      Pi[j] /= sumP
      if (Pi[j] > 1e-300) H -= Pi[j] * Math.log(Pi[j])
    }

    const Hdiff = H - logU
    if (Math.abs(Hdiff) < tol) break

    if (Hdiff > 0) {
      betaMin = beta
      beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2
    } else {
      betaMax = beta
      beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2
    }
  }

  return Pi
}

// Compute joint probability matrix P symmetrized
function computeP(X, perplexity) {
  const n = X.length
  const D = squaredDistances(X)
  const P = Array.from({ length: n }, () => new Float64Array(n))

  for (let i = 0; i < n; i++) {
    // Exclude diagonal (self-distance stays 0)
    const Di = new Float64Array(n)
    for (let j = 0; j < n; j++) Di[j] = j === i ? Infinity : D[i][j]
    const Pi = computePi(Di, perplexity)
    for (let j = 0; j < n; j++) P[i][j] = Pi[j]
  }

  // Symmetrize: P_ij = (P_i|j + P_j|i) / (2n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      P[i][j] = (P[i][j] + P[j][i]) / (2 * n)
    }
  }

  // Clamp minimum to avoid numerical issues
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      P[i][j] = Math.max(P[i][j], 1e-12)
    }
  }

  return P
}

// Run t-SNE gradient descent and return { embedding, kl }
export function tsneRun(X, perplexity, seed, maxIter, learningRate = 200) {
  const n = X.length
  const rng = mulberry32(seed)

  const P = computeP(X, perplexity)

  // Early exaggeration: multiply P by 4 for first 100 iters
  const P_ex = P.map(row => row.map(v => v * 4))

  // Initialize Y randomly (small values)
  let Y = Array.from({ length: n }, () => [
    (rng() - 0.5) * 0.0001,
    (rng() - 0.5) * 0.0001,
  ])
  let Yprev = Y.map(r => [...r])

  // Momentum schedule
  const momentum = iter => iter < 250 ? 0.5 : 0.8

  const gains = Array.from({ length: n }, () => [1.0, 1.0])
  let iY = Array.from({ length: n }, () => [0, 0])

  for (let iter = 0; iter < maxIter; iter++) {
    const Pcur = iter < 100 ? P_ex : P

    // Compute Q (Student t-distribution kernel)
    const num = Array.from({ length: n }, () => new Float64Array(n))
    let sumQ = 0
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dy0 = Y[i][0] - Y[j][0]
        const dy1 = Y[i][1] - Y[j][1]
        const v = 1 / (1 + dy0 * dy0 + dy1 * dy1)
        num[i][j] = v
        num[j][i] = v
        sumQ += 2 * v
      }
    }
    if (sumQ === 0) sumQ = 1e-300

    // Compute gradient
    const dY = Array.from({ length: n }, () => [0, 0])
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const q = num[i][j] / sumQ
        const mult = 4 * (Pcur[i][j] - q) * num[i][j]
        dY[i][0] += mult * (Y[i][0] - Y[j][0])
        dY[i][1] += mult * (Y[i][1] - Y[j][1])
      }
    }

    // Update with momentum and adaptive learning rate (gain)
    const mom = momentum(iter)
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < 2; d++) {
        const sameSign = Math.sign(dY[i][d]) === Math.sign(iY[i][d])
        gains[i][d] = sameSign ? Math.max(gains[i][d] * 0.8, 0.01)
                                : gains[i][d] + 0.2
        iY[i][d] = mom * iY[i][d] - learningRate * gains[i][d] * dY[i][d]
        Y[i][d] += iY[i][d]
      }
    }

    // Zero-mean
    let m0 = 0, m1 = 0
    for (let i = 0; i < n; i++) { m0 += Y[i][0]; m1 += Y[i][1] }
    m0 /= n; m1 /= n
    for (let i = 0; i < n; i++) { Y[i][0] -= m0; Y[i][1] -= m1 }
  }

  // Compute KL divergence for quality comparison
  const num = Array.from({ length: n }, () => new Float64Array(n))
  let sumQ = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dy0 = Y[i][0] - Y[j][0]
      const dy1 = Y[i][1] - Y[j][1]
      const v = 1 / (1 + dy0 * dy0 + dy1 * dy1)
      num[i][j] = v; num[j][i] = v
      sumQ += 2 * v
    }
  }
  if (sumQ === 0) sumQ = 1e-300

  let kl = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const q = Math.max(num[i][j] / sumQ, 1e-12)
      kl += P[i][j] * Math.log(P[i][j] / q)
    }
  }

  return { embedding: Y, kl }
}

/**
 * Run t-SNE on a 2D array of features.
 * @param {number[][]} features - (n_samples x n_features)
 * @param {Function} [onProgress] - optional callback(doneCount, total)
 * @returns {number[][]} - (n_samples x 2) embedding
 */
export function runTsne(features, onProgress) {
  const scaled = standardize(features)
  const n = features.length

  const candidates = CONFIG.TSNE_PERPLEXITIES.filter(p => p < n)
  let perplexities = candidates.length > 0 ? candidates : [Math.max(1, Math.floor((n - 1) / 2))]

  // t-SNE is O(n²) per iteration × perplexity-sweep × maxIter. For large n,
  // trying every perplexity freezes the main thread for minutes. Keep the
  // full sweep only for small n; for big embeddings pick two reasonable
  // perplexities (≈5%–10% of n, clamped) so a co-embedding of ~800 cells
  // finishes in a few seconds.
  if (n > 300) {
    const pick1 = Math.max(10, Math.min(30, Math.floor(n * 0.05)))
    const pick2 = Math.max(pick1 + 10, Math.min(60, Math.floor(n * 0.1)))
    perplexities = [pick1, pick2].filter(p => p < n)
    if (perplexities.length === 0) perplexities = [Math.floor((n - 1) / 2)]
  }

  // For speed in tests and production, limit iterations based on dataset size.
  // Large co-embeddings also cap harder so we don't freeze the UI.
  const iterCap = n > 500 ? 500 : n > 100 ? 1000 : 300
  const maxIter = Math.min(CONFIG.TSNE_MAX_ITER, iterCap)

  let bestEmbedding = null
  let bestKL = Infinity

  perplexities.forEach((perplexity, idx) => {
    const { embedding, kl } = tsneRun(scaled, perplexity, CONFIG.RANDOM_STATE, maxIter)

    if (kl < bestKL) {
      bestKL = kl
      bestEmbedding = embedding
    }

    if (onProgress) onProgress(idx + 1, perplexities.length)
  })

  return bestEmbedding
}
