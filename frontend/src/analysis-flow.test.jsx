import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import App from './App'


const apiMocks = vi.hoisted(() => ({
  analyzeSkin: vi.fn(),
  getRecommend: vi.fn(),
}))

vi.mock('./api/client', () => apiMocks)


const originalMediaDevices = navigator.mediaDevices

function analysisResponse() {
  const values = {
    pigmentation: ['색소침착', 0.1],
    dryness: ['건조', 0.9],
    pore: ['모공', 0.2],
    wrinkle: ['주름', 0.3],
    sensitivity: ['민감', 0.8],
  }
  return {
    analyzed_at: '2026-08-07T00:00:00Z',
    model: { name: 'efficientnetb2_skin_multitask', version: 'e835bb5686ff' },
    skin_analysis: Object.fromEntries(
      Object.entries(values).map(([id, [label, probability]]) => [id, {
        label_ko: label,
        probability,
        risk_score: Math.round(probability * 100),
        threshold: 0.2,
        risk_label: probability >= 0.2 ? 'high' : 'low',
      }]),
    ),
    focus_risks: ['dryness', 'sensitivity'],
    main_risk: 'dryness',
    main_risk_score: 90,
    message: '민지님은 건조와 민감 관리가 필요해요.',
    env_data: {
      region: '조치원읍',
      pm25: 20,
      pm25_grade: '좋음',
      uv: 6,
      uv_grade: '높음',
      water: '양호',
    },
    recommendations: [{ step: 1, category: '보습', ingredient: '세라마이드' }],
    avoid: ['향료'],
    ranking_signals: [{ kind: 'category', value: '보습', weight: 16.2, source: 'risk:dryness', reason: '건조 위험도 90' }],
    rule_id: 'default_basic',
    is_fallback: true,
  }
}

function selectImage() {
  fireEvent.click(screen.getByRole('button', { name: '얼굴 분석 시작' }))
  const file = new File(['image'], 'face.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('사진 파일 선택'), {
    target: { files: [file] },
  })
  return file
}

beforeEach(() => {
  localStorage.setItem('dbc.nickname', '민지')
  apiMocks.getRecommend.mockImplementation(() => new Promise(() => {}))
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: originalMediaDevices,
  })
})


it('stores a successful analysis and opens the result route', async () => {
  apiMocks.analyzeSkin.mockResolvedValue(analysisResponse())
  render(<App />)
  const file = selectImage()

  expect(await screen.findByText('분석 결과')).toBeVisible()
  expect(apiMocks.analyzeSkin).toHaveBeenCalledWith(expect.objectContaining({
    image: file,
    nickname: '민지',
    lat: 36.62,
    lng: 127.29,
    skin_type: 'dry_sensitive',
  }))
})


it('keeps a failed image in memory for a visible retry', async () => {
  apiMocks.analyzeSkin
    .mockRejectedValueOnce(new Error('모델 연결에 실패했습니다.'))
    .mockResolvedValueOnce(analysisResponse())
  render(<App />)
  selectImage()

  expect(await screen.findByRole('alert')).toHaveTextContent('모델 연결에 실패했습니다.')
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

  expect(await screen.findByText('분석 결과')).toBeVisible()
  expect(apiMocks.analyzeSkin).toHaveBeenCalledTimes(2)
})


it('aborts after sixty seconds and lets the user return home', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  apiMocks.analyzeSkin.mockImplementation(({ signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  }))
  render(<App />)
  selectImage()

  await act(async () => {
    vi.advanceTimersByTime(60_000)
    await Promise.resolve()
  })

  expect(screen.getByRole('alert')).toHaveTextContent('시간이 초과')
  fireEvent.click(screen.getByRole('button', { name: '홈으로' }))
  expect(screen.getByText(/민지님/)).toBeVisible()
})
