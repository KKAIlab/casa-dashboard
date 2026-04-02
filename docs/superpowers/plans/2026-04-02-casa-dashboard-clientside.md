# CASA Dashboard Client-Side Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate casa-dashboard from React+FastAPI to a pure client-side app deployable on GitHub Pages.

**Architecture:** Replace Python backend with JS engine modules (druid.js for t-SNE, custom K-Means, jstat for statistics). Use IndexedDB for persistent storage. Deploy via GitHub Actions CI.

**Tech Stack:** React 19, Vite 8, Plotly.js, druid.js, PapaParse, idb, jstat, Vitest, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-04-02-casa-dashboard-clientside-design.md`

---

## File Structure

### New files

```
frontend/
├── src/
│   ├── engine/
│   │   ├── config.js          — fixed analysis parameters
│   │   ├── preprocessing.js   — CSV parse, column map, motile filter
│   │   ├── tsne.js            — t-SNE via druid.js
│   │   ├── clustering.js      — K-Means implementation
│   │   ├── statistics.js      — descriptive stats + Welch's t-test
│   │   ├── prediction.js      — cluster classifier + density scoring
│   │   └── pipeline.js        — orchestrates full analysis
│   ├── db/
│   │   └── index.js           — IndexedDB via idb
│   └── hooks/
│       ├── useDB.js           — database operations hook
│       └── useEngine.js       — analysis engine hook
├── __tests__/
│   ├── engine/
│   │   ├── preprocessing.test.js
│   │   ├── tsne.test.js
│   │   ├── clustering.test.js
│   │   ├── statistics.test.js
│   │   ├── prediction.test.js
│   │   └── pipeline.test.js
│   └── db/
│       └── db.test.js
├── vitest.config.js
.github/
└── workflows/
    └── deploy.yml
```

### Modified files

```
frontend/package.json            — add deps
frontend/vite.config.js          — add base path
frontend/src/App.jsx             — remove BrowserRouter → HashRouter
frontend/src/context/AppContext.jsx — integrate IndexedDB
frontend/src/components/FileUploader.jsx — client-side parsing
frontend/src/components/DataTable.jsx — adapt field names
frontend/src/pages/Dashboard.jsx — useDB instead of useApi
frontend/src/pages/DataManagement.jsx — useDB + useEngine
frontend/src/pages/Analysis.jsx  — useDB + useEngine
frontend/src/pages/Prediction.jsx — useDB + useEngine
frontend/src/components/ProgressBar.jsx — support engine progress
```

### Deleted files

```
index.html         (root — old static dashboard)
rwt-rko.html       (root — old static t-SNE page)
```

---

## Task 1: Project Setup

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`

- [ ] **Step 1: Install dependencies**

```bash
cd frontend
npm install papaparse idb jstat druidjs
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create vitest config**

Create `frontend/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```

- [ ] **Step 3: Add test script to package.json**

In `frontend/package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify setup**

```bash
cd frontend && npx vitest run --passWithNoTests
```

Expected: "No test files found" or PASS with 0 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js
git commit -m "chore: add client-side engine dependencies and vitest setup"
```

---

## Task 2: Engine Config Module

**Files:**
- Create: `frontend/src/engine/config.js`
- Create: `frontend/__tests__/engine/config.test.js`

- [ ] **Step 1: Write the test**

Create `frontend/__tests__/engine/config.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run __tests__/engine/config.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `frontend/src/engine/config.js`:

```js
export const CONFIG = {
  COLUMN_MAPPING: {
    '番号': 'ID',
    '種別': 'Type',
    '座標数': 'Coord_count',
    '有効性': 'Valid',
    '直線速度[μm/秒]': 'VSL',
    '曲線速度[μm/秒]': 'VCL',
    '平均速度[μm/秒]': 'VAP',
    '直進性': 'STR',
    '直線性': 'LIN',
    '頭部振幅[μm]': 'ALH',
    '頭部振動数[Hz]': 'BCF',
    '曲線性': 'WOB',
  },

  MOTILE_TYPE: 99,

  ALL_CASA_PARAMS: ['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF'],

  TSNE_FEATURES: ['VCL', 'VSL', 'ALH', 'BCF'],

  TSNE_PERPLEXITIES: [5, 10, 30, 50, 100],
  TSNE_MAX_ITER: 1000,

  N_CLUSTERS: 5,
  KMEANS_N_INIT: 10,
  RANDOM_STATE: 42,
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run __tests__/engine/config.test.js
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/engine/config.js frontend/__tests__/engine/config.test.js
git commit -m "feat: add engine config module with fixed CASA parameters"
```

---

## Task 3: Preprocessing Module

**Files:**
- Create: `frontend/src/engine/preprocessing.js`
- Create: `frontend/__tests__/engine/preprocessing.test.js`

- [ ] **Step 1: Write the test**

Create `frontend/__tests__/engine/preprocessing.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run __tests__/engine/preprocessing.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `frontend/src/engine/preprocessing.js`:

```js
import Papa from 'papaparse'
import { CONFIG } from './config.js'

/**
 * Parse CSV text using PapaParse.
 * @param {string} text - Raw CSV content
 * @returns {{ rows: object[], errors: object[] }}
 */
export function parseCSVText(text) {
  const result = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })
  return { rows: result.data, errors: result.errors }
}

/**
 * Try multiple encodings to read a File as text.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function readFileText(file) {
  // Try UTF-8 first
  try {
    const text = await file.text()
    // Check if it looks valid (no replacement characters in first 500 chars)
    if (!text.slice(0, 500).includes('\ufffd')) return text
  } catch { /* fall through */ }

  // Try Shift-JIS
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file, 'Shift_JIS')
  })
}

/**
 * Map Japanese CASA column names to English.
 * @param {object[]} rows
 * @returns {object[]}
 */
export function mapColumns(rows) {
  const mapping = CONFIG.COLUMN_MAPPING
  const keys = Object.keys(mapping)
  return rows.map(row => {
    const mapped = { ...row }
    for (const jp of keys) {
      if (jp in mapped) {
        mapped[mapping[jp]] = mapped[jp]
        if (mapping[jp] !== jp) delete mapped[jp]
      }
    }
    return mapped
  })
}

/**
 * Filter to motile sperm only (Type === 99).
 * @param {object[]} rows
 * @returns {object[]}
 */
export function filterMotile(rows) {
  return rows.filter(r => r.Type === CONFIG.MOTILE_TYPE)
}

/**
 * Full preprocessing: parse CSV text → map columns → filter motile → add metadata.
 * @param {string} csvText
 * @param {{ mouseId: string, group: string }} meta
 * @returns {{ data: object[], totalSperm: number, motileSperm: number, error?: string }}
 */
