import { CONFIG } from './config.js'

// WHO 5th edition motility category for one cell.
// PR (progressive): VAP >= 25 OR VSL >= 20
// NP (non-progressive): some movement but below progressive cutoffs
// IM (immotile): VCL <= 5 (essentially no movement)
export function classifyWHO(row) {
  const vcl = row.VCL, vsl = row.VSL, vap = row.VAP
  if (vcl == null || isNaN(vcl)) return null
  if (vcl <= CONFIG.WHO_IMMOTILE_VCL) return 'IM'
  if ((vap ?? 0) >= CONFIG.WHO_PROGRESSIVE_VAP || (vsl ?? 0) >= CONFIG.WHO_PROGRESSIVE_VSL) return 'PR'
  return 'NP'
}

// Mortimer hyperactivation criteria: VCL >= 150, LIN <= 0.5, ALH >= 7
export function isHyperactivated(row) {
  const vcl = row.VCL, lin = row.LIN, alh = row.ALH
  if (vcl == null || lin == null || alh == null) return false
  // LIN may be reported as a fraction (0-1) or percent (0-100); normalize to fraction
  const linFrac = lin > 1 ? lin / 100 : lin
  return vcl >= CONFIG.HYPERACT_VCL && linFrac <= CONFIG.HYPERACT_LIN && alh >= CONFIG.HYPERACT_ALH
}

// Annotate every row with WHO_Class and Hyperactivated columns.
export function annotateMotility(rows) {
  return rows.map(r => ({
    ...r,
    WHO_Class: classifyWHO(r),
    Hyperactivated: isHyperactivated(r) ? 1 : 0,
  }))
}

// Per-mouse motility breakdown: counts and percentages by WHO category and hyperactivation.
export function computeMotilitySummary(annotatedRows) {
  const groups = {}
  for (const r of annotatedRows) {
    const m = r.Mouse || 'unknown'
    if (!groups[m]) groups[m] = { n: 0, PR: 0, NP: 0, IM: 0, hyperactivated: 0 }
    groups[m].n++
    if (r.WHO_Class) groups[m][r.WHO_Class]++
    if (r.Hyperactivated) groups[m].hyperactivated++
  }
  const result = {}
  for (const [m, c] of Object.entries(groups)) {
    const n = c.n || 1
    result[m] = {
      n: c.n,
      PR_pct: (c.PR / n) * 100,
      NP_pct: (c.NP / n) * 100,
      IM_pct: (c.IM / n) * 100,
      hyperactivated_pct: (c.hyperactivated / n) * 100,
      PR: c.PR, NP: c.NP, IM: c.IM, hyperactivated: c.hyperactivated,
    }
  }
  return result
}
