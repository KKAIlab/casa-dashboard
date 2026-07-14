import Papa from 'papaparse'
import { CONFIG } from './config.js'

// --- Header normalization ---------------------------------------------------
//
// Real CASA exports vary in ways that break naive exact-string column matching:
//   - Micro sign: "µm/秒" (U+00B5) vs "μm/秒" (U+03BC, Greek mu) vs romanized "um/秒"
//   - Full-width brackets/digits from Japanese locale exports (［μm/秒］)
//   - English exports with units appended ("VCL [µm/s]")
//   - Stray whitespace / casing
//
// normKey() collapses all of these: NFKC folds µ↔μ and full-width↔half-width,
// the bracketed unit is stripped, whitespace removed, and casing dropped. So
// "曲線速度[μm/秒]", "曲線速度[µm/秒]", "曲線速度[um/秒]" and "VCL [µm/s]" all
// reduce to a stable key we can match against.
export function normKey(h) {
  return String(h ?? '')
    .normalize('NFKC')
    .replace(/\[[^\]]*\]/g, '') // drop [unit] annotation
    .replace(/[\s　]+/g, '') // strip ASCII + full-width spaces
    .toLowerCase()
    .trim()
}

// Normalized-key -> canonical English column name.
// Built from the Japanese mapping plus self-maps for every English name we
// recognize, so English-with-units headers also resolve.
const NORM_MAPPING = (() => {
  const m = {}
  for (const [jp, en] of Object.entries(CONFIG.COLUMN_MAPPING)) {
    m[normKey(jp)] = en
    m[normKey(en)] = en // e.g. "VCL [µm/s]" -> "vcl" -> VCL
  }
  // Ensure every known CASA param and structural column self-maps.
  for (const p of CONFIG.ALL_CASA_PARAMS) m[normKey(p)] = p
  m[normKey('Type')] = 'Type'
  m[normKey('ID')] = 'ID'
  return m
})()

// Tokens that identify a genuine CASA header row (used for preamble detection).
const HEADER_TOKENS = new Set(Object.keys(NORM_MAPPING))

// --- Preamble handling ------------------------------------------------------
//
// CASA software frequently prepends metadata lines (sample name, date, software
// version) before the actual column-header row. PapaParse's header:true would
// otherwise treat the first metadata line as the header and mangle everything.
// Find the first line that looks like a real header and drop everything above.
function stripPreamble(text) {
  const clean = text.replace(/^﻿/, '') // strip BOM
  const lines = clean.split(/\r\n|\r|\n/)
  const limit = Math.min(lines.length, 50)
  for (let i = 0; i < limit; i++) {
    const cells = lines[i].split(/[,\t;]/).map(normKey)
    const hits = cells.filter(c => c && HEADER_TOKENS.has(c)).length
    if (hits >= 3) {
      return i === 0 ? clean : lines.slice(i).join('\n')
    }
  }
  return clean // no recognizable header found — leave as-is (fallback)
}

export function parseCSVText(text) {
  const result = Papa.parse(stripPreamble(text), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: 'greedy',
  })
  // FieldMismatch warnings (ragged rows, trailing summary/footer lines) are
  // common in real exports and are NOT fatal — only surface parse-level errors.
  const fatal = (result.errors || []).filter(e => e.type !== 'FieldMismatch')
  return { rows: result.data, errors: fatal }
}

export async function readFileText(file) {
  try {
    const text = await file.text()
    // Scan the whole payload (not just a prefix): Shift-JIS decoded as UTF-8
    // yields U+FFFD replacement characters, and Japanese headers may sit past
    // any leading ASCII preamble.
    if (!text.includes('�')) return text
  } catch { /* fall through */ }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file, 'Shift_JIS')
  })
}

export function mapColumns(rows) {
  return rows.map(row => {
    const mapped = { ...row }
    for (const key of Object.keys(row)) {
      const target = NORM_MAPPING[normKey(key)]
      if (!target) continue
      // Don't clobber a column that already holds the canonical name with real
      // data (e.g. a genuine English "VCL" column present alongside a mapped one).
      if (target !== key) {
        if (mapped[target] == null) mapped[target] = mapped[key]
        delete mapped[key]
      }
    }
    return mapped
  })
}

export function filterMotile(rows) {
  // If no Type column exists, data is already filtered (pre-processed CSV)
  if (rows.length > 0 && !('Type' in rows[0])) return rows
  // Tolerant compare: "99", 99, 99.0 all count as motile.
  return rows.filter(r => Number(r.Type) === CONFIG.MOTILE_TYPE)
}

// Validate that the columns t-SNE needs are actually present and numeric.
// Returns null when OK, or a human-readable message naming what's missing.
export function validateFeatures(rows) {
  if (!rows || rows.length === 0) return 'No data rows found in CSV.'
  const needed = CONFIG.TSNE_FEATURES
  const present = new Set(Object.keys(rows[0]))
  const missing = needed.filter(f => !present.has(f))
  if (missing.length > 0) {
    const seen = Object.keys(rows[0]).filter(Boolean).slice(0, 20).join(', ')
    return `CSV is missing required motility column(s): ${missing.join(', ')}. ` +
      `Recognized columns after mapping: ${seen}. ` +
      `Check that your CASA export includes VCL/VSL/ALH/BCF (Japanese or English headers).`
  }
  // At least some rows must carry numeric values for every needed feature.
  const anyNumeric = rows.some(r => needed.every(f => r[f] != null && !isNaN(Number(r[f]))))
  if (!anyNumeric) {
    return `Required columns (${needed.join(', ')}) exist but contain no numeric values. ` +
      `The file may have an extra header/units row, or a wrong encoding.`
  }
  return null
}

export function preprocessCSV(csvText, meta = {}) {
  const { rows, errors } = parseCSVText(csvText)
  if (errors.length > 0 || rows.length === 0) {
    return { data: [], totalSperm: 0, motileSperm: 0, error: 'Failed to parse CSV' }
  }

  const mapped = mapColumns(rows)

  const validationError = validateFeatures(mapped)
  if (validationError) {
    return { data: [], totalSperm: mapped.length, motileSperm: 0, error: validationError }
  }

  const totalSperm = mapped.length
  const motile = filterMotile(mapped)

  const data = motile.map(row => ({
    ...row,
    Mouse: meta.mouseId || row.Mouse || 'unknown',
    Group: meta.group || row.Group || 'unknown',
  }))

  if (data.length === 0) {
    return {
      data: [], totalSperm, motileSperm: 0,
      error: `Found ${totalSperm} rows but none were motile (Type = ${CONFIG.MOTILE_TYPE}). ` +
        `If your data is already filtered, use "Import Processed CSV" instead.`,
    }
  }

  return { data, totalSperm, motileSperm: data.length }
}
