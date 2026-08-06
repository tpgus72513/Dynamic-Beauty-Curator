// src/api/adapters.js
// 백엔드 /recommend 의 env_data → 프론트 env 모양으로 변환
import { ENV_DATA } from '../data';

// 등급 문자열 → level (색칠용: good | mid | bad | vbad)
const PM25_LEVEL  = { '좋음': 'good', '보통': 'mid', '나쁨': 'bad', '매우나쁨': 'vbad' };
const UV_LEVEL    = { '낮음': 'good', '보통': 'mid', '높음': 'bad', '매우높음': 'vbad', '위험': 'vbad' };
const WATER_LEVEL = { '좋음': 'good', '양호': 'good', '보통': 'mid', '주의': 'mid', '나쁨': 'bad', '매우나쁨': 'vbad' };
const TARGET_ORDER = ['pigmentation', 'dryness', 'pore', 'wrinkle', 'sensitivity'];

function toLevel(map, grade) {
  const level = map[grade];
  if (!level) console.warn('[adaptEnvData] 매핑 안 된 등급:', JSON.stringify(grade));
  return level ?? 'mid';
}

export function adaptEnvData(apiEnv) {
  const updatedAt = new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());

  return {
    ...ENV_DATA, // 백엔드에 없는 필드(fullRegion/updatedAt/temp/humidity 등)는 mock 기본값 유지
    region: apiEnv.region ?? ENV_DATA.region,
    fullRegion: apiEnv.region ?? ENV_DATA.fullRegion,
    updatedAt,
    pm25:  { value: apiEnv.pm25,  label: apiEnv.pm25_grade, level: toLevel(PM25_LEVEL, apiEnv.pm25_grade), unit: '㎍/㎥' },
    uv:    { value: apiEnv.uv,    label: apiEnv.uv_grade,   level: toLevel(UV_LEVEL,   apiEnv.uv_grade),   unit: 'UVI' },
    water: { value: apiEnv.water, label: apiEnv.water,      level: toLevel(WATER_LEVEL, apiEnv.water),     unit: '' },
  };
}

export function adaptSkinAnalysis(response) {
  const factors = TARGET_ORDER.map(id => ({
    id,
    ...response.skin_analysis[id],
  }));
  return {
    analyzedAt: response.analyzed_at,
    mainRisk: factors.find(item => item.id === response.main_risk),
    focusRisks: response.focus_risks.map(
      id => factors.find(item => item.id === id),
    ),
    factors,
  };
}
