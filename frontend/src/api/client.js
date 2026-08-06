// src/api/client.js
// 개발 환경에서는 Vite 프록시(/api), 배포 환경에서는 VITE_API_URL을 사용한다.
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function toApiError(response, fallbackMessage) {
  let detail = '';
  try {
    const body = await response.json();
    detail = typeof body.detail === 'string' ? body.detail : '';
  } catch {
    // JSON이 아닌 오류 응답은 상태 코드로 안내한다.
  }
  return new ApiError(
    detail || `${fallbackMessage} (${response.status})`,
    response.status,
  );
}

export async function getRecommend({ lat, lng, skin_type, signal }) {
  const res = await fetch(`${API_URL}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, skin_type }),
    signal,
  });

  if (!res.ok) {
    throw await toApiError(res, '추천 API 오류');
  }

  return res.json();
}

export async function analyzeSkin({
  image,
  nickname,
  lat,
  lng,
  skin_type,
  signal,
}) {
  const body = new FormData();
  body.append('image', image, image.name || 'camera-capture.jpg');
  body.append('nickname', nickname);
  body.append('lat', String(lat));
  body.append('lng', String(lng));
  body.append('skin_type', skin_type);

  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    body,
    signal,
  });
  if (!response.ok) {
    throw await toApiError(response, '피부 분석에 실패했습니다.');
  }
  return response.json();
}
