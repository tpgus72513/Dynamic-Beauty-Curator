import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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


it('does not let an older environment recommendation overwrite analysis personalization', async () => {
  let resolveOldRecommendation
  apiMocks.getRecommend.mockImplementationOnce(() => new Promise((resolve) => {
    resolveOldRecommendation = resolve
  }))
  apiMocks.analyzeSkin.mockResolvedValue(analysisResponse())

  render(<App />)
  await waitFor(() => expect(apiMocks.getRecommend).toHaveBeenCalledTimes(1))
  selectImage()
  expect(await screen.findByText('민지님은 건조와 민감 관리가 필요해요.')).toBeVisible()

  await act(async () => {
    resolveOldRecommendation({
      ...analysisResponse(),
      message: '오래된 환경 추천이 결과를 덮었습니다.',
    })
    await Promise.resolve()
  })

  expect(screen.queryByText('오래된 환경 추천이 결과를 덮었습니다.')).not.toBeInTheDocument()
  expect(screen.getByText('민지님은 건조와 민감 관리가 필요해요.')).toBeVisible()
})


it('requires a new analysis after the skin profile changes', async () => {
  apiMocks.analyzeSkin.mockResolvedValue(analysisResponse())
  render(<App />)
  selectImage()
  expect(await screen.findByText('분석 결과')).toBeVisible()

  fireEvent.click(screen.getByRole('button', { name: '뒤로' }))
  fireEvent.click(screen.getByRole('button', { name: '마이 페이지' }))
  fireEvent.click(screen.getByText('피부 타입'))
  fireEvent.click(screen.getByText('지성', { exact: true }).closest('[role="button"]'))
  fireEvent.click(screen.getByRole('button', { name: '시작하기' }))
  fireEvent.click(screen.getByRole('button', { name: /저장한 추천/ }))

  expect(screen.getByText('피부 분석이 먼저 필요해요')).toBeVisible()
  expect(screen.queryByText('민지님은 건조와 민감 관리가 필요해요.')).not.toBeInTheDocument()
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


it('restarts the home recommendation after a failed analysis is cancelled', async () => {
  apiMocks.getRecommend
    .mockImplementationOnce(() => new Promise(() => {}))
    .mockResolvedValueOnce({
      ...analysisResponse(),
      message: '홈 추천 연결이 복구됐어요.',
    })
  apiMocks.analyzeSkin.mockRejectedValue(new Error('모델 연결에 실패했습니다.'))

  render(<App />)
  await waitFor(() => expect(apiMocks.getRecommend).toHaveBeenCalledTimes(1))
  selectImage()
  expect(await screen.findByRole('alert')).toHaveTextContent('모델 연결에 실패했습니다.')
  fireEvent.click(screen.getByRole('button', { name: '홈으로' }))

  expect(await screen.findByText('홈 추천 연결이 복구됐어요.')).toBeVisible()
  expect(apiMocks.getRecommend).toHaveBeenCalledTimes(2)
})


it('keeps the restarted home recommendation after recapture is closed', async () => {
  apiMocks.getRecommend
    .mockImplementationOnce(() => new Promise(() => {}))
    .mockResolvedValueOnce({
      ...analysisResponse(),
      message: '재촬영 뒤에도 홈 추천이 보여요.',
    })
  apiMocks.analyzeSkin.mockRejectedValue(new Error('모델 연결에 실패했습니다.'))

  render(<App />)
  await waitFor(() => expect(apiMocks.getRecommend).toHaveBeenCalledTimes(1))
  selectImage()
  expect(await screen.findByRole('alert')).toHaveTextContent('모델 연결에 실패했습니다.')
  fireEvent.click(screen.getByRole('button', { name: '다시 촬영' }))
  fireEvent.click(screen.getByRole('button', { name: '카메라 닫기' }))

  expect(await screen.findByText('재촬영 뒤에도 홈 추천이 보여요.')).toBeVisible()
  expect(apiMocks.getRecommend).toHaveBeenCalledTimes(2)
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


it('clears the previous profile and ignores its in-flight recommendation after logout', async () => {
  let resolveOldRecommendation
  apiMocks.getRecommend
    .mockImplementationOnce(() => new Promise((resolve) => {
      resolveOldRecommendation = resolve
    }))
    .mockImplementation(() => new Promise(() => {}))

  render(<App />)
  await waitFor(() => expect(apiMocks.getRecommend).toHaveBeenCalledTimes(1))

  fireEvent.click(screen.getByRole('button', { name: '마이 페이지' }))
  fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '새봄' } })
  fireEvent.click(screen.getByRole('button', { name: '계속하기' }))

  fireEvent.click(screen.getByRole('button', { name: '시작하기' }))
  fireEvent.click(screen.getByRole('button', { name: '나중에 설정하기' }))
  fireEvent.click(screen.getByRole('button', { name: '나중에 설정하기' }))
  fireEvent.click(screen.getByRole('button', { name: '시작하기' }))

  await act(async () => {
    resolveOldRecommendation(analysisResponse())
    await Promise.resolve()
  })

  expect(screen.getByText(/새봄님/)).toBeVisible()
  expect(screen.queryByText('민지님은 건조와 민감 관리가 필요해요.')).not.toBeInTheDocument()
  expect(screen.getByText('오늘의 추천을 불러오는 중…')).toBeVisible()
  expect(apiMocks.getRecommend).toHaveBeenLastCalledWith(expect.objectContaining({
    lat: 36.62,
    lng: 127.29,
    skin_type: 'dry_sensitive',
  }))
})
