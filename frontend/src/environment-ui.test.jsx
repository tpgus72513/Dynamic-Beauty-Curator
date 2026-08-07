import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { ScreenHome, ScreenOnboarding } from './screens-1-4'


it('discloses that coordinates are transmitted but not persistently stored', () => {
  render(<ScreenOnboarding
    ctx={{ permissions: {}, set: vi.fn() }}
    nav={{ go: vi.fn() }}
  />)

  fireEvent.click(screen.getByRole('button', { name: '시작하기' }))

  expect(screen.getByText(/좌표.*백엔드.*전송/)).toBeVisible()
  expect(screen.getAllByText(/지속적으로 저장하지/)).not.toHaveLength(0)
})


it('shows current API environment values and a real update time on home', () => {
  render(<ScreenHome ctx={{
    user: { nickname: '민지' },
    env: {
      region: '테스트동',
      fullRegion: '테스트동',
      updatedAt: '오후 3:21',
      source: 'live',
      pm25: { value: 13, label: '좋음', level: 'good', unit: '㎍/㎥' },
      uv: { value: 1, label: '낮음', level: 'good', unit: 'UVI' },
      water: { value: '양호', label: '양호', level: 'good', unit: '' },
    },
    recStatus: 'loading',
  }} nav={{ go: vi.fn() }} />)

  expect(screen.getByText('테스트동')).toBeVisible()
  expect(screen.getByText(/오후 3:21/)).toBeVisible()
  expect(screen.queryByText(/2026 \. 05 \. 21/)).not.toBeInTheDocument()
})


it('lets the user cancel a pending browser permission request safely', async () => {
  let resolveLocation
  const set = vi.fn()
  const cancelPermissionRequests = vi.fn()
  const requestLocation = vi.fn(() => new Promise((resolve) => {
    resolveLocation = resolve
  }))
  render(<ScreenOnboarding
    ctx={{ permissions: {}, set, requestLocation, cancelPermissionRequests }}
    nav={{ go: vi.fn() }}
  />)

  fireEvent.click(screen.getByRole('button', { name: '시작하기' }))
  fireEvent.click(screen.getByRole('button', { name: '허용하기' }))

  expect(screen.getByRole('button', { name: '권한 확인 중…' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '나중에 설정하기' })).toBeEnabled()
  expect(screen.getByRole('button', { name: '뒤로' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: '나중에 설정하기' }))

  expect(cancelPermissionRequests).toHaveBeenCalledOnce()
  expect(screen.getByRole('heading', { name: '카메라 접근 허용' })).toBeVisible()

  await act(async () => {
    resolveLocation(true)
    await Promise.resolve()
  })

  expect(screen.getByRole('heading', { name: '카메라 접근 허용' })).toBeVisible()
  expect(set).not.toHaveBeenCalled()
})


it('keeps the location step open with a retry message when permission fails', async () => {
  const requestLocation = vi.fn().mockResolvedValue(false)
  render(<ScreenOnboarding
    ctx={{ permissions: {}, set: vi.fn(), requestLocation }}
    nav={{ go: vi.fn() }}
  />)

  fireEvent.click(screen.getByRole('button', { name: '시작하기' }))
  fireEvent.click(screen.getByRole('button', { name: '허용하기' }))

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '위치 정보 허용' })).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('현재 위치를 가져오지 못했어요')
  })
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeEnabled()
  expect(screen.queryByRole('heading', { name: '카메라 접근 허용' })).not.toBeInTheDocument()
})


it('shows whether device location is connected and lets returning users reconnect', () => {
  const requestLocation = vi.fn()
  const env = {
    region: '환경 데이터 대기 중',
    updatedAt: '업데이트 대기 중',
    source: 'demo',
    pm25: { value: 22, label: '좋음', level: 'good', unit: '㎍/㎥' },
    uv: { value: 3, label: '낮음', level: 'good', unit: 'UVI' },
    water: { value: '양호', label: '양호', level: 'good', unit: '' },
  }
  const { rerender } = render(<ScreenHome ctx={{
    user: { nickname: '민지' }, env, recStatus: 'error',
    location: { lat: 36.62, lng: 127.29, source: 'demo' },
    locationStatus: 'idle', requestLocation,
  }} nav={{ go: vi.fn() }} />)

  fireEvent.click(screen.getByRole('button', { name: '현재 위치 연결' }))
  expect(requestLocation).toHaveBeenCalledOnce()

  rerender(<ScreenHome ctx={{
    user: { nickname: '민지' }, env, recStatus: 'error',
    location: { lat: 37.5665, lng: 126.978, source: 'device' },
    locationStatus: 'ready', requestLocation,
  }} nav={{ go: vi.fn() }} />)

  expect(screen.getByRole('button', { name: /현재 위치 연결됨/ })).toBeVisible()
  expect(screen.getByText('37.5665, 126.9780')).toBeVisible()
})
