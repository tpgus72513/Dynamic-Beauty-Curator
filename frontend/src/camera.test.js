import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cameraErrorMessage,
  captureVideoFrame,
  requestUserCamera,
  stopMediaStream,
  validateSelectedImage,
} from './camera'
import { ScreenCamera } from './screens-1-4'


const originalMediaDevices = navigator.mediaDevices

afterEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: originalMediaDevices,
  })
})


describe('camera media helpers', () => {
  it('requests the user-facing camera without audio', async () => {
    const stream = { getTracks: () => [] }
    const getUserMedia = vi.fn().mockResolvedValue(stream)

    await expect(requestUserCamera({ getUserMedia })).resolves.toBe(stream)
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'user' },
      audio: false,
    })
  })

  it('stops every stream track', () => {
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]

    stopMediaStream({ getTracks: () => tracks })

    tracks.forEach((track) => expect(track.stop).toHaveBeenCalledOnce())
  })

  it('captures the unmirrored video pixels as a jpeg', async () => {
    const drawImage = vi.fn()
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback, type, quality) => {
        expect(type).toBe('image/jpeg')
        expect(quality).toBe(0.9)
        callback(blob)
      },
    }
    const video = { videoWidth: 640, videoHeight: 480 }

    await expect(captureVideoFrame(video, canvas)).resolves.toBe(blob)
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(480)
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 480)
  })

  it('rejects capture before video dimensions are ready', async () => {
    await expect(
      captureVideoFrame({ videoWidth: 0, videoHeight: 0 }, {}),
    ).rejects.toThrow('준비')
  })
})


describe('selected image policy', () => {
  it('accepts a supported image below ten megabytes', () => {
    const file = new File(['image'], 'face.webp', { type: 'image/webp' })

    expect(validateSelectedImage(file)).toBe(file)
  })

  it('rejects missing, non-image, and oversized files', () => {
    expect(() => validateSelectedImage()).toThrow('선택')
    expect(() => validateSelectedImage(
      new File(['x'], 'x.pdf', { type: 'application/pdf' }),
    )).toThrow('JPG')
    const large = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'large.jpg',
      { type: 'image/jpeg' },
    )
    expect(() => validateSelectedImage(large)).toThrow('10MB')
  })
})


it('maps browser camera errors to actionable Korean guidance', () => {
  expect(cameraErrorMessage({ name: 'NotAllowedError' })).toContain('권한')
  expect(cameraErrorMessage({ name: 'NotFoundError' })).toContain('찾지 못')
  expect(cameraErrorMessage({ name: 'NotReadableError' })).toContain('다른 앱')
  expect(cameraErrorMessage({ name: 'UnknownError' })).toContain('다시 시도')
})


describe('camera screen lifecycle', () => {
  it('opens the camera and stops its track on unmount', async () => {
    const stop = vi.fn()
    const stream = { getTracks: () => [{ stop }] }
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })

    const { unmount } = render(createElement(ScreenCamera, {
      ctx: { startAnalysis: vi.fn() },
      nav: { go: vi.fn() },
    }))
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce())

    unmount()

    expect(stop).toHaveBeenCalledOnce()
  })

  it('submits a selected image and explains the privacy boundary', async () => {
    const stop = vi.fn()
    const startAnalysis = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop }],
        }),
      },
    })
    render(createElement(ScreenCamera, {
      ctx: { startAnalysis },
      nav: { go: vi.fn() },
    }))
    const file = new File(['image'], 'face.png', { type: 'image/png' })

    expect(screen.getByLabelText('사진 파일 선택')).not.toHaveAttribute('capture')

    fireEvent.change(screen.getByLabelText('사진 파일 선택'), {
      target: { files: [file] },
    })

    await waitFor(() => expect(startAnalysis).toHaveBeenCalledWith(file))
    expect(stop).toHaveBeenCalled()
    expect(screen.getByText(/백엔드로 전송/)).toBeVisible()
    expect(screen.getByText(/메모리/)).toBeVisible()
    expect(screen.getByText(/의료 진단/)).toBeVisible()
  })

  it('stops a stale stream when overlapping camera requests resolve out of order', async () => {
    let resolveFirst
    let resolveSecond
    const firstStop = vi.fn()
    const secondStop = vi.fn()
    const firstStream = { getTracks: () => [{ stop: firstStop }] }
    const secondStream = { getTracks: () => [{ stop: secondStop }] }
    const getUserMedia = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve }))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })

    const { container, unmount } = render(createElement(ScreenCamera, {
      ctx: { startAnalysis: vi.fn() },
      nav: { go: vi.fn() },
    }))
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '카메라 다시 시도' }))
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2))

    await act(async () => resolveSecond(secondStream))
    await waitFor(() => expect(container.querySelector('video').srcObject).toBe(secondStream))
    await act(async () => resolveFirst(firstStream))

    expect(firstStop).toHaveBeenCalledOnce()
    expect(container.querySelector('video').srcObject).toBe(secondStream)
    unmount()
    expect(secondStop).toHaveBeenCalledOnce()
  })
})
