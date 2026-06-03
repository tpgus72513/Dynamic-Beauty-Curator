// src/api/adapters.js
// 백엔드 /recommend 의 env_data → 프론트 env 모양으로 변환
import { ENV_DATA } from '../data';

// 등급 문자열 → level (색칠용: good | mid | bad | vbad)
const PM25_LEVEL  = { '좋음': 'good', '보통': 'mid', '나쁨': 'bad', '매우나쁨': 'vbad' };
const UV_LEVEL    = { '낮음': 'good', '보통': 'mid', '높음': 'bad', '매우높음': 'vbad', '위험': 'vbad' };
const WATER_LEVEL = { '좋음': 'good', '양호': 'good', '보통': 'mid', '주의': 'mid', '나쁨': 'bad', '매우나쁨': 'vbad' };

function toLevel(map, grade) {
  const level = map[grade];
  if (!level) console.warn('[adaptEnvData] 매핑 안 된 등급:', JSON.stringify(grade));
  return level ?? 'mid';
}

export function adaptEnvData(apiEnv) {
  return {
    ...ENV_DATA, // 백엔드에 없는 필드(fullRegion/updatedAt/temp/humidity 등)는 mock 기본값 유지
    region: apiEnv.region ?? ENV_DATA.region,
    pm25:  { value: apiEnv.pm25,  label: apiEnv.pm25_grade, level: toLevel(PM25_LEVEL, apiEnv.pm25_grade), unit: '㎍/㎥' },
    uv:    { value: apiEnv.uv,    label: apiEnv.uv_grade,   level: toLevel(UV_LEVEL,   apiEnv.uv_grade),   unit: 'UVI' },
    water: { value: apiEnv.water, label: apiEnv.water,      level: toLevel(WATER_LEVEL, apiEnv.water),     unit: '' },
  };
}