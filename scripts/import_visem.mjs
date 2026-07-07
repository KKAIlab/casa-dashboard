#!/usr/bin/env node
/*
 * VISEM → CASA Dashboard CSV converter
 * --------------------------------------------------------------------------
 *
 * VISEM (Haugen et al., SimulaMet/NTNU) is a publicly released human sperm
 * dataset that includes per-participant semen analysis and frame-level CASA
 * measurements. The dataset is distributed under CC BY 4.0 and must be
 * downloaded from the dataset's official page (search for "VISEM SimulaMet
 * Zenodo"). We do NOT bundle the data here — only this converter.
 *
 * What this script expects
 *   <visem_dir>/
 *     semen_analysis_data.csv       (per-participant aggregates: PR%, IM%, …)
 *     participant_data.csv          (optional metadata)
 *     videos/<participant_id>/      (optional per-video CASA exports)
 *
 * What it produces
 *   <out_dir>/
 *     visem_<participant_id>.csv    (one cell-level CSV per participant
 *                                    in the dashboard schema)
 *     visem_index.json              (manifest with per-file metadata)
 *
 * The dashboard schema columns are:
 *   Type, VCL, VSL, VAP, LIN, STR, WOB, ALH, BCF, Mouse, Group
 *
 * For VISEM, "Mouse" holds the participant ID and "Group" holds an inferred
 * fertility label ("normal" / "subnormal") based on WHO 5th-edition cutoffs
 * applied to the participant's progressive-motility percentage:
 *   PR ≥ 32%  → normal
 *   PR <  32% → subnormal
 *
 * --------------------------------------------------------------------------
 *
 * Usage:
 *   node scripts/import_visem.mjs <visem_dir> <out_dir>
 *
 * Options:
 *   --frames-per-cell N   When per-video frame data is present, group every
 *                         N consecutive frames into one synthetic "cell"
 *                         (default: 30, matching ~1 s at 30 fps). Set to 1
 *                         to keep one row per frame.
 *   --max-participants N  Limit number of participants processed (debugging).
 *   --dry-run             Parse and report counts; do not write output files.
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const args = process.argv.slice(2)
if (args.length < 2 || args.includes('-h') || args.includes('--help')) {
  console.error('usage: import_visem.mjs <visem_dir> <out_dir> [--frames-per-cell N] [--max-participants N] [--dry-run]')
  process.exit(1)
}
const [visemDir, outDir] = args
const opts = {
  framesPerCell: Number(args[args.indexOf('--frames-per-cell') + 1]) || 30,
  maxParticipants: args.includes('--max-participants') ? Number(args[args.indexOf('--max-participants') + 1]) : Infinity,
  dryRun: args.includes('--dry-run'),
}

if (!fs.existsSync(visemDir)) {
  console.error(`error: VISEM directory not found: ${visemDir}`)
  process.exit(2)
}
if (!opts.dryRun) fs.mkdirSync(outDir, { recursive: true })

// --- helpers ---------------------------------------------------------------

function parseCSV(text) {
  // Minimal CSV parser; VISEM CSVs are well-formed with no embedded newlines.
  const lines = text.split(/\r?\n/).filter(l => l.length)
  if (lines.length === 0) return []
  const header = splitCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const cells = splitCSVLine(line)
    const row = {}
    header.forEach((h, i) => { row[h] = cells[i] })
    return row
  })
}

function splitCSVLine(line) {
  const out = []
  let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue }
    if (ch === ',' && !inQ) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out
}

function num(v) {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function inferGroup(prPct) {
  if (prPct == null) return 'unknown'
  return prPct >= 32 ? 'normal' : 'subnormal'
}

// Map VISEM CASA column names to dashboard schema. VISEM exports typically
// use lowercase headers; participant aggregate CSV may use upper.
const CASA_ALIASES = {
  vcl: 'VCL', VCL: 'VCL', curvilinear_velocity: 'VCL',
  vsl: 'VSL', VSL: 'VSL', straight_line_velocity: 'VSL',
  vap: 'VAP', VAP: 'VAP', average_path_velocity: 'VAP',
  lin: 'LIN', LIN: 'LIN', linearity: 'LIN',
  str: 'STR', STR: 'STR', straightness: 'STR',
  wob: 'WOB', WOB: 'WOB', wobble: 'WOB',
  alh: 'ALH', ALH: 'ALH', amplitude_lateral_head: 'ALH',
  bcf: 'BCF', BCF: 'BCF', beat_cross_frequency: 'BCF',
}

function remapRow(row) {
  const out = { Type: 99 }
  for (const [k, v] of Object.entries(row)) {
    const target = CASA_ALIASES[k] || CASA_ALIASES[k.toLowerCase()]
    if (target) {
      const n = num(v)
      if (n != null) out[target] = n
    }
  }
  return out
}

// Average every N rows into one synthetic "cell" entry.
function groupFrames(rows, n) {
  if (n <= 1) return rows
  const out = []
  for (let i = 0; i < rows.length; i += n) {
    const chunk = rows.slice(i, i + n)
    const avg = { Type: 99 }
    for (const key of ['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF']) {
      const vals = chunk.map(r => r[key]).filter(v => v != null)
      if (vals.length) avg[key] = vals.reduce((a, b) => a + b, 0) / vals.length
    }
    if (avg.VCL != null) out.push(avg)
  }
  return out
}

function toCSV(rows, columns) {
  const lines = [columns.join(',')]
  for (const r of rows) lines.push(columns.map(c => r[c] ?? '').join(','))
  return lines.join('\n')
}

// --- main ------------------------------------------------------------------

const aggregatePath = path.join(visemDir, 'semen_analysis_data.csv')
let participantPR = {}
if (fs.existsSync(aggregatePath)) {
  const rows = parseCSV(fs.readFileSync(aggregatePath, 'utf8'))
  for (const r of rows) {
    const id = r.ID || r.id || r.participant_id
    const pr = num(r['Progressive motility (%)']) ?? num(r.progressive_motility) ?? num(r.PR)
    if (id) participantPR[id] = pr
  }
  console.log(`loaded PR%% for ${Object.keys(participantPR).length} participants from semen_analysis_data.csv`)
} else {
  console.warn(`warning: ${aggregatePath} not found — group label will default to "unknown"`)
}

const videosDir = path.join(visemDir, 'videos')
let participantDirs = []
if (fs.existsSync(videosDir)) {
  participantDirs = fs.readdirSync(videosDir, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name)
}
participantDirs = participantDirs.slice(0, opts.maxParticipants)
console.log(`processing ${participantDirs.length} participants from videos/`)

const manifest = []
for (const pid of participantDirs) {
  const videoDir = path.join(videosDir, pid)
  const csvFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.csv'))
  if (csvFiles.length === 0) continue

  const allRows = []
  for (const f of csvFiles) {
    const rows = parseCSV(fs.readFileSync(path.join(videoDir, f), 'utf8'))
      .map(remapRow)
      .filter(r => r.VCL != null)
    allRows.push(...groupFrames(rows, opts.framesPerCell))
  }

  if (allRows.length === 0) continue

  const group = inferGroup(participantPR[pid])
  const tagged = allRows.map(r => ({ ...r, Mouse: pid, Group: group }))
  const cols = ['Type', 'VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF', 'Mouse', 'Group']
  const outFile = path.join(outDir, `visem_${pid}.csv`)

  if (!opts.dryRun) fs.writeFileSync(outFile, toCSV(tagged, cols))
  manifest.push({
    participant: pid, group, cells: tagged.length,
    pr_pct: participantPR[pid] ?? null,
    file: path.basename(outFile),
  })
  console.log(`  ${pid}: ${tagged.length} cells → ${path.basename(outFile)} (${group})`)
}

if (!opts.dryRun) {
  fs.writeFileSync(path.join(outDir, 'visem_index.json'), JSON.stringify(manifest, null, 2))
}

// Report how many participants actually matched a PR% record. A low match rate
// almost always means the videos/<id> directory names and the IDs in
// semen_analysis_data.csv use different formats (zero-padding, prefixes), which
// would otherwise silently label every participant "unknown".
const matched = manifest.filter(m => m.group !== 'unknown').length
if (Object.keys(participantPR).length > 0) {
  console.log(`group labels: matched PR%% for ${matched}/${manifest.length} participants`)
  if (matched < manifest.length) {
    const misses = manifest.filter(m => m.group === 'unknown').map(m => m.participant)
    console.warn(`warning: ${manifest.length - matched} participant(s) had no PR% match and were labelled "unknown": ${misses.slice(0, 10).join(', ')}${misses.length > 10 ? ' …' : ''}`)
    console.warn('  check that videos/<id> directory names match the ID column in semen_analysis_data.csv.')
  }
}
console.log(`done. ${manifest.length} CSVs ${opts.dryRun ? 'would be' : ''} written to ${outDir}`)
