import { expect, it } from 'vitest'

import { adaptSkinAnalysis } from './adapters'


it('maps model metrics into canonical display order and focus references', () => {
  const response = {
    analyzed_at: '2026-08-07T00:00:00Z',
    main_risk: 'dryness',
    focus_risks: ['dryness', 'sensitivity'],
    skin_analysis: {
      sensitivity: { label_ko: '민감', probability: 0.8, risk_score: 80, threshold: 0.2, risk_label: 'high' },
      wrinkle: { label_ko: '주름', probability: 0.3, risk_score: 30, threshold: 0.2, risk_label: 'high' },
      pore: { label_ko: '모공', probability: 0.2, risk_score: 20, threshold: 0.2, risk_label: 'high' },
      dryness: { label_ko: '건조', probability: 0.9, risk_score: 90, threshold: 0.2, risk_label: 'high' },
      pigmentation: { label_ko: '색소침착', probability: 0.1, risk_score: 10, threshold: 0.2, risk_label: 'low' },
    },
  }

  const view = adaptSkinAnalysis(response)

  expect(view.factors.map((factor) => factor.id)).toEqual([
    'pigmentation',
    'dryness',
    'pore',
    'wrinkle',
    'sensitivity',
  ])
  expect(view.mainRisk).toMatchObject({ id: 'dryness', label_ko: '건조', risk_score: 90 })
  expect(view.focusRisks.map((risk) => risk.label_ko)).toEqual(['건조', '민감'])
  expect(view.analyzedAt).toBe('2026-08-07T00:00:00Z')
})
