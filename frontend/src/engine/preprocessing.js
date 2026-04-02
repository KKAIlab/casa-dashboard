import Papa from 'papaparse'
import { CONFIG } from './config.js'

export function parseCSVText(text) {
  const result = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })
  return { rows: result.data, errors: result.errors }
}

export async function readFileText(file) {
  try {
    const text = await file.text()
    if (!text.slice(0, 500).includes('\ufffd')) return text
  } catch { /* fall through */ }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file, 'Shift_JIS')
  })
}

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

export function filterMotile(rows) {
  // If no Type column exists, data is already filtered (pre-processed CSV)
  if (rows.length > 0 && !('Type' in rows[0])) return rows
  return rows.filter(r => r.Type === CONFIG.MOTILE_TYPE)
}

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