export function preprocessCSV(csvText, meta = {}) {
  const { rows, errors } = parseCSVText(csvText)
  if (errors.length > 0 || rows.length === 0) {
    return { data: [], totalSperm: 0, motileSperm: 0, error: 'Failed to parse CSV' }
  }

  const mapped = mapColumns(rows)
  const totalSperm = mapped.length
  const motile = filterMotile(mapped)

  const data = motile.map(row => ({
    ...row,
    Mouse: meta.mouseId || 'unknown',
    Group: meta.group || 'unknown',
  }))

  return { data, totalSperm, motileSperm: data.length }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run __tests__/engine/preprocessing.test.js
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/engine/preprocessing.js frontend/__tests__/engine/preprocessing.test.js
git commit -m "feat: add preprocessing module with CSV parsing and motile filtering"
```

---

## Task 4: K-Means Clustering Module

**Files:**
- Create: `frontend/src/engine/clustering.js`
- Create: `frontend/__tests__/engine/clustering.test.js`

- [ ] **Step 1: Write the test**

Create `frontend/__tests__/engine/clustering.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { kmeans, standardize } from '../../src/engine/clustering.js'

describe('standardize', () => {
  it('z-score normalizes columns', () => {
    const data = [[10, 100], [20, 200], [30, 300]]
    const result = standardize(data)
    // Mean of each column should be ~0
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
    // 3 clearly separated groups
    const data = [
      [0, 0], [1, 0], [0, 1],       // cluster near origin
      [10, 10], [11, 10], [10, 11],  // cluster near (10,10)
      [20, 0], [21, 0], [20, 1],    // cluster near (20,0)
    ]
    const labels = kmeans(data, 3, 42)
    expect(new Set(labels).size).toBe(3)
    // Points in same group should have same label
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run __tests__/engine/clustering.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `frontend/src/engine/clustering.js`:

```js
/**
 * Seeded pseudo-random number generator (Mulberry32).
 * @param {number} seed
 * @returns {() => number} returns values in [0, 1)
 */
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/**
 * Z-score standardize a 2D array column-wise.
 * @param {number[][]} data - shape (n, d)
 * @returns {number[][]}
 */
export function standardize(data) {
  const n = data.length
  const d = data[0].length
  const means = new Array(d).fill(0)
  const stds = new Array(d).fill(0)

  for (let j = 0; j < d; j++) {
    for (let i = 0; i < n; i++) means[j] += data[i][j]
    means[j] /= n
    for (let i = 0; i < n; i++) stds[j] += (data[i][j] - means[j]) ** 2
    stds[j] = Math.sqrt(stds[j] / n) || 1 // avoid division by zero
  }

  return data.map(row => row.map((v, j) => (v - means[j]) / stds[j]))
}

/**
 * K-Means clustering with seeded random initialization.
 * @param {number[][]} data - shape (n, d)
 * @param {number} k - number of clusters
 * @param {number} seed - random seed
 * @param {number} nInit - number of initializations (default 10)
 * @param {number} maxIter - max iterations per init (default 100)
 * @returns {number[]} cluster labels
 */
export function kmeans(data, k, seed = 42, nInit = 10, maxIter = 100) {
  const n = data.length
  const d = data[0].length
  k = Math.min(k, n)

  const rng = mulberry32(seed)

  function dist(a, b) {
    let s = 0
    for (let j = 0; j < d; j++) s += (a[j] - b[j]) ** 2
    return s
  }

  function runOnce() {
    // Random init: pick k distinct indices
    const indices = []
    const used = new Set()
    while (indices.length < k) {
      const idx = Math.floor(rng() * n)
      if (!used.has(idx)) { used.add(idx); indices.push(idx) }
    }
    const centroids = indices.map(i => [...data[i]])
    const labels = new Array(n).fill(0)

    for (let iter = 0; iter < maxIter; iter++) {
      // Assign
      let changed = false
      for (let i = 0; i < n; i++) {
        let bestC = 0, bestD = Infinity
        for (let c = 0; c < k; c++) {
          const dd = dist(data[i], centroids[c])
          if (dd < bestD) { bestD = dd; bestC = c }
        }
        if (labels[i] !== bestC) { labels[i] = bestC; changed = true }
      }
      if (!changed) break

      // Update centroids
      const sums = Array.from({ length: k }, () => new Array(d).fill(0))
      const counts = new Array(k).fill(0)
      for (let i = 0; i < n; i++) {
        counts[labels[i]]++
        for (let j = 0; j < d; j++) sums[labels[i]][j] += data[i][j]
      }
      for (let c = 0; c < k; c++) {
        if (counts[c] === 0) continue
        for (let j = 0; j < d; j++) centroids[c][j] = sums[c][j] / counts[c]
      }
    }

    // Compute inertia
    let inertia = 0
    for (let i = 0; i < n; i++) inertia += dist(data[i], centroids[labels[i]])
    return { labels, inertia }
  }

  let best = null
  for (let init = 0; init < nInit; init++) {
    const result = runOnce()
    if (!best || result.inertia < best.inertia) best = result
  }

  return best.labels
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run __tests__/engine/clustering.test.js
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/engine/clustering.js frontend/__tests__/engine/clustering.test.js
git commit -m "feat: add K-Means clustering with seeded RNG"
```

---

## Task 5: t-SNE Module

**Files:**
- Create: `frontend/src/engine/tsne.js`
- Create: `frontend/__tests__/engine/tsne.test.js`

- [ ] **Step 1: Write the test**

Create `frontend/__tests__/engine/tsne.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { runTsne } from '../../src/engine/tsne.js'

describe('runTsne', () => {
  it('returns 2D embedding of correct shape', () => {
    // Generate simple test data: 30 points with 4 features
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run __tests__/engine/tsne.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `frontend/src/engine/tsne.js`:

```js
import { TSNE } from 'druidjs'
import { standardize } from './clustering.js'
import { CONFIG } from './config.js'

/**
 * Run t-SNE dimensionality reduction.
 * Tries multiple perplexities, returns embedding with lowest KL divergence.
 *
 * @param {number[][]} features - shape (n, d), raw feature values
 * @param {function} [onProgress] - optional callback(perplexityIndex, totalPerplexities)
 * @returns {number[][]} embedding - shape (n, 2)
 */
export function runTsne(features, onProgress) {
  const scaled = standardize(features)
  const n = features.length

  const candidates = CONFIG.TSNE_PERPLEXITIES.filter(p => p < n)
  const perplexities = candidates.length > 0 ? candidates : [Math.max(1, n - 1)]

  let bestEmbedding = null
  let bestKL = Infinity

  perplexities.forEach((perplexity, idx) => {
    const tsne = new TSNE(scaled, {
      d: 2,
      perplexity,
      seed: CONFIG.RANDOM_STATE,
    })

    // Run iterations
    const dr = tsne.transform()
    const embedding = dr.to2dArray ? dr.to2dArray() : Array.from(dr, row => Array.from(row))

    // druid.js TSNE exposes _kl_divergence after transform
    const kl = tsne._kl_divergence ?? Infinity

    if (kl < bestKL) {
      bestKL = kl
      bestEmbedding = embedding
    }

    if (onProgress) onProgress(idx + 1, perplexities.length)
  })

  return bestEmbedding
}
```

**Note:** The druid.js API may vary slightly between versions. The implementing engineer should verify the import path and constructor options against the installed version. If `TSNE` is not a named export, try `import druid from 'druidjs'` then use `druid.TSNE`. If the `_kl_divergence` property is not available, use the first valid perplexity (perplexity=30 as default).

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run __tests__/engine/tsne.test.js
```

Expected: PASS (3 tests). If druid.js API differs, adjust imports/constructor in step 3 and re-run.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/engine/tsne.js frontend/__tests__/engine/tsne.test.js
git commit -m "feat: add t-SNE module using druid.js"
```

---

## Task 6: Statistics Module

**Files:**
- Create: `frontend/src/engine/statistics.js`
- Create: `frontend/__tests__/engine/statistics.test.js`

- [ ] **Step 1: Write the test**

Create `frontend/__tests__/engine/statistics.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeBaselineStats, computeClusterProportions, welchTTest } from '../../src/engine/statistics.js'

describe('computeBaselineStats', () => {
  it('computes mean and std per mouse', () => {
    const data = [
      { Mouse: 'M1', VCL: 100, VSL: 60 },
      { Mouse: 'M1', VCL: 120, VSL: 80 },
      { Mouse: 'M2', VCL: 90, VSL: 50 },
    ]
    const stats = computeBaselineStats(data, ['VCL', 'VSL'])
    expect(stats.M1.n).toBe(2)
    expect(stats.M1.VCL_mean).toBe(110)
    expect(stats.M2.n).toBe(1)
    expect(stats.M2.VCL_mean).toBe(90)
  })
})

describe('computeClusterProportions', () => {
  it('computes cluster % per mouse', () => {
    const data = [
      { Mouse: 'M1', Cluster: 0 },
      { Mouse: 'M1', Cluster: 0 },
      { Mouse: 'M1', Cluster: 1 },
      { Mouse: 'M1', Cluster: 1 },
      { Mouse: 'M2', Cluster: 0 },
    ]
    const props = computeClusterProportions(data)
    expect(props.M1[0]).toBe(50)
    expect(props.M1[1]).toBe(50)
    expect(props.M2[0]).toBe(100)
  })
})

describe('welchTTest', () => {
  it('returns correct p-value for clearly different groups', () => {
    const a = [100, 110, 105, 95, 108]
    const b = [50, 55, 48, 52, 60]
    const result = welchTTest(a, b)
    expect(result.pValue).toBeLessThan(0.01)
    expect(result.tStat).toBeGreaterThan(0)
  })

  it('returns high p-value for similar groups', () => {
    const a = [100, 102, 98, 101, 99]
    const b = [100, 103, 97, 101, 100]
    const result = welchTTest(a, b)
    expect(result.pValue).toBeGreaterThan(0.3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run __tests__/engine/statistics.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `frontend/src/engine/statistics.js`:

```js
import jStat from 'jstat'

/**
 * Compute mean and std for each param, grouped by Mouse.
 * @param {object[]} data - rows with Mouse and param columns
 * @param {string[]} params - param names to compute stats for
 * @returns {Object.<string, object>} { mouseId: { n, param_mean, param_std, ... } }
 */
export function computeBaselineStats(data, params) {
  const groups = {}
  for (const row of data) {
    const m = row.Mouse
    if (!groups[m]) groups[m] = []
    groups[m].push(row)
  }

  const result = {}
  for (const [mouse, rows] of Object.entries(groups)) {
    const entry = { n: rows.length }
    for (const param of params) {
      const values = rows.map(r => r[param]).filter(v => v != null)
      if (values.length > 0) {
        entry[`${param}_mean`] = jStat.mean(values)
        entry[`${param}_std`] = values.length > 1 ? jStat.stdev(values, true) : 0
      }
    }
    result[mouse] = entry
  }
  return result
}

/**
 * Compute cluster proportion (%) per mouse.
 * @param {object[]} data - rows with Mouse and Cluster columns
 * @returns {Object.<string, Object.<number, number>>} { mouseId: { clusterId: percentage } }
 */
export function computeClusterProportions(data) {
  const groups = {}
  for (const row of data) {
    const m = row.Mouse
    if (!groups[m]) groups[m] = {}
    groups[m][row.Cluster] = (groups[m][row.Cluster] || 0) + 1
  }

  const result = {}
  for (const [mouse, counts] of Object.entries(groups)) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    result[mouse] = {}
    for (const [cluster, count] of Object.entries(counts)) {
      result[mouse][cluster] = (count / total) * 100
    }
  }
  return result
}

/**
 * Welch's t-test (unequal variances).
 * @param {number[]} a
 * @param {number[]} b
 * @returns {{ tStat: number, pValue: number, df: number }}
 */
export function welchTTest(a, b) {
  const nA = a.length, nB = b.length
  const meanA = jStat.mean(a), meanB = jStat.mean(b)
  const varA = jStat.variance(a, true), varB = jStat.variance(b, true)
  const seA = varA / nA, seB = varB / nB
  const tStat = (meanA - meanB) / Math.sqrt(seA + seB)
  const df = (seA + seB) ** 2 / (seA ** 2 / (nA - 1) + seB ** 2 / (nB - 1))
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tStat), df))
  return { tStat, pValue, df }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run __tests__/engine/statistics.test.js
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/engine/statistics.js frontend/__tests__/engine/statistics.test.js
git commit -m "feat: add statistics module with baseline stats and Welch t-test"
```

---

## Task 7: Prediction Module

**Files:**
- Create: `frontend/src/engine/prediction.js`
- Create: `frontend/__tests__/engine/prediction.test.js`

- [ ] **Step 1: Write the test**

Create `frontend/__tests__/engine/prediction.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { classifyByProportions, computeDensityScore } from '../../src/engine/prediction.js'

describe('classifyByProportions', () => {
  it('classifies high-motility sample as fertile', () => {
    // reference: fertile has high cluster-0 (fast), low cluster-3 (slow)
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
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run __tests__/engine/prediction.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `frontend/src/engine/prediction.js`:

```js
/**
 * Classify a sample by comparing cluster proportions to labeled reference data.
 * Uses nearest-centroid approach (average of each class).
 *
 * @param {Object.<number, number>} sampleProportions - { clusterId: percentage }
 * @param {Array<{label: string, proportions: Object.<number, number>}>} reference
 * @returns {{ prediction: string, probability: number, classProbabilities: Object.<string, number> }}
 */
export function classifyByProportions(sampleProportions, reference) {
  // Group reference by label
  const classes = {}
  for (const ref of reference) {
    if (!classes[ref.label]) classes[ref.label] = []
    classes[ref.label].push(ref.proportions)
  }

  // Compute centroid for each class
  const centroids = {}
  for (const [label, propsList] of Object.entries(classes)) {
    const allKeys = new Set(propsList.flatMap(p => Object.keys(p)))
    centroids[label] = {}
    for (const k of allKeys) {
      centroids[label][k] = propsList.reduce((s, p) => s + (p[k] || 0), 0) / propsList.length
    }
  }

  // Compute distance from sample to each centroid
  const distances = {}
  for (const [label, centroid] of Object.entries(centroids)) {
    const allKeys = new Set([...Object.keys(centroid), ...Object.keys(sampleProportions)])
    let dist = 0
    for (const k of allKeys) {
      dist += ((sampleProportions[k] || 0) - (centroid[k] || 0)) ** 2
    }
    distances[label] = Math.sqrt(dist)
  }

  // Convert distances to probabilities via softmax of negative distances
  const labels = Object.keys(distances)
  const negDists = labels.map(l => -distances[l])
  const maxNeg = Math.max(...negDists)
  const exps = negDists.map(d => Math.exp(d - maxNeg))
  const sumExp = exps.reduce((a, b) => a + b, 0)
  const probs = exps.map(e => e / sumExp)

  const classProbabilities = {}
  labels.forEach((l, i) => { classProbabilities[l] = probs[i] })

  const bestIdx = probs.indexOf(Math.max(...probs))
  return {
    prediction: labels[bestIdx],
    probability: probs[bestIdx],
    classProbabilities,
  }
}

/**
 * Compute density-based similarity score using histogram approximation of JS divergence.
 *
 * @param {number[][]} sampleEmbedding - shape (n, 2)
 * @param {number[][]} referenceEmbedding - shape (m, 2)
 * @param {number} bins - grid resolution (default 20)
 * @returns {{ similarityScore: number, jsDivergence: number }}
 */
export function computeDensityScore(sampleEmbedding, referenceEmbedding, bins = 20) {
  const all = [...sampleEmbedding, ...referenceEmbedding]
  const xMin = Math.min(...all.map(p => p[0]))
  const xMax = Math.max(...all.map(p => p[0]))
  const yMin = Math.min(...all.map(p => p[1]))
  const yMax = Math.max(...all.map(p => p[1]))
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  function toHist(points) {
    const hist = new Float64Array(bins * bins)
    for (const [x, y] of points) {
      const xi = Math.min(Math.floor((x - xMin) / xRange * bins), bins - 1)
      const yi = Math.min(Math.floor((y - yMin) / yRange * bins), bins - 1)
      hist[yi * bins + xi]++
    }
    // Normalize to probability + add small epsilon to avoid log(0)
    const total = points.length
    const eps = 1e-10
    for (let i = 0; i < hist.length; i++) hist[i] = hist[i] / total + eps
    // Re-normalize
    const sum = hist.reduce((a, b) => a + b, 0)
    for (let i = 0; i < hist.length; i++) hist[i] /= sum
    return hist
  }

  const P = toHist(sampleEmbedding)
  const Q = toHist(referenceEmbedding)

  // Jensen-Shannon divergence
  const M = new Float64Array(P.length)
  for (let i = 0; i < P.length; i++) M[i] = (P[i] + Q[i]) / 2

  function kl(a, b) {
    let sum = 0
    for (let i = 0; i < a.length; i++) sum += a[i] * Math.log(a[i] / b[i])
    return sum
  }

  const jsDivergence = (kl(P, M) + kl(Q, M)) / 2
  const similarityScore = Math.max(0, Math.min(100, (1 - jsDivergence) * 100))

  return { similarityScore, jsDivergence }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run __tests__/engine/prediction.test.js
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/engine/prediction.js frontend/__tests__/engine/prediction.test.js
git commit -m "feat: add prediction module with cluster classifier and density scoring"
```

---

## Task 8: Analysis Pipeline

**Files:**
- Create: `frontend/src/engine/pipeline.js`
- Create: `frontend/__tests__/engine/pipeline.test.js`

- [ ] **Step 1: Write the test**

Create `frontend/__tests__/engine/pipeline.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { runAnalysisPipeline } from '../../src/engine/pipeline.js'

describe('runAnalysisPipeline', () => {
  it('runs full pipeline on motile sperm data', () => {
    // Simulate 30 motile sperm with 4 features
    const data = Array.from({ length: 30 }, (_, i) => ({
      Type: 99,
      VCL: 50 + Math.sin(i) * 30,
      VSL: 30 + Math.cos(i) * 20,
      VAP: 40 + Math.sin(i * 2) * 15,
      LIN: 0.5 + Math.cos(i) * 0.3,
      STR: 0.6 + Math.sin(i) * 0.2,
      WOB: 0.7 + Math.cos(i * 3) * 0.1,
      ALH: 2 + Math.sin(i * 0.5) * 1.5,
      BCF: 8 + Math.cos(i * 0.7) * 4,
      Mouse: i < 15 ? 'M1' : 'M2',
      Group: i < 15 ? 'WT' : 'KO',
    }))

    const result = runAnalysisPipeline(data)

    expect(result.analyzedData).toHaveLength(30)
    expect(result.analyzedData[0]).toHaveProperty('tSNE1')
    expect(result.analyzedData[0]).toHaveProperty('tSNE2')
    expect(result.analyzedData[0]).toHaveProperty('Cluster')
    expect(typeof result.analyzedData[0].Cluster).toBe('number')
    expect(result.stats.baseline).toHaveProperty('M1')
    expect(result.stats.baseline).toHaveProperty('M2')
    expect(result.stats.clusterProportions).toHaveProperty('M1')
  })

  it('returns error for empty data', () => {
    const result = runAnalysisPipeline([])
    expect(result.error).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run __tests__/engine/pipeline.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `frontend/src/engine/pipeline.js`:

```js
import { CONFIG } from './config.js'
import { runTsne } from './tsne.js'
import { kmeans, standardize } from './clustering.js'
import { computeBaselineStats, computeClusterProportions } from './statistics.js'

/**
 * Run the full analysis pipeline: features → t-SNE → K-Means → stats.
 *
 * @param {object[]} motileData - preprocessed motile sperm rows with CASA params, Mouse, Group
 * @param {function} [onProgress] - optional callback({ step, message })
 * @returns {{ analyzedData: object[], stats: object, error?: string }}
 */
export function runAnalysisPipeline(motileData, onProgress) {
  if (!motileData || motileData.length === 0) {
    return { analyzedData: [], stats: {}, error: 'No data to analyze' }
  }

  const features = CONFIG.TSNE_FEATURES

  // Step 1: Extract feature matrix and deduplicate
  if (onProgress) onProgress({ step: 1, message: 'Extracting features...' })
  const featureRows = motileData.map(row => features.map(f => row[f]))
  const valid = featureRows.filter(r => r.every(v => v != null && !isNaN(v)))

  if (valid.length === 0) {
    return { analyzedData: [], stats: {}, error: 'No valid feature rows found' }
  }

  // Deduplicate by stringifying
  const seen = new Set()
  const uniqueIndices = []
  const uniqueFeatures = []
  for (let i = 0; i < valid.length; i++) {
    const key = valid[i].join('_')
    if (!seen.has(key)) {
      seen.add(key)
      uniqueIndices.push(i)
      uniqueFeatures.push(valid[i])
    }
  }

  // Step 2: t-SNE
  if (onProgress) onProgress({ step: 2, message: `Running t-SNE on ${uniqueFeatures.length} unique points...` })
  const embedding = runTsne(uniqueFeatures, (done, total) => {
    if (onProgress) onProgress({ step: 2, message: `t-SNE: perplexity ${done}/${total}` })
  })

  // Step 3: K-Means clustering
  if (onProgress) onProgress({ step: 3, message: 'Clustering...' })
  const clusterLabels = kmeans(embedding, CONFIG.N_CLUSTERS, CONFIG.RANDOM_STATE, CONFIG.KMEANS_N_INIT)

  // Build lookup: feature key → { tSNE1, tSNE2, Cluster }
  const lookup = {}
  uniqueFeatures.forEach((feat, i) => {
    lookup[feat.join('_')] = {
      tSNE1: embedding[i][0],
      tSNE2: embedding[i][1],
      Cluster: clusterLabels[i],
    }
  })

  // Merge back to original data
  const analyzedData = []
  for (const row of motileData) {
    const vals = features.map(f => row[f])
    if (vals.some(v => v == null || isNaN(v))) continue
    const key = vals.join('_')
    const tsneResult = lookup[key]
    if (tsneResult) {
      analyzedData.push({ ...row, ...tsneResult })
    }
  }

  // Step 4: Statistics
  if (onProgress) onProgress({ step: 4, message: 'Computing statistics...' })
  const baseline = computeBaselineStats(analyzedData, CONFIG.ALL_CASA_PARAMS)
  const clusterProportions = computeClusterProportions(analyzedData)

  return {
    analyzedData,
    stats: {
      baseline,
      clusterProportions,
      totalAnalyzed: analyzedData.length,
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run __tests__/engine/pipeline.test.js
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/engine/pipeline.js frontend/__tests__/engine/pipeline.test.js
git commit -m "feat: add full analysis pipeline orchestrating t-SNE, clustering, and stats"
```

---

## Task 9: IndexedDB Storage Layer

**Files:**
- Create: `frontend/src/db/index.js`
- Create: `frontend/__tests__/db/db.test.js`

- [ ] **Step 1: Write the test**

Create `frontend/__tests__/db/db.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { openDB } from 'idb'

// We test the DB schema and operations via the idb library directly
// since IndexedDB is available in jsdom via fake-indexeddb
import 'fake-indexeddb/auto'

import { getDB, addDataset, getDatasets, getDataset, deleteDataset, saveResults, getResults } from '../../src/db/index.js'

beforeEach(async () => {
  // Clear databases between tests
  const dbs = await indexedDB.databases()
  for (const db of dbs) {
    indexedDB.deleteDatabase(db.name)
  }
})

describe('datasets CRUD', () => {
  it('adds and retrieves a dataset', async () => {
    const id = await addDataset({
      name: 'Test WT',
      genotype: 'WT',
      mouseId: 'M1',
      group: 'WT',
      totalSperm: 100,
      motileSperm: 60,
      raw: 'Type,VCL\n99,100',
    })
    expect(id).toBeGreaterThan(0)

    const ds = await getDataset(id)
    expect(ds.name).toBe('Test WT')
    expect(ds.genotype).toBe('WT')
    expect(ds.status).toBe('pending')
  })

  it('lists all datasets', async () => {
    await addDataset({ name: 'DS1', genotype: 'WT', raw: '' })
    await addDataset({ name: 'DS2', genotype: 'KO', raw: '' })
    const all = await getDatasets()
    expect(all).toHaveLength(2)
  })

  it('deletes a dataset', async () => {
    const id = await addDataset({ name: 'ToDelete', genotype: 'X', raw: '' })
    await deleteDataset(id)
    const all = await getDatasets()
    expect(all).toHaveLength(0)
  })
})

describe('results CRUD', () => {
  it('saves and retrieves analysis results', async () => {
    const dsId = await addDataset({ name: 'DS', genotype: 'WT', raw: '' })
    await saveResults(dsId, {
      tsne: [[1, 2], [3, 4]],
      clusters: [0, 1],
      stats: { baseline: {} },
      clusterProps: {},
      analyzedData: [{ VCL: 100, tSNE1: 1, tSNE2: 2, Cluster: 0 }],
    })

    const results = await getResults(dsId)
    expect(results.tsne).toEqual([[1, 2], [3, 4]])
    expect(results.clusters).toEqual([0, 1])

    // Dataset status should be updated to 'done'
    const ds = await getDataset(dsId)
    expect(ds.status).toBe('done')
  })
})
```

- [ ] **Step 2: Install fake-indexeddb for testing, then run test to verify it fails**

```bash
cd frontend && npm install -D fake-indexeddb
npx vitest run __tests__/db/db.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `frontend/src/db/index.js`:

```js
import { openDB } from 'idb'

const DB_NAME = 'CASADashboardDB'
const DB_VERSION = 1

/**
 * Open (or create) the database.
 */
export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('datasets')) {
        const ds = db.createObjectStore('datasets', { keyPath: 'id', autoIncrement: true })
        ds.createIndex('genotype', 'genotype')
      }
      if (!db.objectStoreNames.contains('results')) {
        const rs = db.createObjectStore('results', { keyPath: 'datasetId' })
      }
    },
  })
}

/**
 * Add a new dataset.
 * @returns {Promise<number>} the auto-generated id
 */
export async function addDataset({ name, genotype, mouseId, group, totalSperm, motileSperm, raw }) {
  const db = await getDB()
  return db.add('datasets', {
    name: name || 'Unnamed',
    genotype: genotype || '',
    mouseId: mouseId || '',
    group: group || genotype || '',
    totalSperm: totalSperm || 0,
    motileSperm: motileSperm || 0,
    status: 'pending',
    createdAt: Date.now(),
    raw: raw || '',
  })
}

/**
 * Get all datasets (without raw CSV to save memory).
 */
export async function getDatasets() {
  const db = await getDB()
  const all = await db.getAll('datasets')
  return all.map(({ raw, ...rest }) => rest)
}

/**
 * Get a single dataset by id (includes raw CSV).
 */
export async function getDataset(id) {
  const db = await getDB()
  return db.get('datasets', id)
}

/**
 * Update dataset fields.
 */
export async function updateDataset(id, updates) {
  const db = await getDB()
  const ds = await db.get('datasets', id)
  if (!ds) throw new Error(`Dataset ${id} not found`)
  const updated = { ...ds, ...updates }
  await db.put('datasets', updated)
  return updated
}

/**
 * Delete a dataset and its results.
 */
export async function deleteDataset(id) {
  const db = await getDB()
  const tx = db.transaction(['datasets', 'results'], 'readwrite')
  await tx.objectStore('datasets').delete(id)
  try { await tx.objectStore('results').delete(id) } catch { /* may not exist */ }
  await tx.done
}

/**
 * Save analysis results and update dataset status to 'done'.
 */
export async function saveResults(datasetId, { tsne, clusters, stats, clusterProps, analyzedData }) {
  const db = await getDB()
  const tx = db.transaction(['results', 'datasets'], 'readwrite')
  await tx.objectStore('results').put({
    datasetId,
    tsne,
    clusters,
    stats,
    clusterProps,
    analyzedData,
  })

  const ds = await tx.objectStore('datasets').get(datasetId)
  if (ds) {
    ds.status = 'done'
    await tx.objectStore('datasets').put(ds)
  }
  await tx.done
}

/**
 * Get analysis results for a dataset.
 */
export async function getResults(datasetId) {
  const db = await getDB()
  return db.get('results', datasetId)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run __tests__/db/db.test.js
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/db/index.js frontend/__tests__/db/db.test.js
git commit -m "feat: add IndexedDB storage layer for datasets and results"
```

---

## Task 10: useEngine and useDB Hooks

**Files:**
- Create: `frontend/src/hooks/useDB.js`
- Create: `frontend/src/hooks/useEngine.js`

- [ ] **Step 1: Create useDB hook**

Create `frontend/src/hooks/useDB.js`:

```js
import { useCallback } from 'react'
import * as db from '../db/index.js'

/**
 * Hook providing database operations.
 * API surface matches the old useApi() for minimal page-level changes.
 */
export function useDB() {
  const getDatasets = useCallback(() => db.getDatasets(), [])
  const getDataset = useCallback((id) => db.getDataset(id), [])
  const deleteDataset = useCallback((id) => db.deleteDataset(id), [])
  const getResults = useCallback((id) => db.getResults(id), [])

  const uploadDataset = useCallback(async ({ name, genotype, mouseId, group, csvText, totalSperm, motileSperm }) => {
    const id = await db.addDataset({ name, genotype, mouseId, group, totalSperm, motileSperm, raw: csvText })
    return id
  }, [])

  const saveResults = useCallback((datasetId, results) => db.saveResults(datasetId, results), [])
  const updateDataset = useCallback((id, updates) => db.updateDataset(id, updates), [])

  return { getDatasets, getDataset, deleteDataset, getResults, uploadDataset, saveResults, updateDataset }
}
```

- [ ] **Step 2: Create useEngine hook**

Create `frontend/src/hooks/useEngine.js`:

```js
import { useCallback, useState } from 'react'
import { preprocessCSV, readFileText } from '../engine/preprocessing.js'
import { runAnalysisPipeline } from '../engine/pipeline.js'
import { classifyByProportions, computeDensityScore } from '../engine/prediction.js'
import { useDB } from './useDB.js'

/**
 * Hook providing analysis engine operations.
 */
export function useEngine() {
  const db = useDB()
  const [progress, setProgress] = useState(null)

  /**
   * Upload and preprocess a raw CASA CSV file.
   * @param {File} file
   * @param {{ name, genotype, mouseId, group }} meta
   * @returns {Promise<number>} dataset id
   */
  const uploadAndPreprocess = useCallback(async (file, meta) => {
    const text = await readFileText(file)
    const { data, totalSperm, motileSperm, error } = preprocessCSV(text, meta)
    if (error) throw new Error(error)

    const id = await db.uploadDataset({
      name: meta.name || file.name.replace('.csv', ''),
      genotype: meta.genotype,
      mouseId: meta.mouseId,
      group: meta.group || meta.genotype,
      csvText: text,
      totalSperm,
      motileSperm,
    })
    return id
  }, [db])

  /**
   * Import a pre-processed CSV (already has tSNE/Cluster columns).
   * @param {File} file
   * @param {{ name, genotype }} meta
   * @returns {Promise<number>} dataset id
   */
  const importProcessed = useCallback(async (file, meta) => {
    const text = await readFileText(file)
    const { data, totalSperm } = preprocessCSV(text, { mouseId: meta.mouseId || 'imported', group: meta.genotype })

    // Check if already has tSNE columns
    const hasTsne = data.length > 0 && 'tSNE1' in data[0]

    const id = await db.uploadDataset({
      name: meta.name || file.name.replace('.csv', ''),
      genotype: meta.genotype,
      mouseId: meta.mouseId || 'imported',
      group: meta.genotype,
      csvText: text,
      totalSperm,
      motileSperm: data.length,
    })

    if (hasTsne) {
      await db.saveResults(id, {
        tsne: data.map(r => [r.tSNE1, r.tSNE2]),
        clusters: data.map(r => r.Cluster),
        stats: { baseline: {}, clusterProportions: {} },
        clusterProps: {},
        analyzedData: data,
      })
    }

    return id
  }, [db])

  /**
   * Run full analysis on a dataset.
   * @param {number} datasetId
   */
  const analyze = useCallback(async (datasetId) => {
    setProgress({ status: 'running', message: 'Loading data...' })

    const ds = await db.getDataset(datasetId)
    if (!ds) throw new Error('Dataset not found')

    const { data, error } = preprocessCSV(ds.raw, { mouseId: ds.mouseId, group: ds.group })
    if (error) {
      setProgress({ status: 'error', message: error })
      throw new Error(error)
    }

    const result = runAnalysisPipeline(data, ({ step, message }) => {
      setProgress({ status: 'running', message })
    })

    if (result.error) {
      setProgress({ status: 'error', message: result.error })
      await db.updateDataset(datasetId, { status: 'error' })
      throw new Error(result.error)
    }

    await db.saveResults(datasetId, {
      tsne: result.analyzedData.map(r => [r.tSNE1, r.tSNE2]),
      clusters: result.analyzedData.map(r => r.Cluster),
      stats: result.stats,
      clusterProps: result.stats.clusterProportions,
      analyzedData: result.analyzedData,
    })

    await db.updateDataset(datasetId, {
      motileSperm: result.analyzedData.length,
      status: 'done',
    })

    setProgress({ status: 'done', message: 'Analysis complete' })
    return result
  }, [db])

  /**
   * Get chart data for a dataset (mirrors old API).
   */
  const getChartData = useCallback(async (datasetId, chartType) => {
    const results = await db.getResults(datasetId)
    if (!results) return null

    const { analyzedData } = results

    switch (chartType) {
      case 'tsne_landscape':
        return {
          tSNE1: analyzedData.map(r => r.tSNE1),
          tSNE2: analyzedData.map(r => r.tSNE2),
          Cluster: analyzedData.map(r => r.Cluster),
          Mouse: analyzedData.map(r => r.Mouse),
        }
      case 'cluster_proportions':
        return Object.entries(results.clusterProps).map(([mouse, props]) => ({
          Mouse: mouse, ...props,
        }))
      case 'parameter_box': {
        const params = ['VCL', 'VSL', 'ALH', 'BCF']
        const out = {}
        for (const p of params) {
          out[p] = {
            values: analyzedData.map(r => r[p]),
            cluster: analyzedData.map(r => r.Cluster),
            mouse: analyzedData.map(r => r.Mouse),
          }
        }
        return out
      }
      default:
        return null
    }
  }, [db])

  /**
   * Compare multiple datasets by merging their t-SNE results.
   */
  const compareDatasets = useCallback(async (datasetIds) => {
    const allData = { tSNE1: [], tSNE2: [], dataset_name: [], Cluster: [] }
    for (const id of datasetIds) {
      const results = await db.getResults(id)
      const ds = await db.getDataset(id)
      if (!results) continue
      for (const row of results.analyzedData) {
        allData.tSNE1.push(row.tSNE1)
        allData.tSNE2.push(row.tSNE2)
        allData.Cluster.push(row.Cluster)
        allData.dataset_name.push(ds.name)
      }
    }
    return allData
  }, [db])

  /**
   * Run prediction on a dataset.
   */
  const predict = useCallback(async (datasetId, modelType, referenceResults) => {
    const results = await db.getResults(datasetId)
    if (!results) throw new Error('No analysis results. Run analysis first.')

    if (modelType === 'cluster_classifier') {
      if (!referenceResults || referenceResults.length < 2) {
        throw new Error('Upload at least 2 labeled reference datasets for classification')
      }
      const sampleProps = results.clusterProps
      // Use first mouse's proportions as the sample
      const firstMouse = Object.keys(sampleProps)[0]
      const result = classifyByProportions(sampleProps[firstMouse], referenceResults)
      return { result }
    }

    if (modelType === 'density_scoring') {
      if (!referenceResults) {
        throw new Error('Upload a reference dataset for density scoring')
      }
      const sampleEmb = results.tsne
      const refEmb = referenceResults.tsne || referenceResults
      const result = computeDensityScore(sampleEmb, refEmb)
      return { result: { similarity_score: result.similarityScore, js_divergence: result.jsDivergence } }
    }

    throw new Error(`Unknown model type: ${modelType}`)
  }, [db])

  return {
    uploadAndPreprocess,
    importProcessed,
    analyze,
    getChartData,
    compareDatasets,
    predict,
    progress,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useDB.js frontend/src/hooks/useEngine.js
git commit -m "feat: add useDB and useEngine hooks replacing backend API"
```

---

## Task 11: Update AppContext

**Files:**
- Modify: `frontend/src/context/AppContext.jsx`

- [ ] **Step 1: Update AppContext to load from IndexedDB**

Replace `frontend/src/context/AppContext.jsx` with:

```jsx
import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext()

const initialState = {
  datasets: [],
  selectedDatasetId: null,
  loading: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATASETS':
      return { ...state, datasets: action.payload }
    case 'SELECT_DATASET':
      return { ...state, selectedDatasetId: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'UPDATE_DATASET': {
      const updated = state.datasets.map(d =>
        d.id === action.payload.id ? { ...d, ...action.payload } : d
      )
      return { ...state, datasets: updated }
    }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  return useContext(AppContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/context/AppContext.jsx
git commit -m "feat: add UPDATE_DATASET action to AppContext"
```

---

## Task 12: Update App.jsx — Switch to HashRouter

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Replace BrowserRouter with HashRouter**

GitHub Pages doesn't support client-side routing with BrowserRouter (all paths return 404 except root). HashRouter uses `#/path` which works everywhere.

Replace `frontend/src/App.jsx` with:

```jsx
import { lazy, Suspense, Component } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataManagement from './pages/DataManagement'

const Analysis = lazy(() => import('./pages/Analysis'))
const Prediction = lazy(() => import('./pages/Prediction'))

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: 'red' }}>
          <h2>Something went wrong</h2>
          <pre>{this.state.error.message}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const Loading = () => <div className="p-6 text-gray-400">Loading...</div>

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/data" element={<DataManagement />} />
              <Route path="/analysis" element={<Suspense fallback={<Loading />}><Analysis /></Suspense>} />
              <Route path="/prediction" element={<Suspense fallback={<Loading />}><Prediction /></Suspense>} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: switch to HashRouter for GitHub Pages compatibility"
```

---

## Task 13: Update Pages — Dashboard, DataManagement, Analysis, Prediction

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/pages/DataManagement.jsx`
- Modify: `frontend/src/components/FileUploader.jsx`
- Modify: `frontend/src/pages/Analysis.jsx`
- Modify: `frontend/src/pages/Prediction.jsx`
- Modify: `frontend/src/components/DataTable.jsx`

- [ ] **Step 1: Update Dashboard.jsx**

Replace `frontend/src/pages/Dashboard.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDB } from '../hooks/useDB'
import { useAppState } from '../context/AppContext'

export default function Dashboard() {
  const db = useDB()
  const { state, dispatch } = useAppState()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getDatasets().then(data => {
      dispatch({ type: 'SET_DATASETS', payload: data })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const datasets = state.datasets

  const stats = {
    total: datasets.length,
    analyzed: datasets.filter(d => d.status === 'done').length,
    totalSperm: datasets.reduce((sum, d) => sum + (d.totalSperm || 0), 0),
    genotypes: [...new Set(datasets.map(d => d.genotype).filter(Boolean))],
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Datasets', value: stats.total },
          { label: 'Analyzed', value: stats.analyzed },
          { label: 'Total Sperm', value: stats.totalSperm.toLocaleString() },
          { label: 'Genotypes', value: stats.genotypes.join(', ') || '-' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Recent Datasets</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800" onClick={() => navigate('/data')}>
            Manage Data
          </button>
        </div>
        <div className="p-4">
          {datasets.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No datasets yet. Go to Data Management to upload.</p>
          ) : (
            <div className="space-y-2">
              {datasets.slice(0, 5).map(ds => (
                <div key={ds.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => { dispatch({ type: 'SELECT_DATASET', payload: ds.id }); navigate('/analysis') }}
                >
                  <div>
                    <p className="font-medium text-sm">{ds.name}</p>
                    <p className="text-xs text-gray-400">{ds.genotype} &middot; {(ds.totalSperm || 0).toLocaleString()} sperm</p>
                  </div>
                  <span className={`text-xs font-medium ${
                    ds.status === 'done' ? 'text-green-600' : ds.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {ds.status === 'done' ? 'Complete' : ds.status === 'error' ? 'Error' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update FileUploader.jsx**

Replace `frontend/src/components/FileUploader.jsx` with:

```jsx
import { useState, useRef } from 'react'

export default function FileUploader({ onUpload, mode = 'raw' }) {
  const [dragging, setDragging] = useState(false)
  const [metadata, setMetadata] = useState({
    name: '', genotype: '', mouseId: '', group: '',
  })
  const fileRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) submitFile(file)
  }

  const submitFile = (file) => {
    onUpload(file, {
      name: metadata.name || file.name.replace('.csv', ''),
      genotype: metadata.genotype,
      mouseId: metadata.mouseId,
      group: metadata.group || metadata.genotype,
    }, mode)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Dataset name"
          value={metadata.name} onChange={e => setMetadata(m => ({ ...m, name: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Genotype (e.g. Het, WT, KO)"
          value={metadata.genotype} onChange={e => setMetadata(m => ({ ...m, genotype: e.target.value }))} />
        {mode === 'raw' && (
          <>
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Mouse ID (e.g. Het_01)"
              value={metadata.mouseId} onChange={e => setMetadata(m => ({ ...m, mouseId: e.target.value }))} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Group"
              value={metadata.group} onChange={e => setMetadata(m => ({ ...m, group: e.target.value }))} />
          </>
        )}
      </div>
      <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={e => e.target.files[0] && submitFile(e.target.files[0])} />
        <p className="text-gray-500">
          {mode === 'raw' ? 'Drop raw CASA CSV here (Shift-JIS or UTF-8)' : 'Drop pre-processed CSV here (with t-SNE + Cluster columns)'}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update DataTable.jsx**

Replace `frontend/src/components/DataTable.jsx` with:

```jsx
export default function DataTable({ datasets, onSelect, onDelete, selectedId }) {
  if (datasets.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">No datasets uploaded yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 px-3">Name</th>
            <th className="py-2 px-3">Genotype</th>
            <th className="py-2 px-3">Sperm</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map(ds => (
            <tr key={ds.id}
              className={`border-b hover:bg-gray-50 cursor-pointer ${selectedId === ds.id ? 'bg-blue-50' : ''}`}
              onClick={() => onSelect(ds.id)}
            >
              <td className="py-2 px-3 font-medium">{ds.name}</td>
              <td className="py-2 px-3">{ds.genotype}</td>
              <td className="py-2 px-3">{(ds.totalSperm || 0).toLocaleString()}</td>
              <td className={`py-2 px-3 ${
                ds.status === 'done' ? 'text-green-600' : ds.status === 'error' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {ds.status === 'done' ? 'Complete' : ds.status === 'error' ? 'Error' : 'Pending'}
              </td>
              <td className="py-2 px-3">
                <button className="text-red-500 hover:text-red-700 text-xs"
                  onClick={e => { e.stopPropagation(); onDelete(ds.id) }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Update DataManagement.jsx**

Replace `frontend/src/pages/DataManagement.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { useAppState } from '../context/AppContext'
import FileUploader from '../components/FileUploader'
import DataTable from '../components/DataTable'

export default function DataManagement() {
  const db = useDB()
  const engine = useEngine()
  const { state, dispatch } = useAppState()
  const [uploadMode, setUploadMode] = useState('raw')
  const [message, setMessage] = useState('')

  const refresh = () => {
    db.getDatasets().then(data => dispatch({ type: 'SET_DATASETS', payload: data }))
  }

  useEffect(() => { refresh() }, [])

  const handleUpload = async (file, meta, mode) => {
    try {
      setMessage('Processing...')
      if (mode === 'raw') {
        await engine.uploadAndPreprocess(file, meta)
      } else {
        await engine.importProcessed(file, meta)
      }
      setMessage('Upload successful!')
      refresh()
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
  }

  const handleDelete = async (id) => {
    await db.deleteDataset(id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
      <div className="bg-white rounded-xl border p-6">
        <div className="flex gap-4 mb-4">
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
            uploadMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            onClick={() => setUploadMode('raw')}>Upload Raw CASA CSV</button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
            uploadMode === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            onClick={() => setUploadMode('import')}>Import Processed CSV</button>
        </div>
        <FileUploader onUpload={handleUpload} mode={uploadMode} />
        {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
      </div>
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Datasets</h3>
        <DataTable datasets={state.datasets} selectedId={state.selectedDatasetId}
          onSelect={id => dispatch({ type: 'SELECT_DATASET', payload: id })} onDelete={handleDelete} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update Analysis.jsx**

Replace `frontend/src/pages/Analysis.jsx` with:

```jsx
import { useEffect, useState, useCallback } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { useAppState } from '../context/AppContext'
import ProgressBar from '../components/ProgressBar'
import TsneLandscape from '../components/charts/TsneLandscape'
import ClusterProportions from '../components/charts/ClusterProportions'
import ParameterBoxPlots from '../components/charts/ParameterBoxPlots'
import GenotypeComparison from '../components/charts/GenotypeComparison'

export default function Analysis() {
  const db = useDB()
  const engine = useEngine()
  const { state, dispatch } = useAppState()
  const [charts, setCharts] = useState({})
  const [datasets, setDatasets] = useState([])
  const [compareIds, setCompareIds] = useState([])
  const [compareData, setCompareData] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const selectedId = state.selectedDatasetId

  useEffect(() => {
    db.getDatasets().then(data => {
      setDatasets(data)
      dispatch({ type: 'SET_DATASETS', payload: data })
    }).catch(() => {})
  }, [])

  const loadCharts = useCallback(async (id) => {
    const types = ['tsne_landscape', 'cluster_proportions', 'parameter_box']
    const results = {}
    for (const type of types) {
      try { results[type] = await engine.getChartData(id, type) } catch { /* skip */ }
    }
    setCharts(results)
  }, [engine])

  useEffect(() => {
    if (!selectedId) return
    // Check if already analyzed
    db.getResults(selectedId).then(results => {
      if (results) loadCharts(selectedId)
    }).catch(() => {})
  }, [selectedId])

  const handleAnalyze = async () => {
    if (!selectedId) return
    setAnalyzing(true)
    try {
      await engine.analyze(selectedId)
      await loadCharts(selectedId)
      // Refresh datasets list to update status
      const data = await db.getDatasets()
      setDatasets(data)
      dispatch({ type: 'SET_DATASETS', payload: data })
    } catch (err) {
      console.error('Analysis failed:', err)
    }
    setAnalyzing(false)
  }

  const handleCompare = async () => {
    if (compareIds.length < 2) return
    const data = await engine.compareDatasets(compareIds)
    setCompareData(data)
  }

  const currentDs = datasets.find(d => d.id === selectedId)
  const isDone = currentDs?.status === 'done'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analysis & Visualization</h2>
        <div className="flex gap-3 items-center">
          <select className="border rounded-lg px-3 py-2 text-sm"
            value={selectedId || ''} onChange={e => dispatch({ type: 'SELECT_DATASET', payload: Number(e.target.value) })}>
            <option value="">Select dataset...</option>
            {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name} ({ds.genotype})</option>)}
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={!selectedId || analyzing} onClick={handleAnalyze}>
            {analyzing ? 'Running...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {engine.progress && <ProgressBar status={engine.progress.status} message={engine.progress.message} />}

      {isDone && Object.keys(charts).length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TsneLandscape data={charts.tsne_landscape} />
            <ClusterProportions data={charts.cluster_proportions} />
          </div>
          <ParameterBoxPlots data={charts.parameter_box} />

          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-sm mb-3">Cross-Genotype Comparison</h3>
            <div className="flex gap-3 items-center mb-4">
              <select multiple className="border rounded-lg px-3 py-2 text-sm h-24"
                value={compareIds} onChange={e => setCompareIds([...e.target.selectedOptions].map(o => Number(o.value)))}>
                {datasets.filter(d => d.status === 'done').map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                disabled={compareIds.length < 2} onClick={handleCompare}>Compare</button>
            </div>
            {compareData && <GenotypeComparison data={compareData} />}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Update Prediction.jsx**

Replace `frontend/src/pages/Prediction.jsx` with:

```jsx
import { useEffect, useState, useRef } from 'react'
import { useDB } from '../hooks/useDB'
import { useEngine } from '../hooks/useEngine'
import { useAppState } from '../context/AppContext'
import { readFileText } from '../engine/preprocessing'
import { parseCSVText } from '../engine/preprocessing'
import ClusterClassifier from '../components/prediction/ClusterClassifier'
import DensityScoring from '../components/prediction/DensityScoring'

export default function Prediction() {
  const db = useDB()
  const engine = useEngine()
  const { state, dispatch } = useAppState()
  const [datasets, setDatasets] = useState([])
  const [classifierResult, setClassifierResult] = useState(null)
  const [densityResult, setDensityResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refFile, setRefFile] = useState(null)
  const refInputRef = useRef()

  const selectedId = state.selectedDatasetId

  useEffect(() => {
    db.getDatasets().then(data => {
      setDatasets(data.filter(d => d.status === 'done'))
      dispatch({ type: 'SET_DATASETS', payload: data })
    }).catch(() => {})
  }, [])

  const runPrediction = async (modelType) => {
    if (!selectedId) return
    if (!refFile) { setError('Please upload a reference CSV first'); return }

    setLoading(true)
    setError('')
    try {
      const refText = await readFileText(refFile)
      const { rows } = parseCSVText(refText)

      let referenceData
      if (modelType === 'cluster_classifier') {
        // Reference CSV needs columns: label, 0, 1, 2, 3, 4 (cluster proportions)
        referenceData = rows.map(r => ({
          label: r.label,
          proportions: { 0: r[0] || 0, 1: r[1] || 0, 2: r[2] || 0, 3: r[3] || 0, 4: r[4] || 0 },
        }))
      } else {
        // Reference CSV needs columns: tSNE1, tSNE2
        referenceData = { tsne: rows.map(r => [r.tSNE1, r.tSNE2]).filter(r => !isNaN(r[0])) }
      }

      const result = await engine.predict(selectedId, modelType, referenceData)
      if (modelType === 'cluster_classifier') {
        setClassifierResult(result.result)
      } else {
        setDensityResult(result.result)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Fertility Prediction</h2>
      <div className="flex gap-3 items-center">
        <select className="border rounded-lg px-3 py-2 text-sm"
          value={selectedId || ''} onChange={e => dispatch({ type: 'SELECT_DATASET', payload: Number(e.target.value) })}>
          <option value="">Select analyzed dataset...</option>
          {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name} ({ds.genotype})</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold text-sm mb-2">Reference Data</h3>
        <p className="text-xs text-gray-400 mb-3">Upload a CSV with labeled reference populations (fertile/subfertile).</p>
        <button className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          onClick={() => refInputRef.current?.click()}>
          {refFile ? refFile.name : 'Choose reference CSV...'}
        </button>
        <input ref={refInputRef} type="file" accept=".csv" className="hidden"
          onChange={e => setRefFile(e.target.files[0])} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">Model A: Cluster Proportion Classifier</h3>
              <p className="text-xs text-gray-400 mt-1">Nearest-centroid on cluster proportions</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              disabled={!selectedId || loading || !refFile} onClick={() => runPrediction('cluster_classifier')}>
              {loading ? 'Running...' : 'Predict'}
            </button>
          </div>
          <ClusterClassifier result={classifierResult} />
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">Model B: Landscape Density Scoring</h3>
              <p className="text-xs text-gray-400 mt-1">Histogram JS divergence vs reference</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              disabled={!selectedId || loading || !refFile} onClick={() => runPrediction('density_scoring')}>
              {loading ? 'Running...' : 'Score'}
            </button>
          </div>
          <DensityScoring result={densityResult} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-2">Reference</p>
        <p>Fernandez-Lopez, P. et al. (2022). "Predicting fertility from sperm motility landscapes." <em>Communications Biology</em> 5:1027</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit all page updates**

```bash
git add frontend/src/pages/ frontend/src/components/FileUploader.jsx frontend/src/components/DataTable.jsx
git commit -m "feat: update all pages to use client-side engine and IndexedDB"
```

---

## Task 14: Vite Config + Build Verification

**Files:**
- Modify: `frontend/vite.config.js`

- [ ] **Step 1: Update vite.config.js**

Replace `frontend/vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/casa-dashboard/',
  server: {
    port: 3000,
  },
})
```

- [ ] **Step 2: Run build to verify**

```bash
cd frontend && npm run build
```

Expected: Build succeeds, output in `frontend/dist/`.

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.js
git commit -m "feat: add base path for GitHub Pages deployment"
```

---

## Task 15: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create workflow file**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build
        run: cd frontend && npm run build

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/dist

      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow for Pages deployment"
```

---

## Task 16: Cleanup Old Files

**Files:**
- Delete: `index.html` (root)
- Delete: `rwt-rko.html` (root)

- [ ] **Step 1: Remove old static files**

```bash
git rm index.html rwt-rko.html
```

- [ ] **Step 2: Update GitHub Pages settings**

After pushing, switch GitHub Pages source from "Deploy from branch" to "GitHub Actions" in the repo settings:
Settings → Pages → Source → "GitHub Actions"

This must be done manually in the GitHub UI.

- [ ] **Step 3: Commit and push**

```bash
git commit -m "chore: remove old static HTML files, Pages now served from Vite build"
git push origin main
```

- [ ] **Step 4: Verify deployment**

Wait for the GitHub Actions workflow to complete, then check:
- `https://kkailab.github.io/casa-dashboard/` loads the React dashboard
- `https://kkailab.github.io/casa-dashboard/#/data` loads the Data Management page
- `https://kkailab.github.io/casa-dashboard/#/analysis` loads the Analysis page

---

## Task 17: Delete useApi Hook

**Files:**
- Delete: `frontend/src/hooks/useApi.js`

- [ ] **Step 1: Verify no imports remain**

```bash
cd frontend && grep -r "useApi" src/ --include="*.jsx" --include="*.js"
```

Expected: No matches (all pages now use useDB/useEngine).

- [ ] **Step 2: Remove the file**

```bash
git rm frontend/src/hooks/useApi.js
git commit -m "chore: remove unused useApi hook (replaced by useDB + useEngine)"
```

---

## Task 18: Run All Tests

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Final commit and push**

```bash
git push origin main
```

- [ ] **Step 4: Verify live deployment**

Check GitHub Actions run succeeds, then verify site at `https://kkailab.github.io/casa-dashboard/`.
