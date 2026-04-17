import { describe, it, expect } from 'vitest'
import { classifyWHO, isHyperactivated, annotateMotility, computeMotilitySummary } from '../../src/engine/motility.js'

describe('classifyWHO', () => {
  it('returns IM for essentially zero VCL', () => {
    expect(classifyWHO({ VCL: 2, VSL: 0, VAP: 0 })).toBe('IM')
  })
  it('returns PR when VAP >= 25', () => {
    expect(classifyWHO({ VCL: 50, VSL: 10, VAP: 30 })).toBe('PR')
  })
  it('returns PR when VSL >= 20 even with low VAP', () => {
    expect(classifyWHO({ VCL: 60, VSL: 22, VAP: 10 })).toBe('PR')
  })
  it('returns NP for slow motile cells', () => {
    expect(classifyWHO({ VCL: 30, VSL: 5, VAP: 15 })).toBe('NP')
  })
  it('returns null when VCL is missing', () => {
    expect(classifyWHO({ VSL: 30 })).toBeNull()
  })
})

describe('isHyperactivated', () => {
  it('flags cells meeting all three Mortimer criteria', () => {
    expect(isHyperactivated({ VCL: 200, LIN: 0.3, ALH: 9 })).toBe(true)
  })
  it('rejects cells failing any criterion', () => {
    expect(isHyperactivated({ VCL: 100, LIN: 0.3, ALH: 9 })).toBe(false)
    expect(isHyperactivated({ VCL: 200, LIN: 0.7, ALH: 9 })).toBe(false)
    expect(isHyperactivated({ VCL: 200, LIN: 0.3, ALH: 5 })).toBe(false)
  })
  it('treats LIN given as percent (0-100) the same as fraction', () => {
    expect(isHyperactivated({ VCL: 200, LIN: 30, ALH: 9 })).toBe(true)
  })
})

describe('annotateMotility + computeMotilitySummary', () => {
  it('annotates and aggregates per mouse', () => {
    const data = [
      { Mouse: 'M1', VCL: 200, VSL: 30, VAP: 40, LIN: 0.2, ALH: 9, BCF: 5 },
      { Mouse: 'M1', VCL: 30,  VSL: 5,  VAP: 10, LIN: 0.4, ALH: 2, BCF: 5 },
      { Mouse: 'M1', VCL: 2,   VSL: 0,  VAP: 0,  LIN: 0,   ALH: 0, BCF: 0 },
      { Mouse: 'M2', VCL: 60,  VSL: 25, VAP: 30, LIN: 0.5, ALH: 3, BCF: 7 },
    ]
    const annotated = annotateMotility(data)
    expect(annotated[0].WHO_Class).toBe('PR')
    expect(annotated[0].Hyperactivated).toBe(1)
    expect(annotated[1].WHO_Class).toBe('NP')
    expect(annotated[2].WHO_Class).toBe('IM')

    const sum = computeMotilitySummary(annotated)
    expect(sum.M1.n).toBe(3)
    expect(sum.M1.PR_pct).toBeCloseTo(33.33, 1)
    expect(sum.M1.hyperactivated_pct).toBeCloseTo(33.33, 1)
    expect(sum.M2.PR_pct).toBe(100)
  })
})
