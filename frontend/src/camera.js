export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024


export async function requestUserCamera(mediaDevices = navigator.mediaDevices) {
  if (!mediaDevices?.getUserMedia) {
    throw new Error('이 브라우저에서는 카메라를 사용할 수 없습니다.')
  }
  return mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: false,
  })
}


export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop())
}


export function waitForVideoReady(video, { signal, timeoutMs = 8000 } = {}) {
  const hasDimensions = () => Boolean(video?.videoWidth && video?.videoHeight)
  if (hasDimensions()) return Promise.resolve()

  return new Promise((resolve, reject) => {
    let timeoutId
    const events = ['loadedmetadata', 'canplay', 'resize']
    const cleanup = () => {
      clearTimeout(timeoutId)
      events.forEach(event => video?.removeEventListener?.(event, checkReady))
      signal?.removeEventListener?.('abort', handleAbort)
    }
    const finish = (callback, value) => {
      cleanup()
      callback(value)
    }
    const checkReady = () => {
      if (hasDimensions()) finish(resolve)
    }
    const handleAbort = () => {
      const error = new Error('카메라 준비가 취소되었습니다.')
      error.name = 'AbortError'
      finish(reject, error)
    }

    if (signal?.aborted) {
      handleAbort()
      return
    }

    events.forEach(event => video?.addEventListener?.(event, checkReady))
    signal?.addEventListener?.('abort', handleAbort, { once: true })
    timeoutId = setTimeout(() => {
      finish(reject, new Error('카메라 화면 준비 시간이 초과되었습니다. 다시 시도해 주세요.'))
    }, timeoutMs)
    checkReady()
  })
}


export function captureVideoFrame(video, canvas = document.createElement('canvas')) {
  const width = video?.videoWidth || 0
  const height = video?.videoHeight || 0
  if (!width || !height) {
    return Promise.reject(new Error('카메라 화면이 아직 준비되지 않았습니다.'))
  }

  canvas.width = width
  canvas.height = height
  const context = canvas.getContext?.('2d')
  if (!context) {
    return Promise.reject(new Error('촬영 화면을 처리할 수 없습니다.'))
  }

  // Do not mirror the pixel data. Mirroring belongs only to preview CSS.
  context.drawImage(video, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('사진을 만들지 못했습니다. 다시 촬영해 주세요.'))
    }, 'image/jpeg', 0.9)
  })
}


export function validateSelectedImage(file) {
  if (!file) throw new Error('사진을 선택해 주세요.')
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('JPG, PNG, WEBP 이미지만 사용할 수 있습니다.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('이미지는 10MB 이하여야 합니다.')
  }
  return file
}


export function cameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError') {
    return '카메라 권한이 차단되었습니다. 브라우저 설정에서 허용하거나 사진을 선택해 주세요.'
  }
  if (error?.name === 'NotFoundError') {
    return '사용할 수 있는 카메라를 찾지 못했습니다. 사진을 선택해 주세요.'
  }
  if (error?.name === 'NotReadableError') {
    return '다른 앱이 카메라를 사용 중입니다. 해당 앱을 닫고 다시 시도해 주세요.'
  }
  return '카메라를 시작하지 못했습니다. 다시 시도하거나 사진을 선택해 주세요.'
}
