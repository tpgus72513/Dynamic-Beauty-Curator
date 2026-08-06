import { afterEach, describe, expect, it, vi } from 'vitest'

import { analyzeSkin, ApiError } from './client'


afterEach(() => {
  vi.unstubAllGlobals()
})


describe('skin analysis client', () => {
  it('posts image and profile fields as browser-managed FormData', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ main_risk: 'dryness' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const image = new File(['image'], 'face.jpg', { type: 'image/jpeg' })

    await analyzeSkin({
      image,
      nickname: '민지',
      lat: 36.62,
      lng: 127.29,
      skin_type: 'dry_sensitive',
    })

    const [url, request] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/analyze')
    expect(request.method).toBe('POST')
    expect(request.body).toBeInstanceOf(FormData)
    expect(request.headers).toBeUndefined()
    expect(request.body.get('nickname')).toBe('민지')
    expect(request.body.get('lat')).toBe('36.62')
    expect(request.body.get('lng')).toBe('127.29')
    expect(request.body.get('skin_type')).toBe('dry_sensitive')
    expect(request.body.get('image').name).toBe('face.jpg')
    expect(request.body.get('image').type).toBe('image/jpeg')
  })

  it('throws a structured API error with backend guidance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: '피부 분석 모델을 사용할 수 없습니다.' }),
    }))

    const request = analyzeSkin({
      image: new Blob(['image'], { type: 'image/jpeg' }),
      nickname: '민지',
      lat: 36.62,
      lng: 127.29,
      skin_type: 'dry_sensitive',
    })

    await expect(request).rejects.toMatchObject({
      name: 'ApiError',
      message: '피부 분석 모델을 사용할 수 없습니다.',
      status: 503,
    })
    await expect(request).rejects.toBeInstanceOf(ApiError)
  })
})
