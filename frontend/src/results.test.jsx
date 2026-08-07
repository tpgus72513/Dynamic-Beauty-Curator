import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { ENV_DATA } from './data'
import {
  ScreenHistory,
  ScreenMyPage,
  ScreenRecommendations,
  ScreenResult,
} from './screens-5-9'


const factors = [
  { id: 'pigmentation', label_ko: '색소침착', probability: 0.1, risk_score: 10, threshold: 0.2, risk_label: 'low' },
  { id: 'dryness', label_ko: '건조', probability: 0.9, risk_score: 90, threshold: 0.2, risk_label: 'high' },
  { id: 'pore', label_ko: '모공', probability: 0.2, risk_score: 20, threshold: 0.2, risk_label: 'high' },
  { id: 'wrinkle', label_ko: '주름', probability: 0.3, risk_score: 30, threshold: 0.2, risk_label: 'high' },
  { id: 'sensitivity', label_ko: '민감', probability: 0.8, risk_score: 80, threshold: 0.2, risk_label: 'high' },
]


function resultContext() {
  return {
    env: ENV_DATA,
    skinProfile: { type: 'dry_sensitive' },
    lastAnalysis: {
      analyzedAt: '2026-08-07T00:00:00Z',
      factors,
      mainRisk: factors[1],
      focusRisks: [factors[1], factors[4]],
    },
    recommend: {
      message: '민지님은 건조와 민감 관리가 필요해요.',
      avoid: ['향료', '에센셜오일'],
      recommendations: [],
      ranking_signals: [],
    },
  }
}


it('renders the five real model risks and exactly two focus risks', () => {
  render(<ScreenResult ctx={resultContext()} nav={{ go: vi.fn() }} />)

  const factorList = screen.getByRole('list', { name: '5가지 피부 위험도' })
  expect(within(factorList).getAllByRole('listitem')).toHaveLength(5)
  for (const factor of factors) {
    expect(within(factorList).getByText(factor.label_ko)).toBeVisible()
  }

  const focusList = screen.getByRole('list', { name: '우선 관리 위험도' })
  expect(within(focusList).getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('민지님은 건조와 민감 관리가 필요해요.')).toBeVisible()
  expect(screen.getByText(/의료 진단이 아닌/)).toBeVisible()
})


it('offers a camera recovery route instead of mock results when no analysis exists', () => {
  const go = vi.fn()
  render(<ScreenResult ctx={{ env: ENV_DATA, lastAnalysis: null }} nav={{ go }} />)

  expect(screen.getByText('아직 분석 결과가 없어요')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '피부 분석 시작' }))
  expect(go).toHaveBeenCalledWith('camera')
})


it('requires a real analysis before claiming personalized product ranking', () => {
  const go = vi.fn()
  render(<ScreenRecommendations ctx={{
    env: ENV_DATA,
    skinProfile: { type: 'dry_sensitive' },
    lastAnalysis: null,
    recommend: { recommendations: [], ranking_signals: [] },
  }} nav={{ go }} />)

  expect(screen.getByText('피부 분석이 먼저 필요해요')).toBeVisible()
  expect(screen.queryByText('실제 피부 위험도')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '피부 분석 시작' }))
  expect(go).toHaveBeenCalledWith('camera')
})


it('changes the first recommended product when risk ranking signals change', () => {
  const ctx = resultContext()
  ctx.recommend.ranking_signals = [
    { kind: 'category', value: '보습', weight: 30, reason: '건조 위험도 90' },
    { kind: 'ingredient', value: '세라마이드', weight: 20, reason: '건조 위험도 90' },
  ]
  const { rerender } = render(
    <ScreenRecommendations ctx={ctx} nav={{ go: vi.fn() }} />,
  )

  let list = screen.getByRole('list', { name: '맞춤 추천 제품' })
  const firstDrynessProduct = within(list).getAllByRole('listitem')[0]
  expect(within(firstDrynessProduct).getByText('하이드라 부스터 토너 200ml')).toBeVisible()
  expect(within(firstDrynessProduct).getByText(/건조 위험도 90/)).toBeVisible()

  const pigmentContext = resultContext()
  pigmentContext.recommend.ranking_signals = [
    { kind: 'category', value: '선케어', weight: 40, reason: '색소침착 위험도 92' },
  ]
  rerender(<ScreenRecommendations ctx={pigmentContext} nav={{ go: vi.fn() }} />)

  list = screen.getByRole('list', { name: '맞춤 추천 제품' })
  expect(within(within(list).getAllByRole('listitem')[0]).getByText('데일리 인비저블 선젤 SPF50+')).toBeVisible()
})


it('opens product details as an accessible modal and restores focus when closed', () => {
  render(<ScreenRecommendations ctx={resultContext()} nav={{ go: vi.fn() }} />)

  const productList = screen.getByRole('list', { name: '맞춤 추천 제품' })
  const opener = within(within(productList).getAllByRole('listitem')[0]).getByRole('button')
  opener.focus()
  fireEvent.click(opener)

  const dialog = screen.getByRole('dialog', { name: '시카 진정 크림 50ml' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog).toHaveFocus()
  expect(within(dialog).queryByRole('button', { name: '상세 보기' })).not.toBeInTheDocument()

  fireEvent.keyDown(document, { key: 'Tab' })
  expect(within(dialog).getByRole('button', { name: '닫기' })).toHaveFocus()

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})


it('shows an honest empty history for a profile with no analysis', () => {
  const go = vi.fn()
  render(<ScreenHistory ctx={{ lastAnalysis: null }} nav={{ go }} />)

  expect(screen.getByText('저장된 분석 기록이 없어요')).toBeVisible()
  expect(screen.queryByText('최근 7회 추이')).not.toBeInTheDocument()
  expect(screen.queryByText('42회')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '피부 분석 시작' }))
  expect(go).toHaveBeenCalledWith('camera')
})


it('does not present demo profile totals as real user data', () => {
  render(<ScreenMyPage ctx={{
    user: { nickname: '새사용자' },
    env: ENV_DATA,
    skinProfile: null,
    lastAnalysis: null,
  }} nav={{ go: vi.fn() }} />)

  expect(screen.getByText('새사용자')).toBeVisible()
  expect(screen.getByText('이번 세션 분석')).toBeVisible()
  expect(screen.getByText('최근 결과')).toBeVisible()
  expect(screen.getByText('0회')).toBeVisible()
  expect(screen.getByText('없음')).toBeVisible()
  expect(screen.queryByText('42회')).not.toBeInTheDocument()
  expect(screen.queryByText('74')).not.toBeInTheDocument()
  expect(screen.queryByText('18')).not.toBeInTheDocument()
})
